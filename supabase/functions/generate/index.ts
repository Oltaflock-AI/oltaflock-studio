import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { MODEL_ROUTES, KIE_CREATE_TASK, resolveKieModel } from './model-routes.ts';
import { enhancePrompt } from './prompt-brain.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse request
    const body = await req.json();
    const {
      prompt,
      model,
      controls = {},
      generationId,
      enhancePromptEnabled = true,
      imageUrls,
    } = body;

    if (!prompt || !model || !generationId) {
      return jsonResponse({ error: 'Missing required fields: prompt, model, generationId' }, 400);
    }

    const route = MODEL_ROUTES[model];
    if (!route) {
      return jsonResponse({ error: `Unknown model: ${model}` }, 400);
    }

    console.log(`[generate] user=${user.id} model=${model} generationId=${generationId}`);

    // 3. Check credits server-side
    const { data: creditData } = await adminClient
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const balance = creditData ? Number(creditData.balance) : 0;
    const costCredits = (controls as Record<string, unknown>).cost_credits as number ?? 0;

    if (costCredits > 0 && balance < costCredits) {
      return jsonResponse({
        error: `Insufficient credits. You have ${balance} but need ${costCredits}.`,
      }, 402);
    }

    // 4. Enhance prompt with Claude brain
    let finalPrompt = prompt;
    let wasEnhanced = false;

    if (enhancePromptEnabled) {
      try {
        const result = await enhancePrompt(prompt, model, user.id, adminClient as any);
        finalPrompt = result.enhanced;
        wasEnhanced = result.wasEnhanced;
        console.log(`[generate] enhanced=${wasEnhanced}`);
      } catch (brainError) {
        console.error('[generate] prompt brain failed:', brainError);
      }
    }

    // 5. Update generation record
    await adminClient
      .from('generations')
      .update({
        final_prompt: wasEnhanced ? finalPrompt : null,
        status: 'running',
        progress: 10,
      })
      .eq('id', generationId);

    // 6. Build Kie.ai payload
    const kieModel = resolveKieModel(model, controls);
    const input = route.buildInput(finalPrompt, controls, imageUrls);

    // Build callback URL for async completion notification
    const callbackUrl = `${supabaseUrl}/functions/v1/generation-callback`;

    const kiePayload = {
      model: kieModel,
      callBackUrl: callbackUrl,
      input,
    };

    console.log(`[generate] Calling Kie.ai: model=${kieModel}`);

    if (!KIE_AI_API_KEY) {
      // Mock mode for testing
      console.warn('[generate] KIE_AI_API_KEY not set - mock mode');
      const mockUrl = route.type === 'image'
        ? `https://placehold.co/1024x1024/229DE7/ffffff?text=${encodeURIComponent(model)}`
        : null;
      const mockTaskId = mockUrl ? null : `mock_task_${Date.now()}`;

      if (mockUrl) {
        await adminClient.from('generations').update({
          status: 'done', output_url: mockUrl, progress: 100,
        }).eq('id', generationId);

        if (costCredits > 0) await deductCredits(adminClient, user.id, costCredits, generationId, model);

        return jsonResponse({ output_url: mockUrl, enhanced_prompt: wasEnhanced ? finalPrompt : null });
      } else {
        await adminClient.from('generations').update({
          status: 'running', external_task_id: mockTaskId, progress: 10,
        }).eq('id', generationId);

        return jsonResponse({ task_id: mockTaskId, enhanced_prompt: wasEnhanced ? finalPrompt : null });
      }
    }

    // 7. Call Kie.ai createTask
    const kieResponse = await fetch(KIE_CREATE_TASK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieResponse.json();
    console.log(`[generate] Kie.ai response: code=${kieData.code}`);

    if (kieData.code !== 200 || !kieData.data?.taskId) {
      const errorMsg = kieData.msg || `Kie.ai error: ${kieResponse.status}`;
      await adminClient.from('generations').update({
        status: 'error', error_message: errorMsg, progress: 0,
      }).eq('id', generationId);

      return jsonResponse({ error: errorMsg }, 502);
    }

    const taskId = kieData.data.taskId;

    // 8. Store task ID - all Kie.ai tasks are async (returns taskId, result comes via callback or polling)
    await adminClient.from('generations').update({
      status: 'running',
      external_task_id: taskId,
      progress: 25,
    }).eq('id', generationId);

    console.log(`[generate] Task created: ${taskId}`);

    return jsonResponse({
      task_id: taskId,
      enhanced_prompt: wasEnhanced ? finalPrompt : null,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate] Fatal:', msg);
    return jsonResponse({ error: 'Internal server error', details: msg }, 500);
  }
});

async function deductCredits(
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
      description: `Generation: ${model}`,
      checked_at: new Date().toISOString(),
    });

    console.log(`[credits] Deducted ${credits}, new balance: ${newBalance}`);
  } catch (error) {
    console.error('[credits] Failed:', error);
  }
}
