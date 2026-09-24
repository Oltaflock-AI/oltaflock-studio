import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSpec } from '../_shared/catalog/index.ts';
import { API_ENDPOINTS, KIE_BASE, buildRequestBody, validateSpecInput } from '../_shared/catalog/adapters.ts';
import type { ModelSpec } from '../_shared/catalog/types.ts';
import { optimizePrompt } from '../_shared/brain/index.ts';
import { fetchKieCredits } from '../_shared/kie-credits.ts';

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

    const spec = getSpec(model);
    if (!spec) {
      return Response.json({ error: `Unknown model: ${model}` }, { status: 400, headers: corsHeaders });
    }

    const controls = normalizeLegacy(spec, rawControls, imageUrls);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const fail = async (msg: string, status = 400) => {
      await adminClient.from('generations').update({ status: 'error', error_message: msg, progress: 0 }).eq('id', generationId);
      return Response.json({ error: msg }, { status, headers: corsHeaders });
    };

    const invalid = validateSpecInput(spec, prompt, controls);
    if (invalid) return await fail(invalid);

    console.log(`[gen] user=${userId} model=${model} api=${spec.api} id=${generationId}`);

    // 3. Credits — checked against the live kie.ai balance that actually pays for the job.
    const costCredits = Number(controls.cost_credits) || 0;
    const balance = await fetchKieCredits();
    if (balance !== null && costCredits > 0 && balance < costCredits) {
      return Response.json(
        { error: `Insufficient credits. Have ${balance}, need ${costCredits}.` },
        { status: 402, headers: corsHeaders },
      );
    }

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

    // 6. Build request
    const callbackUrl = `${supabaseUrl}/functions/v1/generation-callback`;
    const kiePayload = buildRequestBody(spec, finalPrompt, controls, callbackUrl);
    const endpoint = `${KIE_BASE}${API_ENDPOINTS[spec.api].create}`;

    console.log(`[gen] endpoint=${endpoint}`);
    console.log(`[gen] payload=${JSON.stringify(kiePayload).slice(0, 600)}`);

    // Mock mode
    if (!KIE_AI_API_KEY) {
      console.log('[gen] MOCK MODE');
      const mockTaskId = `mock_${Date.now()}`;
      await adminClient.from('generations').update({
        status: 'running', external_task_id: mockTaskId, progress: 10,
      }).eq('id', generationId);
      return Response.json({ task_id: mockTaskId, enhanced_prompt: finalPrompt }, { headers: corsHeaders });
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
    return Response.json({ task_id: taskId, enhanced_prompt: finalPrompt }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[gen] CRASH:', msg);
    return Response.json({ error: 'Internal error', detail: msg }, { status: 500, headers: corsHeaders });
  }
});
