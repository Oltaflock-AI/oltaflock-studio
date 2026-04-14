import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_BASE_URL = Deno.env.get('KIE_AI_BASE_URL') || 'https://api.kie.ai';
const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all running generations with an external task ID
    const { data: pendingTasks, error } = await supabase
      .from('generations')
      .select('id, external_task_id, user_id, model, model_params')
      .eq('status', 'running')
      .not('external_task_id', 'is', null)
      .limit(50);

    if (error) {
      console.error('Failed to fetch pending tasks:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending tasks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending tasks', checked: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[poll-tasks] Checking ${pendingTasks.length} pending tasks`);

    let completed = 0;
    let failed = 0;
    let stillRunning = 0;

    for (const task of pendingTasks) {
      try {
        // TODO: Replace with actual Kie.ai status endpoint when docs provided
        const statusUrl = `${KIE_AI_BASE_URL}/v1/tasks/${task.external_task_id}/status`;

        if (!KIE_AI_API_KEY) {
          // Mock: auto-complete after a delay (for testing)
          console.log(`[poll-tasks] Mock: auto-completing task ${task.external_task_id}`);
          await supabase
            .from('generations')
            .update({
              status: 'done',
              output_url: `https://placehold.co/1920x1080/229DE7/ffffff?text=Mock+Video`,
              progress: 100,
            })
            .eq('id', task.id);

          // Deduct credits
          const costCredits = (task.model_params as Record<string, unknown>)?.cost_credits as number;
          if (costCredits && costCredits > 0) {
            await deductCreditsForTask(supabase, task.user_id, costCredits, task.id, task.model);
          }

          completed++;
          continue;
        }

        const response = await fetch(statusUrl, {
          headers: {
            'Authorization': `Bearer ${KIE_AI_API_KEY}`,
          },
        });

        if (!response.ok) {
          console.error(`[poll-tasks] Status check failed for ${task.external_task_id}: ${response.status}`);
          stillRunning++;
          continue;
        }

        const statusData = await response.json();

        // TODO: Adapt based on actual Kie.ai status response format
        const taskStatus = statusData.status ?? statusData.state;
        const outputUrl = statusData.output_url ?? statusData.result?.url ?? statusData.data?.url;

        if (taskStatus === 'completed' || taskStatus === 'success') {
          await supabase
            .from('generations')
            .update({
              status: 'done',
              output_url: outputUrl,
              progress: 100,
            })
            .eq('id', task.id);

          // Deduct credits
          const costCredits = (task.model_params as Record<string, unknown>)?.cost_credits as number;
          if (costCredits && costCredits > 0) {
            await deductCreditsForTask(supabase, task.user_id, costCredits, task.id, task.model);
          }

          completed++;
          console.log(`[poll-tasks] Task ${task.external_task_id} completed`);
        } else if (taskStatus === 'failed' || taskStatus === 'error') {
          await supabase
            .from('generations')
            .update({
              status: 'error',
              error_message: statusData.error ?? 'Generation failed',
              progress: 0,
            })
            .eq('id', task.id);

          failed++;
          console.log(`[poll-tasks] Task ${task.external_task_id} failed`);
        } else {
          // Still processing - update progress if available
          const progress = statusData.progress ?? statusData.percentage;
          if (progress) {
            await supabase
              .from('generations')
              .update({ progress: Math.min(90, progress) })
              .eq('id', task.id);
          }
          stillRunning++;
        }
      } catch (taskError) {
        console.error(`[poll-tasks] Error checking task ${task.external_task_id}:`, taskError);
        stillRunning++;
      }
    }

    return new Response(
      JSON.stringify({
        checked: pendingTasks.length,
        completed,
        failed,
        stillRunning,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[poll-tasks] Fatal error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function deductCreditsForTask(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  credits: number,
  generationId: string,
  model: string,
) {
  try {
    const { data: current } = await supabase
      .from('user_credits')
      .select('balance, total_spent, total_generations')
      .eq('user_id', userId)
      .single();

    if (!current) return;

    const newBalance = Math.max(0, Number(current.balance) - credits);

    await supabase.from('user_credits').update({
      balance: newBalance,
      total_spent: Number(current.total_spent) + credits,
      total_generations: current.total_generations + 1,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    await supabase.from('credit_logs').insert({
      user_id: userId,
      balance: String(newBalance),
      credits_used: credits,
      generation_id: generationId,
      model,
      description: `Video generation: ${model}`,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[poll-tasks] Credit deduction failed:', error);
  }
}
