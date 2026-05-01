// supabase/functions/generate-title/index.ts
// Generate a short, descriptive title for a Prompt Library entry from the user's prompt.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You write short, descriptive titles for entries in an AI image prompt library.

Rules:
- Output ONLY the title text. No quotes, no preamble, no explanation, no trailing period.
- 3 to 7 words.
- Title-case the key words; lowercase small connectors (of, the, on, and, in, for, with).
- Capture the subject and the visual style or context — like a magazine caption.
- Never describe the technical model or settings. Never say "AI", "prompt", "image", or "generation".
- Never use emojis or hashtags.

Good examples:
- Studio Product Shot on White
- Editorial Portrait with Rim Light
- Marble Lifestyle Flat Lay
- Cinematic Golden Hour Landscape
- Moody Charcoal Portrait`;

interface Body {
  prompt?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, category } = (await req.json()) as Body;

    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const userText = category
      ? `Category: ${category}\n\nPrompt:\n${prompt.trim()}`
      : `Prompt:\n${prompt.trim()}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const title = raw
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\.$/, '')
      .slice(0, 80);

    return new Response(JSON.stringify({ title }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-title error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
