// supabase/functions/brand-copy/index.ts
// Writes PROMUNCH copy in the brand voice: headline options for a brief, and a
// ready-to-post caption with hashtags and alt text for a finished result.
//   { kind: 'headlines' | 'caption', job_id, brief: Record<string, string>, product_id? }
// Only uses claims and offers from the brand kit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { BRAND, brandContext } from '../_shared/brand/index.ts';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MODEL = Deno.env.get('BRAND_COPY_MODEL') || 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headlines', 'caption', 'hashtags', 'alt_text'],
  properties: {
    headlines: { type: 'array', items: { type: 'string' }, description: '5 headline options, each under 8 words' },
    caption: { type: 'string', description: 'Ready-to-post caption, 2–5 short lines, ending with a call to action' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '6–10 hashtags without the # sign' },
    alt_text: { type: 'string', description: 'One-sentence image description for accessibility' },
  },
};

const SYSTEM = `You are the copywriter on the ${BRAND.name} brand team. You write short, punchy social and print copy in the brand voice.

${brandContext(BRAND)}

Rules for copy:
- Sound like the lines that work: short, confident, a little cheeky, numbers over adjectives.
- Use only the claims and offers listed above, word for word where numbers are involved. Never invent nutrition numbers, prices, discounts or dates.
- Light Hinglish is welcome where it feels natural; no forced slang.
- No medical or weight-loss promises, no knocking named competitors.
- Hashtags: mix brand (#promunch), category (#proteinsnacks, #edamame) and occasion tags; no spaces, no # sign in the output.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const body = await req.json();
    const kind = body.kind === 'caption' ? 'caption' : 'headlines';
    const job = BRAND.jobs.find((j) => j.id === body.job_id);
    const product = BRAND.products.find((p) => p.id === body.product_id);
    const brief = Object.entries((body.brief ?? {}) as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .map(([k, v]) => `- ${k}: ${String(v).trim().slice(0, 600)}`)
      .join('\n');

    const task = [
      `Format: ${job ? `${job.name} (${job.tagline})` : 'social post'}.`,
      product ? `Product: ${product.flavour} ${product.line}. Its claims: ${product.claims.join('; ')}.` : `Product: the ${BRAND.name} range.`,
      brief ? `Brief so far:\n${brief}` : 'No brief yet.',
      kind === 'headlines'
        ? 'Write 5 fresh headline options for this piece (different angles: number-led, cheeky, occasion, challenge, short punch). Also fill caption, hashtags and alt_text briefly.'
        : 'Write the post caption for this finished piece, plus hashtags and alt text. Also give 5 alternative headlines.',
    ].join('\n\n');

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      // On a policy decline, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: task }],
    } as never) as Anthropic.Beta.BetaMessage;

    if (response.stop_reason === 'refusal') return json({ error: 'The copywriter declined this brief. Try rewording it.' }, 422);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'No copy came back' }, 502);
    const out = JSON.parse(text.text) as { headlines: string[]; caption: string; hashtags: string[]; alt_text: string };
    return json({
      headlines: out.headlines.slice(0, 6),
      caption: out.caption,
      hashtags: out.hashtags.map((h) => h.replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 12),
      alt_text: out.alt_text,
    });
  } catch (err) {
    console.error('brand-copy error:', err);
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Too many requests right now. Try again in a minute.' }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Copywriter unavailable (${err.status})` }, 502);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
