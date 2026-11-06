import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RETIRED_MODELS, activeSpec } from '../_shared/catalog/index.ts';
import { API_ENDPOINTS, KIE_BASE, buildInput, buildRequestBody, validateSpecInput } from '../_shared/catalog/adapters.ts';
import type { ModelSpec } from '../_shared/catalog/types.ts';
import { optimizePrompt } from '../_shared/brain/index.ts';
import { fetchKieCredits } from '../_shared/kie-credits.ts';
import { higgsfieldAuth, submitHiggsfield } from '../_shared/higgsfield.ts';
import { priceGeneration, reserveCredits, settleCredits } from '../_shared/credits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

// Controls saved before the catalog refactor used fixed keys; map them onto media slots.
const LEGACY_MEDIA: Record<string, string> = {
  last_frame_url: 'end_frame',
  reference_image_urls: 'ref_images',
  reference_video_urls: 'ref_videos',
  reference_audio_urls: 'ref_audios',
};

function normalizeLegacy(spec: ModelSpec, controls: Record<string, unknown>, imageUrls?: string[]) {
  const out = { ...controls };
  for (const [legacy, slotKey] of Object.entries(LEGACY_MEDIA)) {
    const v = out[legacy];
    if (v && !out[`media.${slotKey}`] && spec.media.some((m) => m.key === slotKey)) {
      out[`media.${slotKey}`] = Array.isArray(v) ? v : [v];
    }
  }
  if (imageUrls?.length) {
    const primary = spec.media.find((m) => m.kind === 'image' && (m.min ?? 0) > 0) ?? spec.media.find((m) => m.kind === 'image');
    if (primary && !out[`media.${primary.key}`]) out[`media.${primary.key}`] = imageUrls;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return Response.json({ ok: true }, { headers: corsHeaders });
  }

  // Releases this request's credit reservation if the handler crashes after it.
  let releaseOnCrash: (() => Promise<unknown>) | null = null;

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return Response.json({ error: 'Auth failed' }, { status: 401, headers: corsHeaders });
    }
    const userId = authData.user.id;

    // 2. Parse
    const body = await req.json();
    const { prompt = '', model, controls: rawControls = {}, generationId, imageUrls, enhancePromptEnabled = false, useCase = 'auto' } = body;

    if (!model || !generationId) {
      return Response.json({ error: 'Missing: model, generationId' }, { status: 400, headers: corsHeaders });
    }

    const spec = activeSpec(model);
    if (!spec) {
      const error = RETIRED_MODELS.has(model) ? `${model} has been retired. Pick another model.` : `Unknown model: ${model}`;
      return Response.json({ error }, { status: 400, headers: corsHeaders });
    }

    // Any cost the caller sends is ignored; the price is computed below.
    const { cost_credits: clientCost, cost_usd: _clientUsd, hf_credits: _clientHf, ...callerControls } =
      rawControls as Record<string, unknown>;
    const controls = normalizeLegacy(spec, callerControls, imageUrls);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // The generation row must belong to the caller. Without this a caller could
    // drive (and overwrite) someone else's row.
    const { data: row } = await adminClient
      .from('generations')
      .select('id, user_id, status, model_params')
      .eq('id', generationId)
      .maybeSingle();
    if (!row || row.user_id !== userId) {
      return Response.json({ error: 'Generation not found' }, { status: 404, headers: corsHeaders });
    }
    if (row.status !== 'queued') {
      return Response.json({ error: `Generation is already ${row.status}` }, { status: 409, headers: corsHeaders });
    }

    let reserved = false;
    const fail = async (msg: string, status = 400) => {
      if (reserved) await settleCredits(adminClient, generationId, false);
      await adminClient.from('generations').update({ status: 'error', error_message: msg, progress: 0 }).eq('id', generationId);
      return Response.json({ error: msg }, { status, headers: corsHeaders });
    };

    const invalid = validateSpecInput(spec, prompt, controls);
    if (invalid) return await fail(invalid);

    console.log(`[gen] user=${userId} model=${model} api=${spec.api} id=${generationId}`);

    const isHiggsfield = spec.api === 'higgsfield';
    if (isHiggsfield && !higgsfieldAuth()) {
      return await fail('Higgsfield API key is not configured on the server', 503);
    }

    // 3. Credits. The price comes from the server-side catalog (kie.ai) or the
    // live Higgsfield estimate, never from the request.
    const priced = await priceGeneration(spec, prompt, controls);
    if ('error' in priced) return await fail(priced.error, priced.status);
    const { price } = priced;
    if (clientCost !== undefined && Number(clientCost) !== price.credits) {
      console.warn(`[gen] client cost ${String(clientCost)} != server cost ${price.credits} for ${model}; using server cost`);
    }

    // kie.ai models: the shared, prepaid kie.ai balance pays for the job.
    // Higgsfield bills its own account, which refuses the submit when short.
    if (!isHiggsfield) {
      const balance = await fetchKieCredits();
      if (balance !== null && price.credits > 0 && balance < price.credits) {
        return await fail(`Insufficient credits. Have ${balance}, need ${price.credits}.`, 402);
      }
    }

    // Per-user ledger: atomic daily-cap check + one charge per generation row.
    const reservation = await reserveCredits(adminClient, {
      userId, generationId, modelId: spec.id, backend: spec.backend ?? spec.api, credits: price.credits,
    });
    if (!reservation.ok) {
      // 409 means another request already owns this row; leave it alone.
      if (reservation.status === 409) {
        return Response.json({ error: reservation.error }, { status: 409, headers: corsHeaders });
      }
      return await fail(reservation.error, reservation.status);
    }
    reserved = true;
    releaseOnCrash = () => settleCredits(adminClient, generationId, false);

    // Record the authoritative price on the row (the library and MCP read it).
    const params = { ...((row.model_params as Record<string, unknown> | null) ?? {}) };
    params.cost_credits = price.credits;
    params.cost_usd = price.usd;
    if (price.hfCredits !== undefined) params.hf_credits = price.hfCredits;
    else delete params.hf_credits;
    await adminClient.from('generations').update({ model_params: params }).eq('id', generationId);

    // 4. Prompt Brain — optimize for this model + use case if the toggle is ON
    let finalPrompt = prompt;
    if (enhancePromptEnabled && prompt.trim() && !spec.noPrompt) {
      const result = await optimizePrompt({
        spec, prompt, useCase, controls, userId, supabase: adminClient,
      });
      if (result) finalPrompt = result.prompt;
    }

    // 5. Mark running + store final prompt
    await adminClient.from('generations').update({
      status: 'running',
      progress: 10,
      final_prompt: finalPrompt,
    }).eq('id', generationId);

    const callbackUrl = `${supabaseUrl}/functions/v1/generation-callback`;

    // 6a. Higgsfield: submit, then the webhook (or poll-tasks) delivers the result.
    if (isHiggsfield) {
      const input = buildInput(spec, finalPrompt, controls);
      console.log(`[gen] higgsfield endpoint=${spec.endpoint} payload=${JSON.stringify(input).slice(0, 600)}`);
      const res = await submitHiggsfield(spec.endpoint!, input, callbackUrl);
      if (!res.ok || !res.data?.request_id) {
        return await fail(res.error || 'Higgsfield did not return a request id', 502);
      }
      await adminClient.from('generations').update({
        status: 'running', external_task_id: res.data.request_id, progress: 25,
      }).eq('id', generationId);
      console.log(`[gen] Higgsfield request: ${res.data.request_id}`);
      return Response.json({ task_id: res.data.request_id, enhanced_prompt: finalPrompt, credits: price.credits }, { headers: corsHeaders });
    }

    // 6b. kie.ai: build request
    const kiePayload = buildRequestBody(spec, finalPrompt, controls, callbackUrl);
    const endpoint = `${KIE_BASE}${API_ENDPOINTS[spec.api as Exclude<typeof spec.api, 'higgsfield'>].create}`;

    console.log(`[gen] endpoint=${endpoint}`);
    console.log(`[gen] payload=${JSON.stringify(kiePayload).slice(0, 600)}`);

    // Mock mode
    if (!KIE_AI_API_KEY) {
      console.log('[gen] MOCK MODE');
      const mockTaskId = `mock_${Date.now()}`;
      await adminClient.from('generations').update({
        status: 'running', external_task_id: mockTaskId, progress: 10,
      }).eq('id', generationId);
      return Response.json({ task_id: mockTaskId, enhanced_prompt: finalPrompt, credits: price.credits }, { headers: corsHeaders });
    }

    // 7. Call kie.ai
    const kieRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieText = await kieRes.text();
    console.log(`[gen] Kie status=${kieRes.status} body=${kieText.slice(0, 300)}`);

    let kieData: { code?: number; msg?: string; taskId?: string; task_id?: string; data?: { taskId?: string; task_id?: string } };
    try {
      kieData = JSON.parse(kieText);
    } catch {
      return await fail(`Kie.ai invalid response: ${kieText.slice(0, 100)}`, 502);
    }

    const taskId = kieData.data?.taskId || kieData.data?.task_id || kieData.taskId || kieData.task_id;
    if (!taskId) {
      return await fail(kieData.msg || `Kie.ai error ${kieRes.status}`, 502);
    }

    await adminClient.from('generations').update({
      status: 'running', external_task_id: taskId, progress: 25,
    }).eq('id', generationId);
    console.log(`[gen] Task created: ${taskId}`);
    return Response.json({ task_id: taskId, enhanced_prompt: finalPrompt, credits: price.credits }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`[gen] CRASH ref=${ref}:`, msg);  // full detail stays in the function logs only
    if (releaseOnCrash) await releaseOnCrash().catch(() => undefined);
    return Response.json({ error: `Something went wrong starting this generation (ref ${ref}). Please try again.`, ref },
      { status: 500, headers: corsHeaders });
  }
});
