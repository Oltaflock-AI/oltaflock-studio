import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Kie.ai sends callbacks when tasks complete
// Format: { taskId, state, resultJson, failMsg, ... }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log('[callback] Received:', JSON.stringify(body).slice(0, 500));

    // Kie.ai callback format
    const taskId = body.taskId || body.task_id || body.data?.taskId;
    const state = body.state || body.status || body.data?.state;
    const resultJson = body.resultJson || body.data?.resultJson;
    const failMsg = body.failMsg || body.failCode || body.data?.failMsg || '';

    if (!taskId) {
      console.error('[callback] No taskId in payload');
      return new Response(
        JSON.stringify({ error: 'Missing taskId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[callback] taskId=${taskId} state=${state}`);

    // Find generation by external_task_id
    const { data: generation, error: findError } = await supabase
      .from('generations')
      .select('id, status, user_id, model, model_params')
      .eq('external_task_id', taskId)
      .maybeSingle();

    if (findError || !generation) {
      // Fallback: try request_id
      const { data: byRequest } = await supabase
        .from('generations')
        .select('id, status, user_id, model, model_params')
        .eq('request_id', taskId)
        .maybeSingle();

      if (!byRequest) {
        console.error(`[callback] No generation found for taskId: ${taskId}`);
        return new Response(
          JSON.stringify({ error: 'Generation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use fallback match
      return await processCallback(supabase, byRequest, state, resultJson, failMsg);
    }

    return await processCallback(supabase, generation, state, resultJson, failMsg);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[callback] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processCallback(
  supabase: ReturnType<typeof createClient>,
  generation: { id: string; status: string; user_id: string; model: string; model_params: Record<string, unknown> | null },
  state: string,
  resultJson: string | Record<string, unknown> | null,
  failMsg: string,
) {
  // Skip if already done/error
  if (generation.status === 'done' || generation.status === 'error') {
    console.log(`[callback] Skipping - already ${generation.status}`);
    return new Response(
      JSON.stringify({ ok: true, skipped: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isSuccess = state === 'success' || state === 'completed';

  // Parse output URL from resultJson
  let outputUrl = '';
  if (isSuccess && resultJson) {
    try {
      const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
      if (parsed?.resultUrls?.length > 0) {
        outputUrl = parsed.resultUrls[0];
      } else if (parsed?.url) {
        outputUrl = parsed.url;
      }
    } catch (e) {
      console.error('[callback] Failed to parse resultJson:', e);
    }
  }

  // Update generation record
  const updateData: Record<string, unknown> = {
    status: isSuccess && outputUrl ? 'done' : 'error',
    progress: isSuccess && outputUrl ? 100 : 0,
    output_url: outputUrl || null,
    error_message: isSuccess ? null : (failMsg || `Generation failed with state: ${state}`),
  };

  const { error: updateError } = await supabase
    .from('generations')
    .update(updateData)
    .eq('id', generation.id);

  if (updateError) {
    console.error('[callback] Update failed:', updateError);
  }

  // Deduct credits on success
  if (isSuccess && outputUrl) {
    const costCredits = (generation.model_params as Record<string, unknown>)?.cost_credits as number;
    if (costCredits && costCredits > 0) {
      try {
        const { data: current } = await supabase
          .from('user_credits')
          .select('balance, total_spent, total_generations')
          .eq('user_id', generation.user_id)
          .single();

        if (current) {
          const newBalance = Math.max(0, Number(current.balance) - costCredits);
          await supabase.from('user_credits').update({
            balance: newBalance,
            total_spent: Number(current.total_spent) + costCredits,
            total_generations: current.total_generations + 1,
            updated_at: new Date().toISOString(),
          }).eq('user_id', generation.user_id);

          await supabase.from('credit_logs').insert({
            user_id: generation.user_id,
            balance: String(newBalance),
            credits_used: costCredits,
            generation_id: generation.id,
            model: generation.model,
            description: `Generation: ${generation.model}`,
            checked_at: new Date().toISOString(),
          });
        }
      } catch (creditError) {
        console.error('[callback] Credit deduction failed:', creditError);
      }
    }
  }

  console.log(`[callback] Updated ${generation.id} → ${updateData.status}`);

  return new Response(
    JSON.stringify({ ok: true, status: updateData.status }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
