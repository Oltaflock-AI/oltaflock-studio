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

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4000;

// ─── Model catalogue ──────────────────────────────────────────────────────────
// Deno can't import from src/, so this mirrors src/types/generation.ts,
// src/config/pricing.ts and supabase/functions/generate/model-routes.ts.
// Keep it in sync when models or prices change. 1000 credits = $5.

const MODEL_CATALOGUE = `
## Modes in Studio
- "image" = text → image
- "image-to-image" = edit/transform uploaded reference image(s)
- "video" = text → video
- "image-to-video" = animate an uploaded start image

## Text → Image (mode: image)
- nano-banana-pro — Nano Banana Pro (Google). Photorealistic, sharp detail, textures, lighting, commercial/product shots, clean portraits, text-in-image. Aspect auto/1:1/16:9/9:16; resolution 1K/2K/4K. Cost: 18 credits (1K/2K), 24 credits (4K).
- seedream-4.5 — Seedream 4.5 (ByteDance). Strong aesthetic sense: mood-driven scenes, painterly/illustrated styles, emotional portraits. Many aspect ratios incl. 21:9; quality basic/high. Cost: 6.5 credits.
- flux-flex — Flux Flex (Black Forest Labs Flux 2). Versatile, conceptual/design work, surrealism, stylized renders. Aspect 1:1/16:9/9:16/4:3/3:4; 1K/2K. Cost: 14 credits (1K), 24 credits (2K).
- flux-flex-pro — Flux Pro (Flux 2 Pro). High-fidelity, excellent detail, professional output; handles complex scenes. 1K/2K. Cost: 5 credits (1K), 7 credits (2K) — best quality-per-credit.
- gpt-4o — GPT-4o Image. Best instruction following for complex, conversational art direction; follows negative instructions. Sizes 1:1/3:2/2:3. Cost: 10 credits.
- z-image — Z Image. Budget and fast, for quick iterations and tests; keep prompts short. Cost: 0.8 credits (cheapest).

## Image → Image (mode: image-to-image)
- nano-banana-pro-i2i — Nano Banana Pro edit. High-quality edits that preserve the original composition; many aspect ratios; 1K/2K/4K. Cost: 18 credits (1K/2K), 24 (4K).
- seedream-4.5-edit — Seedream 4.5 Edit. Style transfer and aesthetic refinement, multi-image edits/composites. Cost: 6.5 credits.
- flux-flex-i2i — Flux Flex I2I. Artistic transformations and style changes, multi-image synthesis. Cost: 14 (1K) / 24 (2K).
- flux-pro-i2i — Flux Pro I2I. Professional-grade transformations with fine detail. Cost: 5 (1K) / 7 (2K).
- qwen-image-edit — Qwen Image Edit. Precise, instruction-following edits ("remove the background", "make the jacket red"); supports negative prompt and guidance scale. Cost: 2 credits.

## Text → Video (mode: video)
- kling-3.0 — Kling 3.0. Cinematic camera moves; MULTI-SHOT mode (up to 5 shots, each with its own prompt and duration, in one generation); ELEMENT references (up to 3 named elements, each 2–4 reference images, to keep a character/product consistent); optional sound effects. Tiers std (720p) / pro (1080p) / 4K (2160p). Duration 3–15 s. Aspect 16:9/9:16/1:1. Cost: 60 credits (std), 120 (pro), 280 (4K).
- seedance-2.0 — Seedance 2.0 (ByteDance). Latest-gen realistic motion, fine liquid/fabric detail, native generated AUDIO (on by default), up to 1080p (480p/720p/1080p), duration 4–15 s, aspect 16:9/9:16/1:1/4:3/3:4/21:9/adaptive, optional web search. Cost: 80 credits.
- grok-imagine — Grok Imagine (xAI). Fast, playful, stylized/creative interpretation; motion modes fun/normal/spicy. Aspect 2:3/3:2/1:1/9:16/16:9. Cost: 30 credits (cheapest video).

## Image → Video (mode: image-to-video)
- kling-3.0-i2v — Kling 3.0 I2V. Animates a start image; single-shot supports START + END frame; also multi-shot and element references; std/pro/4K. Cost: 60 / 120 / 280 credits.
- seedance-2.0-i2v — Seedance 2.0 I2V. First frame + optional last frame, plus multi-modal references (up to 9 reference images, 3 reference videos, 3 reference audio clips); audio, up to 1080p. Cost: 80 credits.
- grok-imagine-i2v — Grok Imagine I2V. Animates up to 7 images with fun/normal/spicy motion; 480p/720p. Cost: 30 credits.
`;

const VALID_MODEL_IDS = [
  'nano-banana-pro', 'seedream-4.5', 'flux-flex', 'flux-flex-pro', 'gpt-4o', 'z-image',
  'nano-banana-pro-i2i', 'seedream-4.5-edit', 'flux-flex-i2i', 'flux-pro-i2i', 'qwen-image-edit',
  'kling-3.0', 'seedance-2.0', 'grok-imagine',
  'kling-3.0-i2v', 'seedance-2.0-i2v', 'grok-imagine-i2v',
];

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
