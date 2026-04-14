// Claude-powered prompt enhancement brain
// Learns from user's rated generations to improve prompts over time

import { MODEL_ROUTES } from './model-routes.ts';

interface SupabaseClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        not: (col: string, op: string, val: null) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: RatedExample[] | null }>;
          };
        };
      };
    };
  };
}

interface RatedExample {
  user_prompt: string;
  final_prompt: string | null;
  rating: number;
  model: string;
}

export async function enhancePrompt(
  userPrompt: string,
  model: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ enhanced: string; wasEnhanced: boolean }> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    console.warn('ANTHROPIC_API_KEY not set, skipping prompt enhancement');
    return { enhanced: userPrompt, wasEnhanced: false };
  }

  const route = MODEL_ROUTES[model];
  const modelPersona = route?.persona ?? 'an AI generation model';

  // Fetch user's rated generations for this model
  const { data: examples } = await supabase
    .from('generations')
    .select('user_prompt, final_prompt, rating, model')
    .eq('user_id', userId)
    .eq('model', route?.apiModelName ?? model)
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(15);

  const allExamples = examples ?? [];
  const topExamples = allExamples.filter(e => e.rating >= 4).slice(0, 5);
  const badExamples = allExamples.filter(e => e.rating <= 2).slice(0, 3);

  const hasFeedback = topExamples.length > 0 || badExamples.length > 0;

  // Build few-shot context
  let feedbackContext = '';
  if (hasFeedback) {
    feedbackContext = `\n## This user's past results on ${model}:\n`;

    if (topExamples.length > 0) {
      feedbackContext += `\n### High-rated (4-5 stars) — these prompt styles worked well:\n`;
      topExamples.forEach((e, i) => {
        feedbackContext += `Example ${i + 1}:\n`;
        feedbackContext += `  - Original: "${e.user_prompt}"\n`;
        feedbackContext += `  - Enhanced: "${e.final_prompt ?? e.user_prompt}"\n`;
        feedbackContext += `  - Rating: ${'★'.repeat(e.rating)}\n\n`;
      });
    }

    if (badExamples.length > 0) {
      feedbackContext += `\n### Low-rated (1-2 stars) — these styles did NOT work well:\n`;
      badExamples.forEach((e, i) => {
        feedbackContext += `Example ${i + 1}:\n`;
        feedbackContext += `  - Original: "${e.user_prompt}"\n`;
        feedbackContext += `  - Enhanced: "${e.final_prompt ?? e.user_prompt}"\n`;
        feedbackContext += `  - Rating: ${'★'.repeat(e.rating)}\n\n`;
      });
    }
  }

  const systemPrompt = `You are a prompt engineer specializing in AI image and video generation. Your job is to rewrite a user's rough prompt into an optimized version for a specific model.

Model: ${model}
Model description: ${modelPersona}
${feedbackContext}

Rules:
- Preserve the user's core creative intent completely — never change what they're asking for
- Add specific, descriptive detail that improves visual quality (lighting, composition, texture, mood)
- Match the model's strengths based on its description
- If the user has rated examples, learn from the patterns that worked and avoid patterns that didn't
- Keep the enhanced prompt natural and coherent — not a keyword dump
- Return ONLY the enhanced prompt text, nothing else. No explanation, no preamble.
- If the prompt is already excellent, return it unchanged.
- Maximum 200 words.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return { enhanced: userPrompt, wasEnhanced: false };
    }

    const data = await response.json();
    const enhanced = data.content?.[0]?.text?.trim() ?? userPrompt;
    const wasEnhanced = enhanced.toLowerCase() !== userPrompt.toLowerCase();

    return { enhanced, wasEnhanced };
  } catch (error) {
    console.error('Prompt brain error:', error);
    return { enhanced: userPrompt, wasEnhanced: false };
  }
}
