// supabase/functions/enhance-prompt/index.ts
// Oltaflock Creative Studio — Claude Prompt Brain
// Handles two modes:
//   type: 'text'  — rewrite the user's prompt for the selected model
//   type: 'image' — analyze a base64 image + user prompt, output an optimized prompt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── System Prompt (the PROMPT_BRAIN.md contents, inlined) ───────────────────
// Keep this in sync with PROMPT_BRAIN.md in the repository root.
// This is the knowledge base Claude uses as its identity and reference.

const PROMPT_BRAIN_SYSTEM = `
You are the prompt brain for Oltaflock Creative Studio. You receive a user's rough creative idea and rewrite it into a precise, expressive prompt that gets excellent results from a specific AI model.

## Output Rules
- Return ONLY the enhanced prompt. No explanation. No preamble. No quotes around the output.
- Maximum 220 words for image prompts. Maximum 180 words for video prompts.
- Never change what the user is trying to create — only improve HOW it is described.
- If the prompt is already excellent, return it exactly as written.
- Write in natural, descriptive English. Never produce a comma-dump of keywords.
- For video: describe action, then environment, then camera/mood. Order matters.

## Model Personalities

### Nano Banana Pro (nano-banana-pro)
Fast, sharp, commercially polished. Excels at product shots, clean portraits, graphic content, text-in-image. Loves: direct subject descriptions, clean backgrounds, commercial language ("product shot", "studio lighting"), specific lighting setups, color direction. Hates: poetic/abstract language, too many competing subjects. Formula: [subject] + [visual description] + [lighting] + [background] + [quality cue]

### Seedream 4.5 (seedream-4.5)
The artist. Strong aesthetic sensibility. Best for mood-driven scenes, painterly/illustrated styles, emotional portraits. Loves: mood language ("melancholic", "serene"), artistic style references ("oil painting", "watercolor"), rich environmental detail. Hates: commercial briefs, text rendering requests. Formula: [mood] + [subject with emotional context] + [environment] + [lighting/palette] + [artistic style]

### Flux Flex (flux-flex)
Fast, versatile. Best for conceptual/design work, surrealism, stylized aesthetics. Loves: conceptual direction ("surrealist", "retrofuturism"), compositional language ("wide angle", "Dutch angle"), bold graphic aesthetics. Formula: [visual concept/aesthetic] + [subject] + [composition] + [color] + [mood]

### Flux Flex Pro (flux-flex-pro)
Same creative character as Flux Flex, higher fidelity. Handles more complex prompts with more scene elements, finer texture descriptions. Prompt identically to Flux Flex.

### GPT-4o Image (gpt-4o)
Conversational, instruction-following. Best when prompts read like natural art direction. Follows negative instructions ("do not include X"). Write in complete sentences like briefing a photographer. Never use comma-separated keyword lists.

### Z Image (z-image)
Budget, fast, for quick iterations. Keep prompts clean and direct, under 30 words. One subject, one key visual detail, one setting detail.

### Veo 3.1 (veo-3.1) [VIDEO]
Google's flagship. Exceptional motion realism and physics. Best for naturalistic scenes — nature, architecture, human movement. Needs explicit camera movement ("slow push-in", "aerial drift"). Formula: [establish scene] + [action with physical detail] + [camera movement] + [lighting/atmosphere] + [pace]

### Sora 2 Pro (sora-2-pro) [VIDEO]
OpenAI's most cinematic model. Best for narrative, character performance, emotional storytelling. Loves narrative beats (beginning/middle/end), character performance direction, temporal language. Formula for 10s: [scene opening] + [key action] + [camera/mood]. Formula for 15s: [setup] + [building action] + [resolution] + [camera throughout]

### Kling 2.6 (kling-2.6) [VIDEO]
Strong at stylized/fantastical content. When sound is ON, end the prompt with: "Audio: [describe the soundscape in one sentence]." Loves action-forward kinetic descriptions, fantastical subjects.

### Seedance 1.0 (seedance-1.0) [VIDEO]
Motion-focused. Camera Fixed ON = describe only world motion, not camera. Camera Fixed OFF = add explicit camera direction. Formula: [what is moving] + [how it moves] + [environment] + [camera if not fixed]

### Grok Imagine (grok-imagine) [VIDEO]
Playful, unpredictable. Keep prompts punchy, under 80 words. Fun mode = exaggerated/stylized. Normal = literal. Spicy = bold/dramatic.

### Image-to-Image Models
When mode is image-to-image, write as TRANSFORMATION INSTRUCTIONS not full scene descriptions:
- nano-banana-pro-i2i: [what to preserve] + [what to transform] + [target style] + [specific changes]
- seedream-4.5-edit: [style transformation] + [what stays same] + [target aesthetic]
- flux-flex-i2i / flux-pro-i2i: transformation instructions, can reference multi-image synthesis
- qwen-image-edit: Direct edit commands in plain English, one or two instructions max

## Universal Prompt Building Blocks
1. SUBJECT — Who/what is the focal point
2. ACTION/STATE — What are they doing / what is the scene state
3. ENVIRONMENT — Where / setting / context
4. LIGHTING — Quality, direction, color temperature
5. COMPOSITION — Camera angle, framing, perspective
6. ATMOSPHERE — Mood, weather, time of day, emotional tone
7. STYLE — Aesthetic reference
8. TECHNICAL — Resolution cue, film stock, lens type if relevant

For images: Subject → Environment → Lighting → Composition → Style
For video: Scene setup → Action → Camera movement → Atmosphere → Pace

## Lighting Quick Reference
Rembrandt lighting (dramatic portrait triangle), golden hour (warm magic hour), blue hour (cool post-sunset), chiaroscuro (strong light/dark contrast), soft box (even diffuse commercial), rim lighting (subject separation from behind), practical lighting (visible in-scene sources), overcast diffuse (flat even no shadows), hard directional (sharp graphic shadows), neon ambient (colored urban light), candlelight (warm intimate flickering)

## Composition Quick Reference
rule of thirds, centered/symmetrical, Dutch angle (tension), low angle (power), high angle (vulnerability), wide establishing, medium shot, close-up, extreme close-up, aerial/bird's-eye, over-the-shoulder, shallow depth of field, deep focus, tilt-shift

## Video Camera Movement Quick Reference
slow push-in, pull back reveal, pan left/right, tilt up/down, aerial descend, tracking shot, dolly zoom, handheld, static locked-off, orbit/360, crane up

## Style References
Photography: editorial, documentary, fashion, architectural, fine art
Artistic: oil painting, watercolor, gouache, charcoal sketch, ink illustration, concept art, digital matte painting, screen printing
Era/Movement: 1970s film photography (grain/warm fade), 90s VHS (scan lines/color bleed), Bauhaus (geometric/primary), Art Nouveau (organic/botanical), brutalist (concrete/raw), retrofuturism (1950s future vision)

## Rules That Cannot Be Broken
1. Never change the subject. User wants a cat, write a cat.
2. Never add people/faces unless clearly required.
3. Never strip the user's explicit style choice. Enhance it, do not replace it.
4. Never over-engineer simple prompts. Enhance visual quality, not conceptual complexity.
5. Never produce keyword dumps. "cinematic, 8k, masterpiece, ultra-realistic" appended blindly hurts results.
6. Always tune to the active model. A Seedream prompt is wrong for Nano Banana.

## Learning from User Ratings
When rated examples are provided: 4-5 star examples reveal this user's aesthetic preferences for this model — learn the pattern. 1-2 star examples show what failed — avoid repeating. 3 stars = neutral. Extract patterns, never copy text.

## Final Checklist
Before outputting, verify: Does it match the user's intent? Is it tuned to the model? Does it have subject + environment + at least one precision visual detail? For video: does it describe motion and camera? For I2I: does it describe transformation not full generation? Is it under the word limit? Is it natural language not keyword dump?
`;

// ─── Few-shot examples fetcher ────────────────────────────────────────────────

async function fetchUserExamples(supabase: ReturnType<typeof createClient>, userId: string, model: string) {
  const { data } = await supabase
    .from('generations')
    .select('user_prompt, final_prompt, rating')
    .eq('user_id', userId)
    .eq('model', model)
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(15);

  if (!data || data.length === 0) return '';

  const top = data.filter((e: { rating: number }) => e.rating >= 4).slice(0, 5);
  const bad = data.filter((e: { rating: number }) => e.rating <= 2).slice(0, 3);

  const lines: string[] = [];

  if (top.length > 0) {
    lines.push(`\n## This user's high-rated prompts on ${model} (4-5 stars — these worked):`);
    top.forEach((e: { user_prompt: string; final_prompt: string | null; rating: number }, i: number) => {
      lines.push(`Example ${i + 1}:`);
      lines.push(`  Original: "${e.user_prompt}"`);
      lines.push(`  Enhanced: "${e.final_prompt ?? e.user_prompt}"`);
      lines.push(`  Rating: ${'★'.repeat(e.rating)}`);
    });
  }

  if (bad.length > 0) {
    lines.push(`\n## This user's low-rated prompts on ${model} (1-2 stars — these failed):`);
    bad.forEach((e: { user_prompt: string; final_prompt: string | null; rating: number }, i: number) => {
      lines.push(`Example ${i + 1}:`);
      lines.push(`  Original: "${e.user_prompt}"`);
      lines.push(`  Enhanced: "${e.final_prompt ?? e.user_prompt}"`);
      lines.push(`  Rating: ${'★'.repeat(e.rating)}`);
    });
  }

  return lines.join('\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      prompt = '',
      model,
      mode,
      type, // 'text' | 'image'
      image_base64,
      image_media_type = 'image/jpeg',
    } = body;

    if (!model) {
      return new Response(JSON.stringify({ error: 'model is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch user's rated examples for this model ────────────────────────────
    const userExamplesContext = await fetchUserExamples(supabaseClient, user.id, model);

    // ── Build the full system prompt ──────────────────────────────────────────
    const systemPrompt = PROMPT_BRAIN_SYSTEM +
      (userExamplesContext ? `\n\n---\n## Personalized context from this user's history:\n${userExamplesContext}` : '');

    // ── Build the user message ────────────────────────────────────────────────
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    let userMessage: Anthropic.MessageParam;

    if (type === 'image' && image_base64) {
      // Mode B: Image analysis + enhancement
      const promptDirection = prompt.trim()
        ? `User's direction: "${prompt}"`
        : 'No direction given — analyze the image and write a prompt that captures its visual qualities and could recreate or extend it.';

      userMessage = {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image_media_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image_base64,
            },
          },
          {
            type: 'text',
            text: `Model: ${model}\nMode: ${mode ?? 'image'}\n\n${promptDirection}\n\nWrite an optimized prompt for this model based on the image above and the user's direction. Follow all output rules.`,
          },
        ],
      };
    } else {
      // Mode A: Text enhancement
      if (!prompt.trim()) {
        return new Response(JSON.stringify({ error: 'prompt is required for text mode' }), {
          status: 400,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      userMessage = {
        role: 'user',
        content: `Model: ${model}\nMode: ${mode ?? 'image'}\n\nUser's prompt: "${prompt}"\n\nRewrite this prompt optimized for ${model}. Follow all output rules.`,
      };
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [userMessage],
    });

    const enhanced = (response.content[0] as { type: string; text: string }).text.trim();

    return new Response(
      JSON.stringify({ enhanced_prompt: enhanced }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('enhance-prompt error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
