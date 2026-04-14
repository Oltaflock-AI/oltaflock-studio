import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MODEL_ROUTES } from './model-routes.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

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
    const { prompt, model, controls = {}, generationId, imageUrls } = body;

    if (!prompt || !model || !generationId) {
      return Response.json({ error: 'Missing: prompt, model, generationId' }, { status: 400, headers: corsHeaders });
    }

    const route = MODEL_ROUTES[model];
    if (!route) {
      return Response.json({ error: `Unknown model: ${model}` }, { status: 400, headers: corsHeaders });
    }

    console.log(`[gen] user=${userId} model=${model} id=${generationId}`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Credits
    const { data: creditData } = await adminClient
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const balance = creditData ? Number(creditData.balance) : 0;
    const costCredits = Number(controls.cost_credits) || 0;

    if (costCredits > 0 && balance < costCredits) {
      return Response.json({ error: `Insufficient credits. Have ${balance}, need ${costCredits}.` }, { status: 402, headers: corsHeaders });
    }

    // 4. Update generation to running
    await adminClient.from('generations').update({
      status: 'running', progress: 10,
    }).eq('id', generationId);

    // 5. Build payload using the route's buildPayload function
    const callbackUrl = `${supabaseUrl}/functions/v1/generation-callback`;
    let kiePayload: Record<string, unknown>;
    try {
      kiePayload = route.buildPayload(prompt, controls, callbackUrl, imageUrls);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[gen] buildPayload error:', msg);
      await adminClient.from('generations').update({
        status: 'error', error_message: msg, progress: 0,
      }).eq('id', generationId);
      return Response.json({ error: msg }, { status: 400, headers: corsHeaders });
    }

    console.log(`[gen] endpoint=${route.endpoint}`);
    console.log(`[gen] payload=${JSON.stringify(kiePayload).slice(0, 500)}`);

    // 6. Mock mode
    if (!KIE_AI_API_KEY) {
      console.log('[gen] MOCK MODE');
      if (route.type === 'image') {
        const mockUrl = `https://placehold.co/1024x1024/229DE7/fff?text=${encodeURIComponent(model)}`;
        await adminClient.from('generations').update({
          status: 'done', output_url: mockUrl, progress: 100,
        }).eq('id', generationId);
        return Response.json({ output_url: mockUrl }, { headers: corsHeaders });
      } else {
        const mockTaskId = `mock_${Date.now()}`;
        await adminClient.from('generations').update({
          status: 'running', external_task_id: mockTaskId, progress: 10,
        }).eq('id', generationId);
        return Response.json({ task_id: mockTaskId }, { headers: corsHeaders });
      }
    }

    // 7. Call Kie.ai
    const kieRes = await fetch(route.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieText = await kieRes.text();
    console.log(`[gen] Kie status=${kieRes.status} body=${kieText.slice(0, 300)}`);

    let kieData: Record<string, any>;
    try {
      kieData = JSON.parse(kieText);
    } catch {
      await adminClient.from('generations').update({
        status: 'error', error_message: `Kie.ai invalid response: ${kieText.slice(0, 100)}`, progress: 0,
      }).eq('id', generationId);
      return Response.json({ error: 'Kie.ai invalid JSON', raw: kieText.slice(0, 200) }, { status: 502, headers: corsHeaders });
    }

    // Extract taskId - different APIs return it differently
    const taskId = kieData.data?.taskId || kieData.taskId || kieData.task_id;

    if (!taskId && kieData.code !== 200) {
      const errorMsg = kieData.msg || `Kie.ai error ${kieRes.status}`;
      await adminClient.from('generations').update({
        status: 'error', error_message: errorMsg, progress: 0,
      }).eq('id', generationId);
      return Response.json({ error: errorMsg, kie_response: kieData }, { status: 502, headers: corsHeaders });
    }

    if (taskId) {
      await adminClient.from('generations').update({
        status: 'running', external_task_id: taskId, progress: 25,
      }).eq('id', generationId);
      console.log(`[gen] Task created: ${taskId}`);
      return Response.json({ task_id: taskId }, { headers: corsHeaders });
    }

    // Some APIs might return result directly
    const outputUrl = kieData.data?.output_url || kieData.output_url;
    if (outputUrl) {
      await adminClient.from('generations').update({
        status: 'done', output_url: outputUrl, progress: 100,
      }).eq('id', generationId);
      if (costCredits > 0) await deductCredits(adminClient, userId, costCredits, generationId, model);
      return Response.json({ output_url: outputUrl }, { headers: corsHeaders });
    }

    // Unexpected response
    await adminClient.from('generations').update({
      status: 'error', error_message: `Unexpected Kie.ai response`, progress: 0,
    }).eq('id', generationId);
    return Response.json({ error: 'Unexpected response', kie_response: kieData }, { status: 502, headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[gen] CRASH:', msg);
    return Response.json({ error: 'Internal error', detail: msg }, { status: 500, headers: corsHeaders });
  }
});

async function deductCredits(
  supabase: ReturnType<typeof createClient>,
  userId: string, credits: number, generationId: string, model: string,
) {
  try {
    const { data: cur } = await supabase.from('user_credits')
      .select('balance, total_spent, total_generations').eq('user_id', userId).single();
    if (!cur) return;
    const newBal = Math.max(0, Number(cur.balance) - credits);
    await supabase.from('user_credits').update({
      balance: newBal, total_spent: Number(cur.total_spent) + credits,
      total_generations: cur.total_generations + 1, updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    await supabase.from('credit_logs').insert({
      user_id: userId, balance: String(newBal), credits_used: credits,
      generation_id: generationId, model, description: `Generation: ${model}`,
      checked_at: new Date().toISOString(),
    });
  } catch (e) { console.error('[credits]', e); }
}
