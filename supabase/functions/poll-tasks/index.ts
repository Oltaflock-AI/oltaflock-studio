import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { persistOutput } from "../_shared/persist-output.ts";
import { apiForGeneration } from "../_shared/catalog/index.ts";
import { API_ENDPOINTS, KIE_BASE, parseTaskStatus } from "../_shared/catalog/adapters.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all running generations with a task ID
    const { data: pendingTasks, error } = await supabase
      .from('generations')
      .select('id, external_task_id, user_id, model, model_params')
      .eq('status', 'running')
      .not('external_task_id', 'is', null)
      .limit(50);

    if (error) {
      console.error('[poll] Failed to fetch:', error);
      return jsonResponse({ error: 'Failed to fetch pending tasks' }, 500);
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return jsonResponse({ message: 'No pending tasks', checked: 0 });
    }

    console.log(`[poll] Checking ${pendingTasks.length} tasks`);

    let completed = 0, failed = 0, stillRunning = 0;

    for (const task of pendingTasks) {
      try {
        if (!KIE_AI_API_KEY) {
          // Mock: auto-complete
          await supabase.from('generations').update({
            status: 'done',
            output_url: `https://placehold.co/1920x1080/229DE7/ffffff?text=Mock`,
            progress: 100,
          }).eq('id', task.id);
          await maybeDeductCredits(supabase, task);
          completed++;
          continue;
        }

        const api = apiForGeneration(task);
        const statusUrl = `${KIE_BASE}${API_ENDPOINTS[api].status}?taskId=${encodeURIComponent(task.external_task_id)}`;
        const response = await fetch(statusUrl, {
          headers: { 'Authorization': `Bearer ${KIE_AI_API_KEY}` },
        });

        if (!response.ok) {
          console.error(`[poll] Status check failed: ${response.status}`);
          stillRunning++;
          continue;
        }

        const kieData = await response.json();

        if (kieData.code !== 200 || !kieData.data) {
          console.error(`[poll] Kie.ai error: ${kieData.msg}`);
          stillRunning++;
          continue;
        }

        const status = parseTaskStatus(api, kieData.data);

        if (status.state === 'success') {
          const outputUrl = status.urls[0] ?? '';
          if (!outputUrl) {
            await supabase.from('generations').update({
              status: 'error', error_message: 'Finished without an output URL', progress: 0,
            }).eq('id', task.id);
            failed++;
            continue;
          }

          await supabase.from('generations').update({
            status: 'done',
            output_url: outputUrl,
            progress: 100,
          }).eq('id', task.id);

          await maybeDeductCredits(supabase, task);

          // Move the output off the provider's temporary URL into R2 (no-op if unconfigured)
          const persisted = await persistOutput(outputUrl, task.user_id, task.id);
          if (persisted) {
            await supabase.from('generations').update({ output_url: persisted }).eq('id', task.id);
          }

          completed++;
          console.log(`[poll] ${task.external_task_id} (${api}) → success`);

        } else if (status.state === 'fail') {
          await supabase.from('generations').update({
            status: 'error',
            error_message: status.error || 'Generation failed',
            progress: 0,
          }).eq('id', task.id);

          failed++;
          console.log(`[poll] ${task.external_task_id} (${api}) → failed: ${status.error}`);

        } else {
          if (status.progress && status.progress > 0) {
            await supabase.from('generations').update({
              progress: Math.min(90, status.progress),
            }).eq('id', task.id);
          }
          stillRunning++;
        }
      } catch (taskError) {
        console.error(`[poll] Error on ${task.external_task_id}:`, taskError);
        stillRunning++;
      }
    }

    return jsonResponse({ checked: pendingTasks.length, completed, failed, stillRunning });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[poll] Fatal:', msg);
    return jsonResponse({ error: msg }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function maybeDeductCredits(
  supabase: ReturnType<typeof createClient>,
  task: { id: string; user_id: string; model: string; model_params: Record<string, unknown> | null },
) {
  const costCredits = (task.model_params as Record<string, unknown>)?.cost_credits as number;
  if (!costCredits || costCredits <= 0) return;

  try {
    const { data: current } = await supabase
      .from('user_credits')
      .select('balance, total_spent, total_generations')
      .eq('user_id', task.user_id)
      .single();

    if (!current) return;

    const newBalance = Math.max(0, Number(current.balance) - costCredits);

    await supabase.from('user_credits').update({
      balance: newBalance,
      total_spent: Number(current.total_spent) + costCredits,
      total_generations: current.total_generations + 1,
      updated_at: new Date().toISOString(),
    }).eq('user_id', task.user_id);

    await supabase.from('credit_logs').insert({
      user_id: task.user_id,
      balance: String(newBalance),
      credits_used: costCredits,
      generation_id: task.id,
      model: task.model,
      description: `Generation: ${task.model}`,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[poll] Credit deduction failed:', error);
  }
}
