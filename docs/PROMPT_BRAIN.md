# Prompt Brain

Prompt Brain rewrites a rough idea into a prompt tuned for one model, one use case, and the exact settings and uploads the user has chosen. The code has one implementation, used in two places:

- **Optimize** (preview): the Studio prompt box calls `enhance-prompt`, which returns the rewritten prompt plus up to 3 tips. The user picks Use prompt / Try again / Discard.
- **Auto-optimize** (on submit): when the toggle next to Generate is on, `generate` runs the brain before calling kie.ai. `generations.final_prompt` stores what was actually sent, and `user_prompt` keeps the original.

## Where things live

| File | What it holds |
|---|---|
| `supabase/functions/_shared/brain/index.ts` | `optimizePrompt()`: builds the system prompt, calls Claude (`BRAIN_MODEL` env, default `claude-sonnet-5`, falls back to `claude-sonnet-4-20250514`), parses JSON `{prompt, use_case, notes}`. |
| `supabase/functions/_shared/brain/knowledge.ts` | The knowledge base: `CORE_RULES`, `MODE_RULES` per studio mode, `FAMILY_GUIDES` per model family (syntax, structure, audio/dialogue format, failure modes), `USE_CASE_GUIDES` (shot structure, camera, pacing, light and audio per video/image type). |
| `supabase/functions/_shared/catalog/use-cases.ts` | The use-case list shown in the UI ("What are you making?"). |
| `supabase/functions/_shared/catalog/*.ts` | The model catalog. Each spec's `family` selects its brain guide, and its `bestFor`, `audio`, `promptMax`, fields and media slots are all fed to the brain. |

## What the brain sees for each request

1. Core rules: preserve intent, use native syntax, one camera move per shot, no filler keywords, settings stay out of the prose.
2. The target model: name, provider, mode, audio or no audio, prompt limit, best-for line.
3. That model family's guide. Examples: Seedance 2.5 integer-second timestamps and `{dialogue}` / `<SFX>` / `（music）`; Kling `[Character: label, tone]: "line"` plus "Immediately,"; Veo `SFX:` / `Ambient noise:` / "No subtitles."; Flux front-loading with no negatives.
4. The user's current settings and uploads in plain English, e.g. "Reference images: 2 images attached" or "Elements available: @hero_bottle".
5. The chosen use-case playbook, or auto-detect.
6. The user's own 4–5★ and 1–2★ results on this model, as patterns to follow or avoid.

## Updating the knowledge

- New model family: add a `FAMILY_GUIDES` entry keyed by the catalog `family`. Lookup falls back to the part before the first `-`.
- New use case: add it to `use-cases.ts` (UI) and to `USE_CASE_GUIDES` (brain).
- Research sources (2026-09): ByteDance Seed / BytePlus ModelArk (Seedance 2.5 / 2.0 / 1.5, Seedream), Kling 3.0 user guide and fal's Kling 3.0 guide, Google Veo 3.1 and Nano Banana guides, OpenAI Sora 2 and GPT Image cookbooks, Alibaba Wan 2.6 / 3.0, fal MiniMax H3, Runway help centre, xAI Grok Imagine, BFL FLUX.2 and Kontext, Ideogram, Midjourney.

The full kie.ai endpoint reference (params, limits, prices) is in [`kie-api-catalog.md`](./kie-api-catalog.md).
