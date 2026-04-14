import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { MODEL_ROUTES } from './model-routes.ts';
import { enhancePrompt } from './prompt-brain.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_BASE_URL = Deno.env.get('KIE_AI_BASE_URL') || 'https://api.kie.ai';
const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function callKieAI(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<{ output_url?: string; task_id?: string; error?: string }> {
  // TODO: Replace with actual Kie.ai API call when docs are provided
  // For now, this is a structured placeholder that shows the expected interface

  if (!KIE_AI_API_KEY) {
    console.warn('KIE_AI_API_KEY not set - returning mock response');
    // Mock: simulate sync response for image models
    if (endpoint.includes('/images/')) {
      return {
        output_url: `https://placehold.co/1024x1024/229DE7/ffffff?text=Mock+Generation`,
      };
    }
    // Mock: simulate async response for video models
    return {
      task_id: `mock_task_${Date.now()}`,
    };
  }

  try {
    const response = await fetch(`${KIE_AI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kie.ai API error:', response.status, errorText);
      return { error: `Kie.ai returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    // Extract output URL or task ID from Kie.ai response
    // TODO: Adapt based on actual Kie.ai response format
    return {
      output_url: data.output_url ?? data.result?.url ?? data.data?.url,
      task_id: data.task_id ?? data.taskId ?? data.data?.taskId,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Kie.ai call failed:', msg);
    return { error: msg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth - extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    // Admin client for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse request
    const body = await req.json();
    const {
      prompt,
      model,
      type,
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

    console.log(`[generate] user=${user.id} model=${model} type=${type} generationId=${generationId}`);

    // 3. Check credits (server-side)
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

    // 4. Enhance prompt with Claude brain (if enabled)
    let finalPrompt = prompt;
    let wasEnhanced = false;

    if (enhancePromptEnabled) {
      try {
        const result = await enhancePrompt(prompt, model, user.id, adminClient as any);
        finalPrompt = result.enhanced;
        wasEnhanced = result.wasEnhanced;
        console.log(`[generate] prompt enhanced=${wasEnhanced}`);
      } catch (brainError) {
        console.error('[generate] prompt brain failed, using original:', brainError);
      }
    }

    // 5. Update generation record with enhanced prompt + running status
    await adminClient
      .from('generations')
      .update({
        final_prompt: wasEnhanced ? finalPrompt : null,
        status: 'running',
        progress: 25,
      })
      .eq('id', generationId);

    // 6. Build Kie.ai payload
    const kiePayload: Record<string, unknown> = {
      model: route.apiModelName,
      prompt: finalPrompt,
      ...controls,
    };

    if (imageUrls && imageUrls.length > 0) {
      kiePayload.image_urls = imageUrls;
    }

    // 7. Call Kie.ai
    const kieResult = await callKieAI(route.endpoint, kiePayload);

    if (kieResult.error) {
      await adminClient
        .from('generations')
        .update({
          status: 'error',
          error_message: kieResult.error,
          progress: 0,
        })
        .eq('id', generationId);

      return jsonResponse({ error: kieResult.error }, 502);
    }

    // 8. Handle sync result
    if (route.type === 'sync' && kieResult.output_url) {
      await adminClient
        .from('generations')
        .update({
          status: 'done',
          output_url: kieResult.output_url,
          progress: 100,
        })
        .eq('id', generationId);

      // Deduct credits server-side
      if (costCredits > 0) {
        await deductCredits(adminClient, user.id, costCredits, generationId, model);
      }

      return jsonResponse({
        output_url: kieResult.output_url,
        enhanced_prompt: wasEnhanced ? finalPrompt : null,
      });
    }

    // 9. Handle async result (video models)
    if (kieResult.task_id) {
      await adminClient
        .from('generations')
        .update({
          status: 'running',
          external_task_id: kieResult.task_id,
          progress: 10,
        })
        .eq('id', generationId);

      return jsonResponse({
        task_id: kieResult.task_id,
        enhanced_prompt: wasEnhanced ? finalPrompt : null,
      });
    }

    // Unexpected: no output_url and no task_id
    await adminClient
      .from('generations')
      .update({
        status: 'error',
        error_message: 'Unexpected response from generation API',
        progress: 0,
      })
      .eq('id', generationId);

    return jsonResponse({ error: 'Unexpected response from generation API' }, 502);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate] Fatal error:', msg);
    return jsonResponse({ error: 'Internal server error', details: msg }, 500);
  }
});

// Server-side credit deduction
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

    const currentBalance = Number(current.balance);
    const newBalance = Math.max(0, currentBalance - credits);

    await supabase
      .from('user_credits')
      .update({
        balance: newBalance,
        total_spent: Number(current.total_spent) + credits,
        total_generations: current.total_generations + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Log transaction
    await supabase
      .from('credit_logs')
      .insert({
        user_id: userId,
        balance: String(newBalance),
        credits_used: credits,
        generation_id: generationId,
        model,
        description: `Generation: ${model}`,
        checked_at: new Date().toISOString(),
      });

    console.log(`[credits] Deducted ${credits} from user ${userId}, new balance: ${newBalance}`);
  } catch (error) {
    console.error('[credits] Failed to deduct:', error);
  }
}
