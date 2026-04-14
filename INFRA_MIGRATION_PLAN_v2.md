# Infrastructure Migration: n8n → Supabase Edge Functions + Claude Prompt Brain

## Context

Current system routes all generation requests through n8n webhooks (`directive-ai.app.n8n.cloud`). n8n acts as middleware: receives prompt + model config, calls AI APIs, returns results or fires async callbacks. This is unreliable, hard to debug, and limits control.

**Goal:** Replace n8n entirely with Supabase Edge Functions that call Kie.ai directly. The core intelligence layer is a **Claude-powered prompt brain** that rewrites weak prompts before they hit Kie.ai — and gets measurably better over time as users rate generations.

---

## The Prompt Brain: Core Concept

The fundamental idea is simple:

> *"Take the user's rough idea and rewrite it into a prompt that gets great results from this specific model — and learn from what's worked before."*

**Why Claude, not keyword extraction:**
The original plan used regex + keyword lists to extract patterns like `['cinematic', '8k', 'sharp focus']` and append them. This is fragile, produces unnatural prompts, and doesn't understand *context*. A prompt for a product shot needs different enhancement than a portrait or a landscape video.

Instead: call Claude's API from inside the `generate` edge function, passing:
1. The user's raw prompt
2. The target model and its characteristics
3. The user's own top-rated past generations as few-shot examples (what worked for *them*)
4. The user's low-rated generations (what to avoid)

Claude rewrites the prompt naturally, like a creative director improving a brief. The few-shot examples ARE the learning — no training pipeline, no ML infra, no separate model to maintain.

---

## Architecture

```
Client → Supabase Edge Function (generate)
           ├── 1. Validate + check credits
           ├── 2. Fetch user's rated generations (top 5 ★★★★★, bottom 3 ★★)
           ├── 3. Call Claude API → enhanced prompt
           ├── 4. Call Kie.ai API with enhanced prompt
           └── 5. Store result + enhanced prompt in DB → Client polls
```

**The learning loop:**
```
User rates generation (★1–5)
  → Rating saved to generations.rating
  → Next generation: fetch top-rated rows as examples
  → Claude sees "these prompts got 5 stars on this model"
  → Enhancement naturally improves
```

No migration needed. No new tables for the learning system. Your existing `generations` table already has `user_prompt`, `final_prompt`, `rating`, and `model`. That's everything.

---

## Phase 1: Core `generate` Edge Function

**New file:** `supabase/functions/generate/index.ts`

Responsibilities:
1. Receive generation request from client
2. Validate request + check credits (server-side, eliminates client manipulation)
3. Call the **prompt brain** (Claude) to enhance the prompt
4. Call Kie.ai with the enhanced prompt
5. Handle sync/async responses
6. Store result in DB, deduct credits

**Model routing:**
```typescript
const MODEL_ROUTES: Record<string, { endpoint: string; type: 'sync' | 'async' }> = {
  'nano-banana-pro':  { endpoint: '/v1/images/generate', type: 'sync' },
  'flux-flex':        { endpoint: '/v1/images/generate', type: 'sync' },
  'seedream-4.5':     { endpoint: '/v1/images/generate', type: 'sync' },
  'veo-3.1':          { endpoint: '/v1/videos/generate', type: 'async' },
  'sora-2-pro':       { endpoint: '/v1/videos/generate', type: 'async' },
  // fill from Kie.ai docs
};
```

---

## Phase 2: The Claude Prompt Brain

**New file:** `supabase/functions/generate/prompt-brain.ts`

This is the intelligence layer. It calls the Anthropic API with a carefully structured prompt that includes:
- The model's personality/strengths
- The user's own high-rated examples (personalized learning)
- The user's low-rated examples (what to avoid)

```typescript
// supabase/functions/generate/prompt-brain.ts

import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL_PERSONAS: Record<string, string> = {
  'nano-banana-pro': 'a photorealistic image model that excels at detailed textures, lighting, and cinematic composition',
  'flux-flex': 'a versatile image model good at artistic styles, conceptual art, and stylized renders',
  'seedream-4.5': 'an image model with strong aesthetic sensibility, good for portraits and mood-driven scenes',
  'veo-3.1': 'a video generation model that responds well to motion descriptions, camera movements, and scene dynamics',
  'sora-2-pro': 'a high-fidelity video model that benefits from precise physical descriptions and temporal flow cues',
};

interface RatedExample {
  user_prompt: string;
  final_prompt: string | null;
  rating: number;
}

export async function enhancePrompt(
  userPrompt: string,
  model: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ enhanced: string; wasEnhanced: boolean }> {
  
  // Fetch this user's rated generations for this model
  const { data: examples } = await supabase
    .from('generations')
    .select('user_prompt, final_prompt, rating')
    .eq('user_id', userId)
    .eq('model', model)
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(15);

  const topExamples = (examples ?? []).filter(e => e.rating >= 4).slice(0, 5);
  const badExamples = (examples ?? []).filter(e => e.rating <= 2).slice(0, 3);

  const modelPersona = MODEL_PERSONAS[model] ?? 'an AI generation model';

  // Build few-shot context only if the user has rated data
  const hasFeedback = topExamples.length > 0 || badExamples.length > 0;

  const feedbackContext = hasFeedback ? `
## This user's past results on ${model}:

${topExamples.length > 0 ? `### High-rated (4-5 stars) — these prompt styles worked well:
${topExamples.map((e, i) =>
  `Example ${i + 1}:
  - Original: "${e.user_prompt}"
  - Enhanced: "${e.final_prompt ?? e.user_prompt}"
  - Rating: ${'★'.repeat(e.rating)}`
).join('\n\n')}` : ''}

${badExamples.length > 0 ? `### Low-rated (1-2 stars) — these styles did NOT work well:
${badExamples.map((e, i) =>
  `Example ${i + 1}:
  - Original: "${e.user_prompt}"
  - Enhanced: "${e.final_prompt ?? e.user_prompt}"
  - Rating: ${'★'.repeat(e.rating)}`
).join('\n\n')}` : ''}` : '';

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

  const client = new Anthropic();
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
  });

  const enhanced = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const wasEnhanced = enhanced.toLowerCase() !== userPrompt.toLowerCase();

  return { enhanced, wasEnhanced };
}
```

**What makes this better than keyword extraction:**
- It understands context ("dramatic portrait" needs different treatment than "product shot on white background")
- It learns from the user's actual aesthetic preferences, not generic rules
- It won't awkwardly append `, 8k, cinematic, photorealistic` to a prompt that's already cinematic
- The quality of enhancement compounds over time as the user rates more generations

---

## Phase 3: Wiring It Into `generate/index.ts`

The main edge function calls the brain, then Kie.ai:

```typescript
// supabase/functions/generate/index.ts (simplified flow)

serve(async (req) => {
  const payload = await req.json();
  const { prompt, model, controls, type, generationId } = payload;

  // 1. Auth + credit check (server-side)
  const user = await getUser(req);
  const credits = await checkCredits(user.id, model);
  if (!credits.sufficient) return error('Insufficient credits');

  // 2. Enhance prompt with Claude brain
  const { enhanced, wasEnhanced } = await enhancePrompt(
    prompt, model, user.id, supabase
  );

  // 3. Update generation record with enhanced prompt
  await supabase.from('generations').update({
    final_prompt: wasEnhanced ? enhanced : null,
    status: 'running',
  }).eq('id', generationId);

  // 4. Call Kie.ai
  const route = MODEL_ROUTES[model];
  const kieResponse = await callKieAI(route.endpoint, enhanced, controls);

  // 5. Handle sync vs async
  if (route.type === 'sync' && kieResponse.output_url) {
    await supabase.from('generations').update({
      status: 'done',
      output_url: kieResponse.output_url,
      progress: 100,
    }).eq('id', generationId);
    await deductCredits(user.id, model, generationId);
    return ok({ output_url: kieResponse.output_url });
  }

  if (route.type === 'async' && kieResponse.task_id) {
    await supabase.from('generations').update({
      status: 'running',
      external_task_id: kieResponse.task_id,
      progress: 10,
    }).eq('id', generationId);
    return ok({ task_id: kieResponse.task_id });
  }
});
```

---

## Phase 4: The Rating → Learning Loop

This is where it gets interesting. You don't need to do *anything extra* in the rating flow. When the user clicks a star in `RatingPanel.tsx`, it writes to `generations.rating`. The next time they generate on the same model, the brain fetches those rows and learns from them automatically.

The only change needed in `RatingPanel.tsx` is cosmetic — optionally show the user that their rating improves future generations:

```typescript
// In RatingPanel.tsx handleRating():
await updateGeneration({ id: selectedGeneration.id, updates: { rating } });
setPendingRating(false);

if (rating >= 4) {
  toast.success(`Rated ${rating} stars — the AI will generate more like this`);
} else if (rating <= 2) {
  toast.success(`Rated ${rating} stars — the AI will avoid this style next time`);
} else {
  toast.success(`Rated ${rating} stars`);
}
```

**The feedback loop visualized:**
```
Generation #1: "a dog" → Brain (no history) → "a golden retriever in soft afternoon light, shallow depth of field" → ★★★★★
Generation #2: "a cat" → Brain (sees #1 was 5★) → "a tabby cat in warm afternoon light, bokeh background" → ★★★★★
Generation #3: "a bird" → Brain (sees #1, #2 were 5★ with similar style) → adapts accordingly
```

The model adapts to YOUR taste, not generic "good prompt" rules.

---

## Phase 5: Prompt Enhancement UI

To make the brain visible and trustworthy, surface the enhancement in the UI.

**Modify `PromptInput.tsx`** — add a subtle "enhanced" indicator:
```typescript
// After generation completes and final_prompt is set,
// show a small diff/preview of what the brain changed:
{selectedGeneration?.final_prompt && (
  <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/20 rounded-lg">
    <span className="text-primary/70">✦ Enhanced:</span> {selectedGeneration.final_prompt}
  </div>
)}
```

**Add a "Brain On/Off" toggle** in the controls panel (like the existing `isEnhance` toggle on GPT4oControls — extend this pattern to all models). Store preference in `generationStore`. When off, pass `userPrompt` directly to Kie.ai unchanged.

---

## Phase 6: Client-Side Wiring

**Modify `GenerateButton.tsx`:**
```typescript
// BEFORE (n8n):
const response = await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) });

// AFTER (edge function):
const { data, error } = await supabase.functions.invoke('generate', {
  body: {
    prompt: rawPrompt,
    model: selectedModel.id,
    type: generationType,
    controls,
    generationId: dbGeneration.id,
    enhancePrompt: controls.isEnhance !== false, // default on
  },
});
```

Key changes:
- Remove all n8n webhook URLs
- Use `supabase.functions.invoke()` 
- Remove client-side credit deduction
- Response format is consistent: `{ output_url? } | { task_id? } | { error }`

**Modify `useRetryGeneration.tsx`:** Same pattern — invoke `generate` instead of webhook.

**Modify/remove `check-balance` edge function:** Query `user_credits` table directly from the client or keep as thin DB wrapper. No n8n involved.

---

## Phase 7: Async Task Polling

For video models (Veo, Sora) that return a `task_id`:

**New file:** `supabase/functions/poll-tasks/index.ts`

This runs on a schedule (Supabase cron, every 10s) or is invoked by the client:
```typescript
// Find all 'running' generations with an external_task_id
// For each: call Kie.ai status endpoint
// If complete: update to 'done', set output_url, deduct credits
// If error: update to 'error'
```

Alternatively, if Kie.ai supports webhooks for task completion, adapt `generation-callback/index.ts` to handle the Kie.ai callback format instead of n8n's.

---

## Phase 8: Prompt Library & Presets (unchanged from original)

These are independent of the brain and add browsable starting points. Keep the original schema:

```sql
CREATE TABLE public.prompt_templates ( ... );  -- Curated starting points
CREATE TABLE public.presets ( ... );           -- User-saved configs
```

Templates feed *into* the brain — user picks a template, brain enhances it further.

---

## Database Changes Summary

Only ONE new table is truly required for the brain:

```sql
-- OPTIONAL: cache expensive brain calls to avoid re-enhancing identical prompts
CREATE TABLE public.prompt_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text NOT NULL,
  input_hash text NOT NULL,   -- SHA256 of user_prompt + model
  enhanced_prompt text NOT NULL,
  used_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, input_hash)
);
```

Everything else (feedback, learning) lives in the existing `generations` table. No `generation_insights` table needed — that was a workaround for the regex approach. Claude reads raw prompt/rating pairs directly.

---

## Implementation Order

1. **Phase 1** — Core `generate` edge function skeleton (no brain yet, just proxies to Kie.ai)
2. **Phase 6** — Client wiring (test flow end-to-end without enhancement)
3. **Phase 2** — Add Claude prompt brain (drop-in, edge function calls it before Kie.ai)
4. **Phase 5** — UI for enhancement visibility + on/off toggle
5. **Phase 4** — Rating toasts (learning loop already works via existing rating system)
6. **Phase 7** — Async polling edge function
7. **Phase 8** — Prompt library + presets (parallel, independent)

**Blocked on:** Kie.ai API docs (endpoints, auth, request/response format, webhook support)
**Not blocked:** Phases 1, 2, 3, 5, 6 can all be built with a mock Kie.ai response

---

## New Files Summary

```
supabase/functions/generate/index.ts           — Main generation orchestrator
supabase/functions/generate/prompt-brain.ts    — Claude-powered prompt enhancement
supabase/functions/generate/model-routes.ts    — Model → Kie.ai endpoint mapping
supabase/functions/poll-tasks/index.ts         — Async task status polling
supabase/migrations/XXXXXX_prompt_cache.sql    — Optional: cache brain responses
supabase/migrations/XXXXXX_prompt_templates.sql
supabase/migrations/XXXXXX_presets.sql
src/components/studio/PromptLibrary.tsx
src/components/studio/PresetSelector.tsx
src/components/studio/SavePresetDialog.tsx
src/hooks/usePromptTemplates.ts
src/hooks/usePresets.ts
```

## Modified Files

```
src/components/studio/GenerateButton.tsx       — invoke edge fn instead of webhook
src/hooks/useRetryGeneration.tsx               — invoke edge fn instead of webhook
src/components/studio/RatingPanel.tsx          — improved rating toasts only
src/components/studio/PromptInput.tsx          — show enhanced prompt diff
src/components/layout/ControlsPanel.tsx        — brain on/off toggle (all models)
supabase/functions/generation-callback/        — adapt for Kie.ai format or remove
supabase/functions/check-balance/              — simplify to direct DB query
```

---

## What "Gets Better Over Time" Actually Looks Like

| Generations rated | What the brain knows |
|---|---|
| 0 | Uses model persona only. Generic but correct. |
| 3–5 rated | Starts seeing your stylistic preferences. |
| 10–15 rated | Clear personal style profile. Strongly personalized. |
| 20+ rated | Reliably matches your taste. Avoids known bad patterns. |

The brain doesn't need hundreds of examples because Claude is doing the pattern recognition, not a statistical model. 5 good examples with ratings is enough to meaningfully shift behavior.

---

## Cost Estimate for the Brain

Each prompt enhancement call to Claude:
- Input: ~400–600 tokens (system prompt + examples + user prompt)
- Output: ~100–200 tokens (enhanced prompt)
- At claude-sonnet pricing: ~$0.001–0.002 per generation

This is negligible relative to the Kie.ai generation costs. Can be disabled per-model or per-user if needed.

---

## Next Step

**Provide Kie.ai API docs** so the `generate` edge function can be built with correct endpoints, auth headers, and request/response formats. Everything else is ready to implement.
