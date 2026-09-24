// supabase/functions/model-assistant/index.ts
// Oltaflock Creative Studio — Model Assistant
// A short chat advisor that recommends which Studio model + mode fits a
// user's shot. Accepts POST { messages: [{ role, content }] } and returns
// { reply }. The final line of a recommending reply is
// "RECOMMEND: <model-id>", which the Assistant page parses into a
// "Try in Studio" button.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { MODEL_CATALOG } from '../_shared/catalog/index.ts';
import { specPriceText } from '../_shared/catalog/pricing.ts';
import { MODE_LABELS, type ModelSpec, type StudioMode } from '../_shared/catalog/types.ts';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4000;

// ─── Model catalogue ──────────────────────────────────────────────────────────
// Generated from the shared catalog (../_shared/catalog), the same source the
// Studio UI and the generate function use. 1000 credits = $5.

function optionsText(spec: ModelSpec): string {
  return spec.fields
    .filter((f) => f.type === 'enum' && f.options && !f.advanced)
    .map((f) => `${f.label} ${f.options!.map((o) => o.label ?? String(o.value)).join('/')}`)
    .join('; ');
}

const MODE_KEYS: Record<StudioMode, string> = {
  'text-to-image': 'image',
  'image-to-image': 'image-to-image',
  'text-to-video': 'video',
  'image-to-video': 'image-to-video',
  'video-to-video': 'video-to-video',
};

const MODEL_CATALOGUE = (Object.keys(MODE_LABELS) as StudioMode[])
  .map((mode) => {
    const specs = MODEL_CATALOG.filter((m) => m.mode === mode);
    if (!specs.length) return '';
    return `## ${MODE_LABELS[mode]} (mode: ${MODE_KEYS[mode]})\n` + specs
      .map((m) => `- ${m.id} — ${m.name} (${m.provider}). ${m.bestFor}${m.audio ? ' Native audio.' : ''} ${optionsText(m)}. Inputs: ${m.media.map((x) => `${x.label} (max ${x.max})`).join(', ') || 'prompt only'}. Cost: ${specPriceText(m)}.`)
      .join('\n');
  })
  .filter(Boolean)
  .join('\n\n');

const VALID_MODEL_IDS = MODEL_CATALOG.map((m) => m.id);

const SYSTEM_PROMPT = `You are the Model Assistant inside Oltaflock Creative Studio, an AI image and video generation app. You are an expert advisor on the exact models available in this app, and you help users pick the right model and mode for their shot.

${MODEL_CATALOGUE}

## How to answer
- Be concise: 2–5 short sentences, or a very short list when comparing. No headings. Plain text; **bold** model names is fine.
- Recommend ONE specific model and mode (text → image, image → image, text → video, or image → video). Briefly explain why it fits, name the key setting(s) to use (e.g. multi-shot, element references, start/end frame, audio, 1080p, 4K, resolution), and mention the approximate credit cost from the catalogue.
- If a reference image changes the best choice, say so (e.g. suggest the image-to-video variant when the user has a still to animate).
- If the request is ambiguous, you may ask one short clarifying question instead of recommending.
- Only discuss models in the catalogue above. If asked about a model the app doesn't have, say so and suggest the closest one here. Never invent capabilities or prices.
- You may also give brief prompt-writing tips for the recommended model.
- Stay on topic (models, modes, settings, prompting, cost in this app). Politely decline unrelated requests.

## Machine-readable recommendation
When you recommend a model, end your reply with a final line in exactly this format, on its own line, with nothing after it:
RECOMMEND: <model-id>
Use one exact id from this list: ${VALID_MODEL_IDS.join(', ')}.
The id also selects the mode, so pick the variant that matches (e.g. "seedance-2.0-i2v" for animating a still, "kling-3.0" for text → video). Omit the line entirely when you are not recommending a specific model (e.g. when asking a clarifying question).`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Keeps the last MAX_HISTORY valid messages, starting on a user turn and merging consecutive same-role turns. */
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) continue;
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === role) {
      prev.content = `${prev.content}\n\n${text}`;
    } else {
      cleaned.push({ role, content: text });
    }
  }
  let recent = cleaned.slice(-MAX_HISTORY);
  while (recent.length > 0 && recent[0].role !== 'user') recent = recent.slice(1);
  return recent;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    const messages = sanitizeMessages(body?.messages);

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'messages must end with a user message' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    // ── Call Claude ───────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    if (!reply) return json({ error: 'Empty response from assistant' }, 502);

    return json({ reply });
  } catch (err) {
    console.error('model-assistant error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
