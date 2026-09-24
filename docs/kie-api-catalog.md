# kie.ai Image & Video Model Catalog

Compiled 2026-09-24 from https://docs.kie.ai/llms.txt + per-model OpenAPI .md pages (curl), sitemap.xml, and old-model legacy docs.
Status: COMPLETE (2026-09-24). Sections: 0 structure/findings · index · A image · B video · Appendix 1 verbatim examples · Appendix 2 raw pricing · Appendix 3 playground ids.

## 0. Key structural findings

- **Unified Market API**: `POST https://api.kie.ai/api/v1/jobs/createTask` body `{model, callBackUrl?, input:{...}}` -> `{code:200,msg:"success",data:{taskId}}`.
- **Unified status**: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` -> `data:{taskId, model, state, param(JSON string), resultJson(JSON string: {resultUrls:[...]} ), failCode, failMsg, costTime, completeTime, createTime, updateTime, progress, creditsConsumed}`. States: `waiting | queuing | generating | success | fail`. Result URLs expire ~24h.
- **Callback** (market): POST `{code:200|501, msg, data:{taskId, model, state:"success"|"fail", param, resultJson, failCode, failMsg, costTime, completeTime, createTime, updateTime, creditsConsumed}}`. Video resultJson may also carry `firstFrameUrl`, `lastFrameUrl`, `resultObject`.
- **MIGRATION (important)**: The *current* docs for Veo 3.1, Runway (gen/extend/Aleph), 4o Image and Flux Kontext now document them on the **unified `/api/v1/jobs/createTask`** endpoint (each page opens with ":::warning This is the new version ... for the old version see docs.kie.ai/old-model/..."). The legacy dedicated endpoints are still documented under `/old-model/...` (details below).
- **Midjourney**: NOT present anywhere in llms.txt or sitemap.xml (current or old-model). `old-model/mj-api/*` returns 404 HTML. Treat Midjourney as UNVERIFIED / possibly removed from docs.
- **Sora 2**: referenced only by a stale card in market/quickstart (`/market/sora2/sora-2-pro-text-to-video`) — that page 404s. Not in llms.txt. Treat as REMOVED/UNVERIFIED.

## Model-id index (documented, all on `/api/v1/jobs/createTask` unless noted) — 61 image + 88 video = 149

**Image — T2I (32; several also accept optional reference images):** `bytedance/seedream`, `bytedance/seedream-v4-text-to-image`, `seedream/4.5-text-to-image`, `seedream/5-lite-text-to-image`, `seedream/5-pro-text-to-image`, `z-image`, `flux-2/pro-text-to-image`, `flux-2/flex-text-to-image`, `flux1-kontext` (t2i+edit), `google/nano-banana`, `nano-banana-pro` (t2i+edit), `nano-banana-2` (t2i+edit), `nano-banana-2-lite` (t2i+edit), `google/imagen4`, `google/imagen4-fast`, `google/imagen4-ultra`, `gpt-image/1.5-text-to-image`, `gpt-image-2-text-to-image`, `gpt-image-2-5-flare-text-to-image`, `gpt-image-2-5-sunburst-text-to-image`, `4o-image-api` (t2i+edit), `grok-imagine/text-to-image`, `grok-imagine-image-2-0/text-to-image`, `ideogram/v3-text-to-image`, `ideogram/character`, `qwen/text-to-image`, `qwen2/text-to-image`, `qwen2-1/text-to-image`, `qwen3/text-to-image`, `qwen3/pro-text-to-image`, `wan/2-7-image` (t2i+edit), `wan/2-7-image-pro` (t2i+edit)

**Image — edit / I2I (26):** `bytedance/seedream-v4-edit`, `seedream/4.5-edit`, `seedream/5-lite-image-to-image`, `seedream/5-pro-image-to-image`, `seedream/5-pro-layer-decomposition`, `flux-2/pro-image-to-image`, `flux-2/flex-image-to-image`, `google/nano-banana-edit`, `gpt-image/1.5-image-to-image`, `gpt-image-2-image-to-image`, `gpt-image-2-5-flare-image-to-image`, `gpt-image-2-5-sunburst-image-to-image`, `grok-imagine/image-to-image`, `grok-imagine-image-2-0/image-edit`, `grok-imagine-image-2-0/segment-map`, `grok-imagine-image-2-0/segment-edit`, `ideogram/v3-edit`, `ideogram/v3-remix`, `ideogram/character-edit`, `ideogram/character-remix`, `qwen/image-to-image`, `qwen/image-edit`, `qwen2/image-edit`, `qwen2-1/image-to-image`, `qwen3/image-to-image`, `qwen3/pro-image-to-image`

**Image — upscale / bg removal (3):** `topaz/image-upscale`, `recraft/crisp-upscale`, `recraft/remove-background`

**Video — multi-mode (T2V + I2V/frames/reference in one id) (13):** `bytedance/seedance-2-5`, `bytedance/seedance-2`, `bytedance/seedance-2-fast`, `bytedance/seedance-2-mini`, `bytedance/seedance-1.5-pro`, `kling-3.0/video`, `veo-3-1`, `runway`, `wan/3-0-video`, `wan/3-0-video-prime`, `gemini-omni-video`, `google/gemini-omni-flash-1-1`, `grok-imagine-video-1-5-preview`

**Video — T2V (18):** `bytedance/v1-lite-text-to-video`, `bytedance/v1-pro-text-to-video`, `kling-2.6/text-to-video`, `kling/v2-1-master-text-to-video`, `kling/v2-5-turbo-text-to-video-pro`, `kling/v3-turbo-text-to-video`, `kling-3.0-omni/text-to-video`, `hailuo/02-text-to-video-standard`, `hailuo/02-text-to-video-pro`, `minimax-h3/text-to-video`, `grok-imagine/text-to-video`, `wan/2-2-a14b-text-to-video-turbo`, `wan/2-5-text-to-video`, `wan/2-6-text-to-video`, `wan/2-7-text-to-video`, `happyhorse/text-to-video`, `happyhorse-1-1/text-to-video`, `pixverse-v6/text-to-video`

**Video — I2V / first-last frame (25):** `bytedance/v1-lite-image-to-video`, `bytedance/v1-pro-image-to-video`, `bytedance/v1-pro-fast-image-to-video`, `kling-2.6/image-to-video`, `kling/v2-1-master-image-to-video`, `kling/v2-1-pro`, `kling/v2-1-standard`, `kling/v2-5-turbo-image-to-video-pro`, `kling/v3-turbo-image-to-video`, `kling-3.0-omni/image-to-video`, `hailuo/02-image-to-video-standard`, `hailuo/02-image-to-video-pro`, `hailuo/2-3-image-to-video-standard`, `hailuo/2-3-image-to-video-pro`, `minimax-h3/image-to-video`, `grok-imagine/image-to-video`, `wan/2-2-a14b-image-to-video-turbo`, `wan/2-5-image-to-video`, `wan/2-6-image-to-video`, `wan/2-6-flash-image-to-video`, `wan/2-7-image-to-video`, `happyhorse/image-to-video`, `happyhorse-1-1/image-to-video`, `pixverse-v6/image-to-video`, `pixverse-v6/transition`

**Video — reference-to-video (6):** `kling-3.0-omni/reference-to-video`, `minimax-h3/reference-to-video`, `wan/2-7-r2v`, `happyhorse/reference-to-video`, `happyhorse-1-1/reference-to-video`, `pixverse-v6/reference-to-video`

**Video — edit / V2V / motion transfer (10):** `kling-3.0-omni/transformation`, `kling-2.6/motion-control`, `kling-3.0/motion-control`, `runway/gen4-aleph`, `wan/2-6-video-to-video`, `wan/2-6-flash-video-to-video`, `wan/2-7-videoedit`, `wan/2-2-animate-move`, `wan/2-2-animate-replace`, `happyhorse/video-edit`

**Video — extend / upscale / HD fetch (8):** `veo/extend`, `veo/get-1080p-video`, `veo/get-4k-video`, `runway/extend-ai-video`, `grok-imagine/extend`, `grok-imagine/upscale`, `pixverse-v6/extend`, `topaz/video-upscale`

**Video — lip-sync / avatar (8):** `kling/ai-avatar-standard`, `kling/ai-avatar-pro`, `infinitalk/from-audio`, `omnihuman-1-5`, `omnihuman-1-5/human-identification`, `omnihuman-1-5/subject-detection`, `volcengine/video-to-video-lip-sync`, `wan/2-2-a14b-speech-to-video-turbo`

**Non-createTask helpers:** `POST /api/v1/omni/audio/create`, `POST /api/v1/omni/character/create` (Gemini Omni). **Legacy dedicated endpoints (old-model docs):** `/api/v1/veo/generate` + `/api/v1/veo/record-info`, `/api/v1/runway/generate` + `/api/v1/runway/extend` + `/api/v1/runway/record-detail`, `/api/v1/aleph/generate` + `/api/v1/aleph/record-info`, `/api/v1/gpt4o-image/generate` + `/api/v1/gpt4o-image/record-info`, `/api/v1/flux/kontext/generate` + `/api/v1/flux/kontext/record-info`. **Not found:** Midjourney (`/api/v1/mj/generate` undocumented), Hunyuan, Sora 2 (playground-only, no docs/pricing), Luma, Kling O1.


- **Pricing source**: public endpoint `POST https://api.kie.ai/client/v1/model-pricing/page` body `{"pageNum":N,"pageSize":100}` (max 100/page; 503 rows total: video 269, image 110, music 27, chat 97). Prices below are credits from that feed (fetched 2026-09-24). Model list for the playground: `GET https://api.kie.ai/api/v1/playground/model-paths` (254 ids).
- **Doc bugs noticed**: `kling/v2-5-turbo-image-to-video-pro` page's `model` enum says `kling/v2-1-master-image-to-video` but the example uses `kling/v2-5-turbo-image-to-video-pro` (trust the example/page name). `qwen2/text-to-image` page enum says `qwen2/image-edit` but example uses `qwen2/text-to-image`. Seedance 2.5 example JSON has a trailing comma. Schema keys with a trailing space: `happyhorse/image-to-video` `'image_urls '` (example uses `image_urls`), `happyhorse/video-edit` `'reference_image '` (example also uses the spaced key — test both), `bytedance/seedance-2-fast` `'reference_video_urls '` (example uses no space). Wan 3.0 schema types `first_frame_url`/`reference_*_urls` as object but all examples pass plain URL strings. **Conflicting model ids**: the 4o Image page's request `example` uses `"model":"4o-image-api"` but its schema `examples` use `"custom_4o_image"`; Flux Kontext's `example` uses `"flux1-kontext"` (the schema enum) but schema `examples` use `"custom_flux_kontext"` — UNVERIFIED which the API accepts (playground ids are `4o-image-api` and `flux1-kontext`).
- Conventions below: `R` = required. Param names are exactly as documented (snake_case inside `input`). "Unverified" = not stated in current docs.

---

# PART A — IMAGE MODELS

## A1. ByteDance Seedream

| Display | model id | Input media | Prompt max | Key params | Price (credits) |
|---|---|---|---|---|---|
| Seedream 3.0 T2I | `bytedance/seedream` | none | 5000 | `image_size` enum square, square_hd(def), portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9; `guidance_scale` 1-10 def 2.5 step 0.1; `seed` int | not in pricing feed |
| Seedream 4.0 T2I | `bytedance/seedream-v4-text-to-image` | none | 5000 | `image_size` enum square, square_hd(def), portrait_4_3, portrait_3_2, portrait_16_9, landscape_4_3, landscape_3_2, landscape_16_9, landscape_21_9; `image_resolution` 1K(def)/2K/4K; `max_images` 1-6 def 1 (also state count in prompt); `seed` int | not in pricing feed |
| Seedream 4.0 Edit | `bytedance/seedream-v4-edit` | `image_urls` R array, max 10 (jpeg/png/webp ≤30MB) | 5000 | same as 4.0 T2I | not in pricing feed |
| Seedream 4.5 T2I | `seedream/4.5-text-to-image` | none | 3000 | `aspect_ratio` R enum 1:1(def),4:3,3:4,16:9,9:16,2:3,3:2,21:9; `quality` R basic(2K, def)/high(4K) | 6.5/image |
| Seedream 4.5 Edit | `seedream/4.5-edit` | `image_urls` R, max 14 (≤30MB) | 3000 | same as 4.5 T2I | 6.5/image |
| Seedream 5.0 Lite T2I | `seedream/5-lite-text-to-image` | none | 3-3000 | `aspect_ratio` R (same 8 values, def 1:1); `quality` R basic(2K,def)/high(3K)/ultra(4K); `output_format` png(def)/jpeg | 5.5/image |
| Seedream 5.0 Lite I2I | `seedream/5-lite-image-to-image` (doc URL `/market/seedream-5-lite-image-to-image`) | `image_urls` R, max 14 | 3-3000 | same as 5 Lite T2I | 5.5/image |
| Seedream 5.0 Pro T2I | `seedream/5-pro-text-to-image` | none | 3-5000 | `aspect_ratio` R (8 values def 1:1); `quality` R basic(1K,def)/high(2K); `output_format` png(def)/jpeg | 7 (1K) / 14 (2K) |
| Seedream 5.0 Pro I2I | `seedream/5-pro-image-to-image` | `image_urls` R, max 10 | 3-5000 | same as 5 Pro T2I | 7 (1K) / 14 (2K); input images 0.5 each, first image free |
| Seedream 5.0 Pro Layer Decomposition | `seedream/5-pro-layer-decomposition` | `image_url` R string (exactly 1; png/jpeg/webp/bmp/tiff/gif ≤30MB; 262,144–36,000,000 px; AR 1:16–16:1; no HEIC) | 0-5000 optional (supports `<bbox>x1 y1 x2 y2</bbox>`) | `size` auto(def)/1K/1.5K/2K; `output_format` jpeg(def)/png (base image only; layers always PNG) | 7 (1K/1.5K) / 14 (2K) |

Notes: Seedream 4.5 and 5.x mark `aspect_ratio` and `quality` as required. 4.0/3.0 use `image_size` enums (fal-style names). No `seed` on 4.5/5.x.

## A2. Z-Image
- `z-image` — T2I. `prompt` R max 1000; `aspect_ratio` R enum 1:1(def),4:3,3:4,16:9,9:16. No image input. Price: 0.8/image ("Qwen z-image").

## A3. Black Forest Labs — Flux 2 & Flux Kontext

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Flux-2 Pro T2I | `flux-2/pro-text-to-image` | none | `prompt` R 3-5000; `aspect_ratio` R 1:1(def),4:3,3:4,16:9,9:16,3:2,2:3; `resolution` R 1K(def)/2K | 5 (1K) / 7 (2K) |
| Flux-2 Pro I2I | `flux-2/pro-image-to-image` | `input_urls` R array 1-8 (jpeg/png/webp ≤10MB) | same + `aspect_ratio` adds `auto` | 5 / 7 |
| Flux-2 Flex T2I | `flux-2/flex-text-to-image` | none | same as Pro T2I | 14 (1K) / 24 (2K) |
| Flux-2 Flex I2I | `flux-2/flex-image-to-image` | `input_urls` R 1-8 | same as Pro I2I | 14 / 24 |

**Flux Kontext (NEW market form)**: `model: "flux1-kontext"` on `/api/v1/jobs/createTask`. `input`: `prompt` R (English only), `enable_translation` bool (def true), `upload_cn` bool, `input_image` string (edit mode), `aspect_ratio` enum 21:9,16:9(def),4:3,1:1,3:4,9:16, `output_format` jpeg(def)/png, `prompt_upsampling` bool def false, `safety_tolerance` int 0-6 def 2 (edit mode 0-2), `watermark` string. **UNVERIFIED: how to choose Pro vs Max in the new market form** — the new schema has no tier field (description still mentions flux-kontext-pro/max). Pricing feed: Pro 5, Max 10 per image.

**Flux Kontext (LEGACY, old-model docs)**: `POST /api/v1/flux/kontext/generate` (camelCase top-level body, no `input` wrapper): `prompt` R, `enableTranslation`, `uploadCn`, `inputImage`, `aspectRatio` (same enum, def 16:9), `outputFormat` jpeg/png, `promptUpsampling`, `model` enum `flux-kontext-pro`(def)/`flux-kontext-max`, `safetyTolerance` 0-6 def 2, `watermark`, `callBackUrl`. Status: `GET /api/v1/flux/kontext/record-info?taskId=` → `data:{taskId, paramJson, completeTime, response:{originImageUrl, resultImageUrl}, successFlag (0 generating,1 success,2 create failed,3 generate failed), errorCode, errorMessage, createTime}`. Images expire after 14 days.
Legacy example (verbatim): `{"prompt": "A serene mountain landscape at sunset with a lake reflecting the orange sky", "enableTranslation": true, "aspectRatio": "16:9", "outputFormat": "jpeg", "promptUpsampling": false, "model": "flux-kontext-pro", "safetyTolerance": 2}`

## A4. Google — Nano Banana family & Imagen 4

| Display | model id | Media input | Prompt max | Params | Price |
|---|---|---|---|---|---|
| Nano Banana | `google/nano-banana` | none | 5000 | `output_format` png(def)/jpeg; `aspect_ratio` 1:1(def),9:16,16:9,3:4,4:3,3:2,2:3,5:4,4:5,21:9,auto; `image_size` (deprecated alias of aspect_ratio) | 4/image |
| Nano Banana Edit | `google/nano-banana-edit` | `image_urls` R, max 10 (≤10MB) | 5000 | same as above | 4/image |
| Nano Banana Pro | `nano-banana-pro` (doc URL `/market/google/pro-image-to-image`) | `image_input` array, max 8 (≤30MB), optional → T2I or I2I in one model | 10000 | `aspect_ratio` 1:1(def),2:3,3:2,3:4,4:3,4:5,5:4,9:16,16:9,21:9,auto; `resolution` 1K(def)/2K/4K; `output_format` png(def)/jpg | 18 (1K/2K) / 24 (4K) |
| Nano Banana 2 | `nano-banana-2` | `image_input` array, max 14 (≤30MB), optional | 20000 | `aspect_ratio` 1:1,2:3,3:2,1:4,4:1,3:4,4:3,4:5,5:4,1:8,8:1,9:16,16:9,21:9,auto(def); `resolution` 1K(def)/2K/4K; `output_format` png/jpg(def) | 8 (1K) / 12 (2K) / 18 (4K) |
| Nano Banana 2 Lite | `nano-banana-2-lite` | `image_urls` array (default []), max 10 (≤30MB), optional | 20000 | `aspect_ratio` R 1:1,1:4,1:8,2:3,3:2,3:4,4:1,4:3,4:5,5:4,8:1,9:16,16:9,21:9,auto(def) | 4/image (1K) |
| Imagen 4 | `google/imagen4` | none | 5000 | `negative_prompt` ≤5000; `aspect_ratio` 1:1(def),16:9,9:16,3:4,4:3,auto; `seed` **string** ≤500 chars | 8/request |
| Imagen 4 Fast | `google/imagen4-fast` | none | 5000 | `negative_prompt`; `aspect_ratio` same enum, def **16:9**; `seed` **integer** | 4/request |
| Imagen 4 Ultra | `google/imagen4-ultra` | none | 5000 | `negative_prompt`; `aspect_ratio` def 1:1; `seed` string ≤500 | 12/image |

Note: there is NO separate "Nano Banana 2 edit" or "Nano Banana Pro edit" model id — both accept optional reference arrays (`image_input`). Playground also lists `nano-banana-upscale` (no doc page — UNVERIFIED).

## A5. OpenAI — GPT Image

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| GPT Image 1.5 T2I | `gpt-image/1.5-text-to-image` | none | `prompt` R (no max stated); `aspect_ratio` R 1:1(def),2:3,3:2; `quality` R medium(def)/high | medium 4, high 22 |
| GPT Image 1.5 I2I | `gpt-image/1.5-image-to-image` | `input_urls` R max 16 (≤10MB) | same; aspect def 3:2 | medium 4, high 22 |
| GPT Image 2 T2I | `gpt-image-2-text-to-image` | none | `prompt` R 1-20000; `aspect_ratio` auto(def),1:1,3:2,2:3,4:3,3:4,5:4,4:5,16:9,9:16,2:1,1:2,3:1,1:3,21:9,9:21 (2K excludes 5:4,4:5,3:1,1:3,9:21; 4K excludes 3:1,1:3,9:21); `resolution` 1K/2K/4K (1:1 cannot be 4K; auto/omitted AR ⇒ 1K only, else task fails); `background` transparent/opaque/auto (1K only) | 6 (1K) / 10 (2K) / 16 (4K) |
| GPT Image 2 I2I | `gpt-image-2-image-to-image` | `input_urls` R max 16 | same as T2I | 6 / 10 / 16 |
| GPT Image 2.5 Flare T2I | `gpt-image-2-5-flare-text-to-image` | none | `prompt` R ≤20000; `aspect_ratio` auto(def),1:1,3:2,2:3,4:3,3:4,16:9,9:16,21:9,27:16,16:27,9:8,8:9 (27:16,16:27,9:8,8:9 → 1K only); `resolution` 1K/2K/4K; `background` transparent/opaque/auto | 6 / 10 / 16 |
| GPT Image 2.5 Flare I2I | `gpt-image-2-5-flare-image-to-image` | `input_urls` R max 16 | same | 6 / 10 / 16 |
| GPT Image 2.5 Sunburst T2I | `gpt-image-2-5-sunburst-text-to-image` | none | same as Flare | 6 / 10 / 16 |
| GPT Image 2.5 Sunburst I2I | `gpt-image-2-5-sunburst-image-to-image` | `input_urls` R max 16 | same | 6 / 10 / 16 |
| GPT-4o Image ("GPT image 1") | NEW: `model: "4o-image-api"` via createTask | `files_url` array ≤5 (jfif/jpeg/jpg/png/webp); `file_url` deprecated | `prompt` (required unless files_url given); `size` R 1:1/3:2/2:3. Example also shows `isEnhance`, `uploadCn`, `enableFallback`, `fallbackModel:"FLUX_MAX"` inside input (not in schema — UNVERIFIED) | 6/image |

**GPT-4o Image LEGACY**: `POST /api/v1/gpt4o-image/generate` top-level camelCase: `prompt`, `filesUrl` (≤5), `size` R (1:1/3:2/2:3), `fileUrl` (deprecated), `callBackUrl` (old docs also had `isEnhance`, `uploadCn`, `enableFallback`, `fallbackModel`, `nVariants` — only the four listed + callBackUrl parsed from current old-model schema; others UNVERIFIED). Status: `GET /api/v1/gpt4o-image/record-info?taskId=` → `data:{taskId, paramJson, completeTime, response:{resultUrls:[...]}, successFlag, status: GENERATING|SUCCESS|CREATE_TASK_FAILED|GENERATE_FAILED, errorCode, errorMessage, createTime, progress:"1.00"}`. Max 3 queries/sec/task. Images kept 14 days.

## A6. xAI — Grok Imagine (image)

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Grok Imagine T2I | `grok-imagine/text-to-image` | none | `prompt` R (≤5000 per description); `aspect_ratio` 2:3,3:2,1:1(def),16:9,9:16; `enable_pro` bool (false=speed, true=quality) | 4 per generation (returns multiple images — feed says "4 per 2 images"); quality mode 5 |
| Grok Imagine I2I | `grok-imagine/image-to-image` | `image_urls` R (maxItems 5 in schema but description says "up to 1"; ≤10MB; reference as `@image1` in prompt) | `prompt` ≤390000 | 4/generation |
| Grok Imagine Image 2.0 T2I | `grok-imagine-image-2-0/text-to-image` | none | `prompt` R; `aspect_ratio` R 1:1,2:3,3:2,16:9,9:16 | 4/image |
| Grok Imagine Image 2.0 Image Edit | `grok-imagine-image-2-0/image-edit` (doc URL `.../image-to-image`) | `image_urls` R 1-5 | `prompt` (≤8000 per desc); `aspect_ratio` R 1:1,2:3,3:2,16:9,9:16,auto | 4/image |
| Grok Imagine Image 2.0 Segment Map | `grok-imagine-image-2-0/segment-map` | `input` is **oneOf**: `{task_id}` (existing grok-imagine-image-2-0 task) OR `{image_url}` | — | not in feed |
| Grok Imagine Image 2.0 Segment Edit | `grok-imagine-image-2-0/segment-edit` (doc URL `.../image-edit`) | `task_id` R (from 2.0 text-to-image or segment-map task) | `prompt` R; `mask_indexs` array<int> (segment indices, min 1) | not in feed |

## A7. Ideogram

All via createTask. `rendering_speed` enum TURBO/BALANCED/QUALITY drives price.

| Display | model id | Media | Params | Price T/B/Q |
|---|---|---|---|---|
| Ideogram V3 T2I | `ideogram/v3-text-to-image` | none | `prompt` R ≤5000; `rendering_speed`; `style` AUTO/GENERAL/REALISTIC/DESIGN; `expand_prompt` bool; `image_size` square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9; `seed`; `negative_prompt` ≤5000 | 3.5 / 7 / 10 |
| Ideogram V3 Edit (inpaint) | `ideogram/v3-edit` | `image_url` R + `mask_url` R (same dims, ≤10MB) | `prompt` R; `rendering_speed` def BALANCED; `expand_prompt` def true; `seed` | 3.5 / 7 / 10 |
| Ideogram V3 Remix | `ideogram/v3-remix` | `image_url` R | `prompt` R; `rendering_speed`; `style`; `expand_prompt`; `image_size`; `num_images` "1"-"4"; `seed`; `strength` 0.01-1; `negative_prompt` ≤5000 | 3.5 / 7 / 10 |
| Ideogram V3 Reframe | `ideogram/v3-reframe` | — | **no doc page** (playground id + pricing only) — UNVERIFIED params | 3.5 / 7 / 10 |
| Ideogram Character | `ideogram/character` | `reference_image_urls` R (only 1 used) | `prompt` R ≤5000; `rendering_speed` def BALANCED; `style` AUTO/REALISTIC/FICTION; `expand_prompt`; `num_images` "1"-"4"; `image_size`; `seed`; `negative_prompt` ≤5000 | 12 / 18 / 24 |
| Ideogram Character Edit | `ideogram/character-edit` | `image_url` R + `mask_url` R + `reference_image_urls` R (1) | `prompt` R; `rendering_speed`; `style`; `expand_prompt`; `num_images`; `seed` | 12 / 18 / 24 |
| Ideogram Character Remix | `ideogram/character-remix` | `image_url` R + `reference_image_urls` R (1); optional `image_urls` (style refs), `reference_mask_urls` (string) | `prompt` R; `rendering_speed`; `style`; `expand_prompt`; `image_size`; `num_images`; `seed`; `strength` 0.1-1 def 0.8; `negative_prompt` ≤500 | 12 / 18 / 24 |

## A8. Alibaba Qwen image family

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Qwen Image T2I | `qwen/text-to-image` | none | `prompt` R ≤5000; `image_size` square, square_hd(def), portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9; `num_inference_steps` 2-250 def 30; `seed`; `guidance_scale` 0-20 def 2.5; `enable_safety_checker`; `output_format` png/jpeg; `negative_prompt` ≤500; `acceleration` none/regular/high | 4 per megapixel |
| Qwen Image I2I | `qwen/image-to-image` | `image_url` R string (≤10MB) | `prompt` R ≤5000; `strength` 0-1 def 0.8; `output_format`; `acceleration`; `negative_prompt` ≤500; `seed`; `num_inference_steps` 2-250 def 30; `guidance_scale` def 2.5; `enable_safety_checker` | 4 per MP |
| Qwen Image Edit | `qwen/image-edit` | `image_url` R string | `prompt` R ≤2000; `acceleration`; `image_size` (def landscape_4_3); `num_inference_steps` 2-49 def 25; `seed`; `guidance_scale` 0-20 def 4; `sync_mode`; `num_images` "1"-"4"; `enable_safety_checker`; `output_format` jpeg/png; `negative_prompt` ≤500 | 5 per MP |
| Qwen2 T2I | `qwen2/text-to-image` | none | `prompt` R ≤800; `image_size` 1:1,3:4,4:3,9:16,16:9(def); `seed`; `output_format` jpeg/png(def) | 5.6/image |
| Qwen2 Image Edit | `qwen2/image-edit` | `image_url` R string | `prompt` R ≤800; `image_size` 1:1,2:3,3:2,3:4,4:3,9:16,16:9(def),21:9; `seed`; `output_format` | 5.6/image |
| Qwen Image 2.1 T2I | `qwen2-1/text-to-image` | none | `prompt` R 1-5000; `aspect_ratio` 1:1(def),4:3,3:4,3:2,2:3,16:9,9:16,21:9,9:21; `resolution` 1K(def)/2K only; `background` opaque(def)/transparent; `output_format` png(def)/webp/jpeg (jpeg ≠ transparent); `enhance_prompt` def true; `seed` | 4 (1K) / 8 (2K) |
| Qwen Image 2.1 I2I | `qwen2-1/image-to-image` | `image_urls` R 1-10 (≤30MB, ≤25MP); optional `mask_url` (inpaint; requires exactly 1 image; white=change) | same as 2.1 T2I, `aspect_ratio` adds `auto`(def) | 4 / 8 |
| Qwen3 T2I | `qwen3/text-to-image` | none | `prompt` R ≤5000; `resolution` 1K/2K; `image_size` 1:1,3:2,2:3,4:3,3:4,16:9(def),9:16,21:9; `output_format` png/jpeg; `prompt_extend` def true; `negative_prompt` ≤5000; `seed` 0-2147483647 def 1 | 4.8 (1K/2K) |
| Qwen3 I2I | `qwen3/image-to-image` | `image_urls` R 1-3 (jpeg/png/webp/bmp/gif/tiff ≤10MB) | same as Qwen3 T2I | 4.8 output + 0.5/input image |
| Qwen3 Pro T2I | `qwen3/pro-text-to-image` | none | same as Qwen3 | 6.4 (1K) / 12 (2K) |
| Qwen3 Pro I2I | `qwen3/pro-image-to-image` | `image_urls` R 1-3 | same | 6.4 / 12 output + 0.5/input image |

## A9. Alibaba Wan image
- `wan/2-7-image` and `wan/2-7-image-pro` — T2I + edit in one model. `prompt` R ≤5000; `input_urls` array ≤9 (optional; edit mode); `aspect_ratio` 1:1,16:9,4:3,21:9,3:4,9:16,8:1,1:8 (when no image input); `enable_sequential` bool def false (group mode); `n` 1-4 (def 4) or 1-12 when sequential (def 12); `resolution` 1K/2K(def)/4K (Pro: 4K only for T2I standard mode); `thinking_mode` bool (only when not sequential and no input); `color_palette` array 3-10 of `{hex, ratio:"xx.xx%"}`; `bbox_list` array of [x1,y1,x2,y2] (≤2 per image); `watermark` bool def false; `seed` 0-2147483647. Price: 4.8/image (2.7), 12/image (2.7 Pro).

## A10. Upscale / background removal (image)
- `topaz/image-upscale` — `image_url` R (≤10MB); `upscale_factor` R enum "1","2"(def),"4". Price 10 (≤2K) / 20 (4K).
- `recraft/crisp-upscale` — `image` R (URL string, ≤10MB). Price 0.5.
- `recraft/remove-background` — `image` R (png/jpg/webp ≤5MB, ≤16MP, max 4096px, min 256px). Price 1.
- Grok Imagine video upscale is in Part B. `nano-banana-upscale`, `kie/image-refiner` appear only in playground model list — no docs (UNVERIFIED).

## A11. Not found (image)
- **Midjourney**: no doc page (current or old-model), not in playground model-paths, not in pricing feed → NOT AVAILABLE / UNVERIFIED. (`/api/v1/mj/generate` could not be verified.)
- **Hunyuan image**: not present anywhere.
- **Imagen 4 edit, Seedream 5 "edit" naming**: 5.x uses `image-to-image` naming, no `edit` id.

---

# PART B — VIDEO MODELS

## B1. ByteDance Seedance (all via createTask)

Seedance 2.x shared rules (from docs): three **mutually exclusive** scenarios — (a) first-frame I2V (`first_frame_url`), (b) first+last frame (`first_frame_url` + `last_frame_url`; last cannot be alone), (c) multimodal reference-to-video (`reference_image_urls` / `reference_video_urls` / `reference_audio_urls`). Reference media accept URL or `asset://{assetId}`. Ref image: jpeg/png/webp/bmp/tiff/gif, AR 0.4–2.5, 300–6000 px, <30MB. Ref video: mp4/mov, 480p/720p, AR 0.4–2.5, total pixels 409,600–927,408, FPS 24–60. Ref audio: wav/mp3 ≤15MB. `nsfw_checker` bool also accepted (defaults false = filtering off per doc wording).

| Display | model id | Prompt | Media (max) | resolution | aspect_ratio | duration | Other | Price (credits/sec) |
|---|---|---|---|---|---|---|---|---|
| Seedance 2.5 | `bytedance/seedance-2-5` | ≤30000 | first/last frame; ref images ≤30, ref videos ≤10 (each 2–30s, ≤200MB, total ≤30s), ref audio ≤10 (2–30s, total ≤30s) | 480p/720p(def)/1080p | 1:1,4:3,3:4,16:9,9:16,21:9,adaptive(def) | int 4–30, def 5, `-1`=auto | `generate_audio` def **true**; `return_last_frame` def false; `output_format` mp4(def)/mov; `web_search` bool | 480p 28 / 720p 63 / 1080p 158 (no video input); with video input 17 / 38 / 95 |
| Seedance 2.0 | `bytedance/seedance-2` | 3–20000 | first/last frame; ref images ≤9; ref videos ≤3 (2–15s each, total ≤15s); ref audio ≤3 (2–15s, total ≤15s) | 480p/720p(def)/1080p/4k | same 7 values, def 16:9 | int 4–15 or -1, def 5 | `generate_audio` def true; `return_last_frame`; `web_search` | 480p 19 / 720p 41 / 1080p 102 / 4K 208; with video input 11.5 / 25 / 62 / 128 |
| Seedance 2.0 Fast | `bytedance/seedance-2-fast` | 3–20000 | same as 2.0 | 480p/720p(def) | def 16:9 | 4–15 or -1 | same; `web_search` only for T2V | 480p 11.7 / 720p 24.8; with video 6.8 / 15 |
| Seedance 2.0 Mini | `bytedance/seedance-2-mini` | 3–20000 | same as 2.0 | 480p/720p(def) | def 16:9 | 4–15 or -1 | no `return_last_frame`; `web_search` T2V only | 480p 3.8 / 720p 8.2; with video 2.4 / 5 |
| Seedance 1.5 Pro | `bytedance/seedance-1.5-pro` | R 3–20000 | `input_urls` 0–2 images (≤10MB) → T2V if empty, 1=first frame, 2=first+last (implied) | 480p/720p(def)/1080p | R 1:1(def),4:3,3:4,16:9,9:16,21:9 | R number 4–12 | `fixed_lens` bool def false; `generate_audio` def false | with audio 3.5 / 7 / 15; without 1.75 / 3.5 / 7.5 |
| Seedance 1.0 Pro T2V | `bytedance/v1-pro-text-to-video` | R ≤10000 | none | 480p/720p(def)/1080p | 21:9,16:9(def),4:3,1:1,3:4,9:16 | "5"/"10" | `camera_fixed`; `seed` -1..2147483647 def -1; `enable_safety_checker` | not in pricing feed |
| Seedance 1.0 Pro I2V | `bytedance/v1-pro-image-to-video` | R ≤10000 | `image_url` R string (≤10MB) | 480p/720p/1080p | — | "5"/"10" | `camera_fixed`; `seed`; `enable_safety_checker` | not in feed |
| Seedance 1.0 Pro Fast I2V | `bytedance/v1-pro-fast-image-to-video` | R ≤10000 | `image_url` R | 720p(def)/1080p | — | "5"/"10" | — | not in feed |
| Seedance 1.0 Lite T2V | `bytedance/v1-lite-text-to-video` | R ≤10000 | none | 480p/720p/1080p | 16:9(def),4:3,1:1,3:4,9:16,9:21 | "5"/"10" | `camera_fixed`; `seed` int; `enable_safety_checker` | not in feed |
| Seedance 1.0 Lite I2V | `bytedance/v1-lite-image-to-video` | R ≤10000 | `image_url` R + optional `end_image_url` | 480p/720p/1080p | — | "5"/"10" | `camera_fixed`; `seed`; `enable_safety_checker` | not in feed |

Seedance 2.5 verbatim example (doc has trailing comma after `"duration": 15`):
```json
{"model":"bytedance/seedance-2-5","callBackUrl":"https://your-domain.com/api/callback","input":{"prompt":"A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky","reference_image_urls":["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.png"],"reference_video_urls":["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp4"],"reference_audio_urls":["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp3"],"return_last_frame":false,"generate_audio":false,"resolution":"720p","aspect_ratio":"16:9","duration":15}}
```
Result JSON for Seedance may include `firstFrameUrl`/`lastFrameUrl` arrays alongside `resultUrls`.

## B2. Kling (all via createTask)

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| **Kling 3.0** (std/pro/4K, single & multi-shot) | `kling-3.0/video` | `image_urls` array: 1 = first frame, 2 = first+last (multi-shot: first frame only) | `prompt` R (used when `multi_shots=false`); `sound` R bool def false (defaults true for multi-shot); `duration` R string "3"–"15" def "5"; `aspect_ratio` R 16:9(def)/9:16/1:1 (optional when image_urls given); `mode` R std/pro(def)/4K (std 720p, pro 1080p, 4K 2160p); `multi_shots` R bool def false; `multi_prompt` R array ≤5 of `{prompt ≤500 chars, duration 1–12}`; `kling_elements` ≤3 of `{name, description, element_input_urls (2–4 JPG/PNG ≤10MB, or 1 video 3–8s effective), element_input_audio_urls (5–30s), start_time, end_time (ms, 3000–8000 window)}`; reference with `@name` in prompt (each @element costs 37 chars) | per sec: 720P 14 (no audio) / 20 (audio); 1080P 18 / 27; 4K 67 / 67 |
| Kling 3.0 Turbo T2V | `kling/v3-turbo-text-to-video` | none | `prompt` R ≤2500; `duration` R string 3–15 def "5"; `aspect_ratio` R 1:1/9:16/16:9(def); `resolution` R 720p(def)/1080p | 18/s (720P), 22.5/s (1080P) |
| Kling 3.0 Turbo I2V | `kling/v3-turbo-image-to-video` | `image_urls` R array (jpeg/png ≤10MB) | `prompt` R ≤2500; `duration` R 3–15; `resolution` R 720p/1080p | 18/s, 22.5/s |
| Kling 3.0 Omni T2V | `kling-3.0-omni/text-to-video` | optional `elements` (multi-image subjects ≤7, or video-character subjects ≤3; mixed: ≤3 video + ≤4 image subjects) | `prompt` R ≤3072; `customize_multi_shots` def true; `prefer_multi_shots` (mutually exclusive with customize); `multi_prompt` ≤6 of `{prompt ≤512, duration 1–15}`; `audio` def false; `resolution` 720p(def)/1080p/4k; `aspect_ratio` 16:9(def)/9:16/1:1; `duration` int 3–15 def 5 | NOT in pricing feed |
| Kling 3.0 Omni I2V | `kling-3.0-omni/image-to-video` | oneOf: `image_urls` exactly 1 (first frame) OR exactly 2 (first+last); JPG/PNG ≤50MB, ≥300px, AR 0.4–2.5; `elements` ≤3 | same as T2V; `aspect_ratio` adds `auto`(def) — fixed ratios only with `customize_multi_shots` | NOT in feed |
| Kling 3.0 Omni Reference-to-Video | `kling-3.0-omni/reference-to-video` | oneOf: (a) `image_urls` ≤7 no video; (b) `video_urls` exactly 1 (MP4/MOV ≤200MB, 3–15.5s, 700–4553px, ≤8,294,400 px, AR 0.4–2, 24–60fps) with `aspect_ratio:"auto"` & `audio:false` required; (c) video + `image_urls` ≤4, `audio:false` | as above; `elements` with `start_time`/`end_time` (ms) for video subjects | NOT in feed |
| Kling 3.0 Omni Transformation (video edit) | `kling-3.0-omni/transformation` | oneOf: `video_urls` 1 (aspect `auto` only) OR `video_urls` 1 + `image_urls` ≤4 (aspect 16:9/9:16/1:1, `duration` string allowed) | `prompt` R ≤3072; `resolution`; `audio` bool; `elements` | NOT in feed |
| Kling 2.6 T2V | `kling-2.6/text-to-video` | none | `prompt` R ≤1000; `sound` R bool; `aspect_ratio` R 1:1(def)/16:9/9:16; `duration` R "5"/"10" | 5s: 55 (no sound) / 110 (sound); 10s: 110 / 220 |
| Kling 2.6 I2V | `kling-2.6/image-to-video` | `image_urls` R max 1 (jpeg/png ≤10MB) | `prompt` R ≤1000; `sound` R; `duration` R "5"/"10" | same as T2V |
| Kling 2.6 Motion Control | `kling-2.6/motion-control` | `input_urls` R 1 image (head/shoulders/torso visible, >300px, AR 2:5–5:2, ≤10MB); `video_urls` R 1 video (3–30s, mp4/mov ≤100MB) | `prompt` ≤2500; `character_orientation` R image/video(def) (image → max 10s, video → max 30s); `mode` R enum "720p"(def)/"1080p" | 11/s (720P), 18/s (1080P) |
| Kling 3.0 Motion Control | `kling-3.0/motion-control` | `input_urls` R (1 image), `video_urls` R (1 video) | `prompt` 0–2500; `mode` (desc says std=720p/pro=1080p but example uses `"720p"` — UNVERIFIED which form is accepted); `character_orientation` video(def)/image; `background_source` input_video(def)/input_image | 20/s (720P), 27/s (1080P) |
| Kling 2.5 Turbo T2V Pro | `kling/v2-5-turbo-text-to-video-pro` | none | `prompt` R ≤2500; `duration` "5"/"10"; `aspect_ratio` 16:9(def)/9:16/1:1; `negative_prompt` ≤2500; `cfg_scale` 0–1 def 0.5 | 42 (5s) / 84 (10s) |
| Kling 2.5 Turbo I2V Pro | `kling/v2-5-turbo-image-to-video-pro` (page enum wrongly says v2-1-master) | `image_url` R + optional `tail_image_url` (jpeg/png ≤10MB) | `prompt` R ≤2500; `duration` "5"/"10"; `negative_prompt` ≤500; `cfg_scale` 0–1 def 0.5 | 42 / 84 |
| Kling 2.1 Master T2V | `kling/v2-1-master-text-to-video` | none | `prompt` R ≤5000; `duration` "5"/"10"; `aspect_ratio` 16:9/9:16/1:1; `negative_prompt` ≤500; `cfg_scale` 0–1 def 0.5 | 160 (5s) / 320 (10s) |
| Kling 2.1 Master I2V | `kling/v2-1-master-image-to-video` | `image_url` R | `prompt` R ≤5000; `duration`; `negative_prompt`; `cfg_scale` | 160 / 320 |
| Kling 2.1 Pro (I2V) | `kling/v2-1-pro` | `image_url` R + optional `tail_image_url` | same | 50 / 100 |
| Kling 2.1 Standard (I2V) | `kling/v2-1-standard` | `image_url` R | same (no tail) | 25 / 50 |
| Kling AI Avatar Standard | `kling/ai-avatar-standard` | `image_url` R (jpeg/png ≤10MB) + `audio_url` R (mp3/wav/aac/mp4/ogg ≤100MB, ≤5 min) | `prompt` R ≤5000 | 8/s (720p, up to 15s per feed) |
| Kling AI Avatar Pro | `kling/ai-avatar-pro` | same | same | 16/s (1080p) |

Other Kling ids present only in playground list (no docs → UNVERIFIED): `kling-o1/kling-hig-image-omni-flf-o1`, `kling-o1/kling-hig-image-reference-o1`, `kling-o1/kling-hig-video-edit-o1`, `kling-o1/kling-hig-video-reference-o1`, `kling/ai-avatar-v1-pro`, `kling/v1-avatar-standard`, `kling/v1-tts`.

## B3. MiniMax / Hailuo

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Hailuo 02 Standard T2V | `hailuo/02-text-to-video-standard` | none | `prompt` R ≤1500; `duration` "6"(def)/"10"; `prompt_optimizer` bool | 768p: 30 (6s) / 50 (10s) |
| Hailuo 02 Pro T2V | `hailuo/02-text-to-video-pro` | none | `prompt` R ≤1500; `prompt_optimizer` | 57 (6s 1080p) |
| Hailuo 02 Standard I2V | `hailuo/02-image-to-video-standard` | `image_url` R + optional `end_image_url` (≤10MB) | `prompt` R ≤1500; `duration` "6"/"10"(def); `resolution` 512P/768P(def); `prompt_optimizer` | 512p 12 (6s)/20 (10s); 768p 50 (10s) |
| Hailuo 02 Pro I2V | `hailuo/02-image-to-video-pro` | `image_url` R + optional `end_image_url` | `prompt` R ≤1500; `prompt_optimizer` | 57 (6s 1080p) |
| Hailuo 2.3 Standard I2V | `hailuo/2-3-image-to-video-standard` | `image_url` R | `prompt` R ≤5000; `duration` "6"(def)/"10" (10s not at 1080P); `resolution` 768P(def)/1080P | 768p 30 (6s)/50 (10s); 1080p 50 (6s) |
| Hailuo 2.3 Pro I2V | `hailuo/2-3-image-to-video-pro` | `image_url` R | same | 768p 45 (6s)/90 (10s); 1080p 80 (6s) |
| MiniMax H3 T2V | `minimax-h3/text-to-video` | none | `prompt` R 1–7000; `aspect_ratio` R 21:9,16:9,4:3,1:1,3:4,9:16 (no adaptive); `duration` R int 4–15 def 6; `resolution` 768P/2K(def) | 8/s (768p), 13/s (2K) |
| MiniMax H3 I2V | `minimax-h3/image-to-video` | `first_frame_url` and/or `last_frame_url` (at least one; jpg/png/webp/heic/heif ≤30MB, 256–5760px, AR 0.4–2.5) | `prompt` R 1–7000; `duration` R 4–15 def 6; `resolution` 768P/2K(def) | 8/s, 13/s (+4/image input) |
| MiniMax H3 Reference-to-Video | `minimax-h3/reference-to-video` | `reference_image_urls` ≤9; `reference_video_urls` ≤3 (mp4/mov ≤50MB, 2–15s each, total ≤15s); `reference_audio_urls` ≤3 (wav/mp3 ≤15MB, 2–15s, total ≤15s; not alone) | `prompt` R; `aspect_ratio` adaptive(def),21:9,16:9,4:3,1:1,3:4,9:16; `duration` R 4–15 def 6; `resolution` 768P/2K(def) | 8/s, 13/s; video input billed 8 or 13/s; image input 4 each |

## B4. xAI Grok Imagine (video)

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Grok Imagine T2V | `grok-imagine/text-to-video` | none | `prompt` R (≤5000); `aspect_ratio` 2:3(def),3:2,1:1,16:9,9:16; `mode` fun/normal(def)/spicy; `duration` number 6–30; `resolution` 480p(def)/720p/1080p | 2.4/s (480p), 4.5/s (720p), 8/s (1080p) |
| Grok Imagine I2V | `grok-imagine/image-to-video` | `image_urls` ≤7 (jpeg/png/webp ≤10MB; reference `@image1` in prompt) **or** `task_id` + `index` 0–5 (from grok-imagine/text-to-image; required for spicy) | `prompt` (≤5000); `mode` fun/normal/spicy (spicy not with external images); `duration` string 6–30; `resolution` 480p(def)/720p/1080p; `aspect_ratio` 2:3,3:2,1:1,16:9(def),9:16 (multi-image only) | same as T2V |
| Grok Imagine Video 1.5 Preview | `grok-imagine-video-1-5-preview` | `image_urls` ≤7 (≤20MB; only 1 at 1080p) | `prompt` ≤4096; `aspect_ratio` 1:1,16:9,9:16,3:2,2:3,auto(def); `resolution` 480p(def)/720p/1080p; `duration` int 1–15 def 8 | 2.4/s (480p), 4.5/s (720p); 1080p not in feed |
| Grok Imagine Video Extend | `grok-imagine/extend` | `task_id` R (kie video task) | `prompt` R (may be ""); `extend_at` R number ≥2 def 2; `extend_times` R "6" or "10" (seconds) | 6s: 14.4 (480p)/27 (720p); 10s: 24/45 |
| Grok Imagine Video Upscale | `grok-imagine/upscale` | `task_id` R | `resolution` 720p(def)/1080p | 360→720: 10; 480→1080: 30; 720→1080: 20 |

## B5. Google Veo 3.1

**NEW market form (current docs)** — all on `POST /api/v1/jobs/createTask`, status via `/api/v1/jobs/recordInfo`:

| Task | model | input |
|---|---|---|
| Generate (T2V / I2V / first-last / reference) | `veo-3-1` | `prompt` R; `image_urls` array (1 = image-anchored, 2 = first+last frame; REFERENCE_2_VIDEO needs 1–3); `generation_type` TEXT_2_VIDEO / FIRST_AND_LAST_FRAMES_2_VIDEO / REFERENCE_2_VIDEO (reference mode: Fast & Lite only, 8s only); `aspect_ratio` 16:9(def)/9:16/Auto; `resolution` 720p(def)/1080p/4k; `duration` int 4/6/8 (def 8); `enable_translation` bool; `watermark` string; `enable_fallback` (deprecated) |
| Extend | `veo/extend` | `task_id` R (1080P-generated videos cannot be extended); `prompt` R; `seeds` int 10000–99999; `watermark` |
| Get 1080P | `veo/get-1080p-video` | `taskId` R (camelCase in doc); `index` (string in schema) |
| Get 4K | `veo/get-4k-video` | `task_id` R; `index` int def 0 |

**UNVERIFIED: how to select Quality vs Fast vs Lite in the new `veo-3-1` form** — schema has no tier field and `model` enum is only `veo-3-1` (docs still say REFERENCE_2_VIDEO "supports veo3_fast and veo3_lite"). Until confirmed, the legacy endpoint is the only documented way to pick a tier.

**LEGACY (old-model docs, still documented)**: `POST /api/v1/veo/generate`, top-level camelCase body: `prompt` R, `imageUrls`, `model` enum `veo3` (Quality) / `veo3_fast` (def) / `veo3_lite`, `generationType`, `aspect_ratio` (snake!), `callBackUrl`, `enableFallback` (deprecated), `enableTranslation`, `watermark`, `resolution` 720p/1080p/4k, `duration` 4/6/8. Verbatim example: `{"prompt": "A dog playing in a park", "imageUrls": ["http://example.com/image1.jpg", "http://example.com/image2.jpg"], "model": "veo3_fast", "watermark": "MyBrand", "callBackUrl": "http://your-callback-url.com/complete", "aspect_ratio": "16:9", "enableFallback": false, "enableTranslation": true, "generationType": "REFERENCE_2_VIDEO"}`.
Status: `GET /api/v1/veo/record-info?taskId=` → `data:{taskId, paramJson, completeTime, response:{taskId, resultUrls[], originUrls[], fullResultUrls[], resolution}, successFlag (0 generating, 1 success, 2 failed, 3 generation failed), errorCode, errorMessage, createTime, fallbackFlag (legacy)}` — covers generate, extend, 1080p and 4K tasks.
Legacy extend / get-1080p / get-4k pages (`/old-model/veo3-api/veo-extend`, `veo-get-1080p-video`, `/old-model/veo-get-4k-video`) now 404 → paths `/api/v1/veo/extend`, `/api/v1/veo/get-1080p-video` are **UNVERIFIED** in current docs.

Pricing (per video): T2V/I2V Fast 60 (720p) / 65 (1080p) / 180 (4K); Lite 30 / 35 / 150; Quality 250 / 255 / 380 (T2V 4K) / 370 (I2V 4K). Reference-to-video: Fast 60/65/180, Lite 30/35/150. Extend: Fast 60, Lite 30, Quality 250. Get 1080P: 5. Get 4K: 120.

## B6. Runway

**NEW market form**:
- Gen video: `model: "runway"` — `prompt` R (≤1800); `image_url` (optional → I2V); `duration` R number 5 or 10 (10s ⇒ no 1080p); `quality` R "720p"/"1080p"; `aspect_ratio` 16:9,4:3,1:1,3:4,9:16 (required for T2V; ignored with image); `watermark` string. Runway model generation (Gen-3/Gen-4/4.5) is NOT stated anywhere — **UNVERIFIED** (no Gen-4.5 id exists).
- Extend: `model: "runway/extend-ai-video"` — `task_id` R, `prompt` R, `quality` R 720p/1080p, `watermark`.
- Aleph (video-to-video): `model: "runway/gen4-aleph"` — `prompt` R, `video_url` R, `watermark`, `upload_cn` bool def false, `aspect_ratio` 16:9,9:16,4:3,3:4,1:1,21:9, `seed` int, `reference_image` string.

**LEGACY**: `POST /api/v1/runway/generate` (`prompt`, `imageUrl`, `duration`, `quality`, `aspectRatio`, `waterMark`, `callBackUrl`); `POST /api/v1/runway/extend` (`taskId`, `prompt`, `quality`, `waterMark`); status `GET /api/v1/runway/record-detail?taskId=` → `data:{taskId, parentTaskId, generateParam:{prompt, imageUrl, expandPrompt}, state: wait|queueing|generating|success|fail, generateTime, videoInfo:{videoId, taskId, videoUrl, imageUrl}, failCode, failMsg, expireFlag}` (links valid 14 days). Aleph legacy: `POST /api/v1/aleph/generate` (`prompt`, `videoUrl`, `waterMark`, `uploadCn`, `aspectRatio`, `seed`, `referenceImage`, `callBackUrl`); status `GET /api/v1/aleph/record-info?taskId=` → `data:{taskId, paramJson, response:{taskId, resultVideoUrl, resultImageUrl}, completeTime, createTime, successFlag, errorCode, errorMessage}`.

Pricing: 5s-720p 12; 10s-720p 30; 5s-1080p 30 (T2V and I2V). Aleph 110/video.

## B7. Alibaba Wan (video)

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| Wan 3.0 Video | `wan/3-0-video` | mutually exclusive modes: `first_frame_url` (+ optional `last_frame_url`) strings; OR reference mode `reference_image_urls` ≤10 / `reference_video_urls` ≤5 (1–15s each, total ≤15s, ≤100MB) / `reference_audio_urls` ≤5 (1–15s, total ≤15s, ≤15MB); OR `reference_file_urls` ≤1 (docx/pptx/pdf/xlsx/txt/md… ≤100MB, ≤50 pages); OR `reference_link_urls` ≤1 (public webpage). Refer as Image1/Video1/Audio1 in prompt. (Schema types these as object; examples use plain URL strings.) | `prompt` ≤20000 (required for T2V); `resolution` 480P/720P/1080P(def) (uppercase P); `aspect_ratio` adaptive(def),16:9,4:3,1:1,3:4,9:16; `duration` int 2–30 def 5 (input video + output ≤30; `-1` = auto); `audio` bool def true; `seed` | 8/s (480P), 16/s (720P), 32/s (1080P) |
| Wan 3.0 Video Prime | `wan/3-0-video-prime` | same as Wan 3.0 | same | 12.2 / 25.2 / 50.4 per s |
| Wan 2.7 T2V | `wan/2-7-text-to-video` | optional `audio_url` | `prompt` R 1–5000; `negative_prompt` ≤500; `resolution` 720p/1080p(def); **`ratio`** (not aspect_ratio) 16:9(def),9:16,1:1,4:3,3:4; `duration` int 2–15 def 5; `prompt_extend` def true; `watermark` def false; `seed` | 16/s (720p), 24/s (1080p) |
| Wan 2.7 I2V | `wan/2-7-image-to-video` | `first_frame_url`, `last_frame_url`, `first_clip_url` (video continuation), `driving_audio_url` | `prompt` R ≤5000; `negative_prompt` ≤500; `resolution` 720p/1080p(def); `duration` 2–15 def 5; `prompt_extend`; `watermark`; `seed` | 16/s, 24/s |
| Wan 2.7 Reference-to-Video | `wan/2-7-r2v` | `reference_image` array + `reference_video` array (combined ≤5, at least one); `first_frame` string; `reference_voice` (wav/mp3 1–10s ≤15MB) | `prompt` R; `negative_prompt`; `resolution` 720p/1080p(def); `aspect_ratio` 16:9(def),9:16,1:1,4:3,3:4 (ignored with first_frame); `duration` 2–10 def 5; `prompt_extend`; `watermark`; `seed` | 16/s, 24/s |
| Wan 2.7 Video Edit | `wan/2-7-videoedit` | `video_url` R (mp4/mov 2–10s, 240–4096px, ≤100MB); `reference_image` string | `prompt` optional; `negative_prompt`; `resolution`; `aspect_ratio` (omit → match input); `duration` 0 (=full) or 2–10; `audio_setting` auto/origin; `prompt_extend`; `watermark`; `seed` | 16/s, 24/s |
| Wan 2.6 T2V | `wan/2-6-text-to-video` | none | `prompt` R ≤5000; `duration` "5"/"10"/"15"; `resolution` 720p/1080p(def); `multi_shots` bool | 720p: 70/140/210; 1080p: 104.5/209.5/315 (5/10/15s) |
| Wan 2.6 I2V | `wan/2-6-image-to-video` | `image_urls` R max 1 (≥256px, ≤10MB) | same | same |
| Wan 2.6 V2V | `wan/2-6-video-to-video` | `video_urls` R max 3 (≤10MB) | `prompt` R; `duration` "5"/"10"; `resolution`; `multi_shots` | 720p 70/140; 1080p 104.5/209.5 |
| Wan 2.6 Flash I2V | `wan/2-6-flash-image-to-video` | `image_urls` R max 1 | `prompt` R ≤1500; `duration` "5"/"10"/"15"; `resolution`; `audio` R bool; `multi_shots` | not in pricing feed |
| Wan 2.6 Flash V2V | `wan/2-6-flash-video-to-video` | `video_urls` R max 3 | `prompt` R ≤1500; `duration` "5"/"10"; `resolution`; `audio`; `multi_shots` | not in feed |
| Wan 2.5 T2V | `wan/2-5-text-to-video` | none | `prompt` R ≤800; `duration` R "5"/"10"; `aspect_ratio` 16:9/9:16/1:1; `resolution` 720p/1080p; `negative_prompt` ≤500; `enable_prompt_expansion`; `seed` | 720p 60/120; 1080p 100/200 |
| Wan 2.5 I2V | `wan/2-5-image-to-video` | `image_url` R string | same minus aspect_ratio | same |
| Wan 2.2 A14B T2V Turbo | `wan/2-2-a14b-text-to-video-turbo` | none | `prompt` R ≤5000; `resolution` 480p/720p(def); `aspect_ratio` 16:9/9:16; `enable_prompt_expansion`; `seed`; `acceleration` none/regular | 5s: 40/60/80 (480/580/720p) |
| Wan 2.2 A14B I2V Turbo | `wan/2-2-a14b-image-to-video-turbo` | `image_url` R | same (no aspect) | same |
| Wan 2.2 A14B Speech-to-Video Turbo | `wan/2-2-a14b-speech-to-video-turbo` | `image_url` R + `audio_url` R | `prompt` R; `num_frames` 40–120 step 4 def 80; `frames_per_second` 4–60 def 16; `resolution` 480p(def)/580p/720p; `negative_prompt`; `seed`; `num_inference_steps` 2–40 def 27; `guidance_scale` 1–10 def 3.5; `shift` 1–10 def 5 | 12/18/24 per s |
| Wan 2.2 Animate Move | `wan/2-2-animate-move` | `video_url` R + `image_url` R (≤10MB each) | `resolution` 480p(def)/580p/720p | 6 / 9.5 / 12.5 per s |
| Wan 2.2 Animate Replace | `wan/2-2-animate-replace` | same | same | same |

## B8. HappyHorse (Alibaba)

| model id | Media | Params | Price |
|---|---|---|---|
| `happyhorse/text-to-video` | none | `prompt` R ≤5000; `resolution` 720p/1080p(def); `aspect_ratio` 16:9(def),9:16,1:1,4:3,3:4; `duration` int 3–15 def 5; `seed` | 28/s (720p), 48/s (1080p) |
| `happyhorse/image-to-video` | **`image_urls `** (doc key has a trailing space — likely typo) R, exactly 1 (≥300px, AR 1:2.5–2.5:1, ≤10MB) | `prompt` ≤5000; `resolution`; `duration` 3–15; `seed` | 28 / 48 |
| `happyhorse/reference-to-video` | `reference_image` R array 1–9 (shortest side ≥400px, ≤10MB) — referenced as character1, character2… | `prompt` R; `resolution`; `aspect_ratio` 5 values; `duration`; `seed` | 28 / 48 |
| `happyhorse/video-edit` | `video_url` R (mp4/mov 3–60s, ≤100MB); **`reference_image `** (trailing space in doc) 0–5 | `prompt` R; `resolution`; `audio_setting` auto/origin; `seed` | 28 / 48 |
| `happyhorse-1-1/text-to-video` | none | `prompt` R ≤4999; `resolution` 720p/1080p(def); `aspect_ratio` 16:9,9:16,1:1,4:3,3:4,4:5,5:4,9:21,21:9; `duration` 3–15 def 5 | 22.5/s (720p), 29/s (1080p) |
| `happyhorse-1-1/image-to-video` | `image_urls` R max 1 (≤20MB) | `prompt` ≤5000; `resolution`; `duration` 3–15 | 22.5 / 29 |
| `happyhorse-1-1/reference-to-video` | `reference_image` R ≤9 (≤20MB); reference as "[Image 1]" in prompt | `prompt` R; `resolution`; `aspect_ratio` 9 values; `duration` 3–15 | 22.5 / 29 |

## B9. PixVerse V6

| model id | Media | Params | Price (/s) |
|---|---|---|---|
| `pixverse-v6/text-to-video` | none | `prompt` R 3–5000; `aspect_ratio` R 16:9(def),4:3,1:1,3:4,9:16,2:3,3:2,21:9; `quality` R 360p/540p/720p(def)/1080p; `duration` R int 1–15 def 5; `generate_audio_switch` def false; `generate_multi_clip_switch` def false; `seed` | no audio: 4 / 5.6 / 7.2 / 14.4; with audio: 5.6 / 7.2 / 9.6 / 18.4 |
| `pixverse-v6/image-to-video` | `image_urls` R ≤2 (≤20MB) | same (no aspect_ratio) + `template_id` (enum of numeric template ids; if set, don't pass duration) | same |
| `pixverse-v6/transition` | `first_frame_image_url` R + `last_frame_image_url` R (≤20MB) | `prompt` R; `quality`; `duration` 1–15; `generate_audio_switch`; `seed` | (not separately listed; assume T2V/I2V rates — UNVERIFIED) |
| `pixverse-v6/reference-to-video` (Fusion) | `image_references` R 1–7 of `{image_url R, type: subject(def)/background, ref_name ≤30 (use @ref_name)}` | `prompt` R; `aspect_ratio` R; `quality` R; `duration` R; `generate_audio_switch`; `seed` | no audio 4.5/6.3/8.1/16.2; audio 6.3/8.1/10.8/20.7 |
| `pixverse-v6/extend` | anyOf: `taskId` (kie parent task) OR `video_url` | `prompt` R 3–5000; `duration` R 1–15; `quality` R; `generate_audio_switch`; `seed` | same as T2V rates |

## B10. Gemini Omni (Google) — video

- `gemini-omni-video` (createTask): `prompt` R ≤20000; `image_urls` ≤7 (≤20MB); `audio_ids` ≤3 (from Omni Audio); `video_list` ≤1 of `{url, start, ends}` (≤100MB, ≤30s source, clip ≤10s; uses 2 image slots); `character_ids` (from Omni Character; each uses 1 slot, 7 total); `duration` R string "4"/"6"/"8"/"10" (ignored with video input); `aspect_ratio` 16:9/9:16; `seed` 0–2147483647; `resolution` 720p(def)/1080p/4k. Price per video: no video input 4s 63, 6s 84, 8s 105, 10s 126 (720p/1080p), 4K 147/168/189/210; with video input 168 (720p/1080p) / 252 (4K).
- `google/gemini-omni-flash-1-1` (createTask): same as above plus `first_frame_url` / `last_frame_url` (mutually exclusive with image_urls/audio_ids/video_list/character_ids); `resolution` adds 360p. Same prices (360p priced like 720p).
- Helper endpoints (not createTask; synchronous): `POST /api/v1/omni/audio/create` body `{audio_id R (preset voice e.g. "achernar"), name R ≤210, voice_description ≤20000, example_dialogue ≤120}` → `data:{kieAudioId, name}`; `POST /api/v1/omni/character/create` body `{descriptions R (example uses "description"), image_urls R 1–2 [portrait, body] ≤20MB, audio_ids, character_name}` → `data:{characterId, characterName, imageUrl, bodyImageUrl}`.

## B11. Lip-sync / avatar / talking-head

| Display | model id | Media | Params | Price |
|---|---|---|---|---|
| InfiniteTalk (from audio) | `infinitalk/from-audio` | `image_url` R (≤10MB) + `audio_url` R (mp3/wav/aac/mp4/ogg ≤10MB) | `prompt` R ≤5000; `resolution` 480p(def)/720p; `seed` 10000–1000000 | 3/s (480p), 12/s (720p), up to 15s |
| InfiniteTalk (from text) | `infinitalk/from-text` | — | **playground id only, no doc** — UNVERIFIED | — |
| Kling AI Avatar Std / Pro | see B2 | | | 8/s, 16/s |
| OmniHuman 1.5 | `omnihuman-1-5` | `image_url` R (any subject, ≤10MB); `audio_url` R (<60s, rec ≤15s, ≤10MB); `mask_url` array ≤5 (from subject detection) | `prompt` ≤300 rec (max 1000); `output_resolution` "720"/"1080"(def); `pe_fast_mode` def false; `seed` def -1 | 27/s |
| OmniHuman 1.5 Human Identification | `omnihuman-1-5/human-identification` | `image_url` R (jpg/png <5MB, <4096²) | — | not in feed |
| OmniHuman 1.5 Subject Detection | `omnihuman-1-5/subject-detection` | `image_url` R (≤5MB, up to 5 subjects) → masks | — | not in feed |
| Volcengine video-to-video lip sync | `volcengine/video-to-video-lip-sync` | `video_url` R (360p–1080p, mov/mp4, ≤500MB, 24–60fps) + `audio_url` R (pure vocals ≤10MB) | `mode` R lite/basic; `separate_vocal` def false; `open_scenedet` (basic only) def false; `align_audio` (lite) def true; `align_audio_reverse` def false; `templ_start_seconds` def 0 | 8/s |
| Wan 2.2 Speech-to-Video | see B7 | | | |

## B12. Upscale (video)
- `topaz/video-upscale` — `video_url` R (mp4/mov/mkv ≤50MB); `upscale_factor` "1"/"2"(def)/"4". Price 8/s (1x/2x), 14/s (4x).
- `grok-imagine/upscale` — see B4 (only for kie Grok video tasks).
- Veo get-1080p / get-4k — see B5.

## B13. Not found / unverified (video)
- **Sora 2** family: playground lists `sora-2-text-to-video`, `sora-2-image-to-video`, `sora-2-pro-text-to-video`, `sora-2-pro-image-to-video`, `sora-2-pro-storyboard`, `sora-2-characters(-pro)`, `sora-2-*-stable`, `sora2-remix`, `sora-watermark-remover` — but NO doc pages (404) and NO pricing rows → treat as removed/unavailable.
- **Luma**: playground ids `luma-dream-machine/modify`, `luma-dream-machine/ray-2-flash-reframe` — no docs, no pricing → UNVERIFIED.
- **Kling O1** (`kling-o1/*`) — playground only, UNVERIFIED.
- **Hunyuan video**, **Midjourney video**, **Runway Gen-4.5**, **Veo 3.1 separate model ids** (e.g. `veo3_quality`): not present.
- **Kling 3.0 Omni** pricing not in feed (may bill like Kling 3.0 — UNVERIFIED).

---

# APPENDIX 1 — Verbatim doc example request bodies (createTask)

Extracted programmatically from each page's OpenAPI `example`/`examples` (JSON re-serialized, content unchanged; Seedance 2.5's trailing comma removed so it parses). Doc URL = `https://docs.kie.ai/<path>.md`.

### `4o-image-api/generate-4-o-image`
```json
{"model": "4o-image-api", "callBackUrl": "https://your-callback-url.com/callback", "input": {"files_url": ["https://example.com/image.png"], "prompt": "A beautiful sunset over the mountains", "size": "1:1", "isEnhance": false, "uploadCn": false, "enableFallback": false, "fallbackModel": "FLUX_MAX"}}
```
```json
{"model": "custom_4o_image", "callBackUrl": "https://your-callback-url.com/callback", "input": {"files_url": ["https://example.com/image.png"], "prompt": "A beautiful sunset over the mountains", "size": "1:1", "isEnhance": false, "uploadCn": false, "enableFallback": false, "fallbackModel": "FLUX_MAX"}}
```

### `flux-kontext-api/generate-or-edit-image`
```json
{"model": "flux1-kontext", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene mountain landscape at sunset with a lake reflecting the orange sky", "enable_translation": true, "aspect_ratio": "16:9", "output_format": "jpeg", "prompt_upsampling": false}}
```
```json
{"model": "custom_flux_kontext", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene mountain landscape at sunset with a lake reflecting the orange sky", "enable_translation": true, "aspect_ratio": "16:9", "output_format": "jpeg", "prompt_upsampling": false}}
```

### `market/bytedance/seedance-1-5-pro`
```json
{"model": "bytedance/seedance-1.5-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky", "input_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/example1.png"], "aspect_ratio": "1:1", "resolution": "720p", "duration": 8, "fixed_lens": false, "generate_audio": false, "nsfw_checker": false}}
```

### `market/bytedance/seedance-2`
```json
{"model": "bytedance/seedance-2", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky", "first_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example2.png", "last_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example3.png", "reference_image_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.png"], "reference_video_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp4"], "reference_audio_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp3"], "return_last_frame": false, "generate_audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 15, "web_search": false}}
```

### `market/bytedance/seedance-2-5`
```json
{"model": "bytedance/seedance-2-5", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky", "reference_image_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.png"], "reference_video_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp4"], "reference_audio_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp3"], "return_last_frame": false, "generate_audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 15}}
```

### `market/bytedance/seedance-2-fast`
```json
{"model": "bytedance/seedance-2-fast", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky", "first_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example2.png", "last_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example3.png", "reference_image_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.png"], "reference_video_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp4"], "reference_audio_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp3"], "return_last_frame": false, "generate_audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 15, "web_search": false}}
```

### `market/bytedance/seedance-2-mini`
```json
{"model": "bytedance/seedance-2-mini", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A serene beach at sunset with waves gently crashing on the shore, palm trees swaying in the breeze, and seagulls flying across the orange sky", "first_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example2.png", "last_frame_url": "https://templateb.aiquickdraw.com/custom-page/akr/section-images/example3.png", "reference_image_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.png"], "reference_video_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp4"], "reference_audio_urls": ["https://templateb.aiquickdraw.com/custom-page/akr/section-images/example1.mp3"], "return_last_frame": false, "generate_audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 15, "web_search": false}}
```

### `market/bytedance/v1-lite-image-to-video`
```json
{"model": "bytedance/v1-lite-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Multiple shots. A traveler crosses an endless desert toward a glowing archway. [Cut to] His cloak whips in the wind as he reaches the massive stone threshold. [Wide shot] He steps through — and vanishes into a burst of light", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17550783375205e9woshz.png", "resolution": "720p", "duration": "5", "camera_fixed": false, "seed": -1, "enable_safety_checker": true, "end_image_url": "", "nsfw_checker": false}}
```

### `market/bytedance/v1-lite-text-to-video`
```json
{"model": "bytedance/v1-lite-text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Wide-angle shot: A serene sailing boat gently sways in the harbor at dawn, surrounded by soft Impressionist hues of pink and orange with ivory accents. The camera slowly pans across the scene, capturing the delicate reflections on the water and the intricate details of the boat's sails as the light gradually brightens.", "aspect_ratio": "16:9", "resolution": "720p", "duration": "5", "camera_fixed": false, "seed": 91466377, "enable_safety_checker": true, "nsfw_checker": false}}
```

### `market/bytedance/v1-pro-fast-image-to-video`
```json
{"model": "bytedance/v1-pro-fast-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cinematic close-up sequence of a single elegant ceramic coffee cup with saucer on a rustic wooden table near a sunlit window, hot rich espresso poured in a thin golden stream from above, gradually filling the cup in distinct stages: empty with faint steam, 1/4 filled with dark crema, half-filled with swirling coffee and rising steam, 3/4 filled nearing the rim, perfectly full just below overflow with glossy surface and soft bokeh highlights; ultra-realistic, warm golden-hour light, shallow depth of field, photorealism, detailed textures, subtle steam wisps, serene inviting atmosphere --ar 16:9 --q 2 --style raw", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1762340693669m6sey187.webp", "resolution": "720p", "duration": "5", "nsfw_checker": true}}
```

### `market/bytedance/v1-pro-image-to-video`
```json
{"model": "bytedance/v1-pro-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A golden retriever dashing through shallow surf at the beach, back angle camera low near waterline, splashes frozen in time, blur trails in waves and paws, afternoon sun glinting off wet fur, overcast day, dramatic clouds", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755179021328w1nhip18.webp", "resolution": "720p", "duration": "5", "camera_fixed": false, "seed": -1, "enable_safety_checker": true, "nsfw_checker": true}}
```

### `market/bytedance/v1-pro-text-to-video`
```json
{"model": "bytedance/v1-pro-text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A boy with curly hair and a backpack rides a bike down a golden-lit rural road at sunset.\n[Cut to] He slows down and looks toward a field of tall grass.\n[Wide shot] His silhouette halts in the orange haze.", "aspect_ratio": "16:9", "resolution": "720p", "duration": "5", "camera_fixed": false, "seed": -1, "enable_safety_checker": true, "nsfw_checker": false}}
```

### `market/flux2/flex-image-to-image`
```json
{"model": "flux-2/flex-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"input_urls": ["https://static.aiquickdraw.com/tools/example/1764235158281_tABmx723.png", "https://static.aiquickdraw.com/tools/example/1764235165079_8fIR5MEF.png"], "prompt": "Replace the can in image 2 with the can from image 1", "aspect_ratio": "1:1", "resolution": "1K", "nsfw_checker": false}}
```

### `market/flux2/flex-text-to-image`
```json
{"model": "flux-2/flex-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A humanoid figure with a vintage television set for a head, featuring a green-tinted screen displaying a `Hello FLUX.2` writing in ASCII font. The figure is wearing a yellow raincoat, and there are various wires and components attached to the television. The background is cloudy and indistinct, suggesting an outdoor setting", "aspect_ratio": "1:1", "resolution": "1K", "nsfw_checker": false}}
```

### `market/flux2/pro-image-to-image`
```json
{"model": "flux-2/pro-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"input_urls": ["https://static.aiquickdraw.com/tools/example/1764235041265_kjJ2sTMR.png", "https://static.aiquickdraw.com/tools/example/1764235045490_9SjAUr4Z.png"], "prompt": "The jar in image 1 is filled with capsules exactly same as image 2 with the exact logo", "aspect_ratio": "1:1", "resolution": "1K", "nsfw_checker": false}}
```

### `market/flux2/pro-text-to-image`
```json
{"model": "flux-2/pro-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Hyperrealistic supermarket blister pack on clean olive green surface. No shadows. Inside: bright pink 3D letters spelling \"FLUX.2\" pressing against stretched plastic film, creating realistic deformation and reflective highlights. Bottom left corner: barcode sticker with text \"GENERATE NOW\" and \"PLAYGROUND\". Plastic shows tension wrinkles and realistic shine where stretched by the volumetric letters.", "aspect_ratio": "1:1", "resolution": "1K", "nsfw_checker": false}}
```

### `market/gemini-omni-video`
```json
{"model": "gemini-omni-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Create a futuristic night city short film with a slow push-in shot as the character walks out from a neon-lit street.", "image_urls": ["https://example.com/assets/scene-1.png", "https://example.com/assets/scene-2.png"], "audio_ids": ["audio_01hx8p0demo"], "video_list": [{"url": "https://example.com/assets/source-video.mp4", "start": 0, "ends": 10}], "duration": "4"}}
```

### `market/google/gemini-omni-flash-1-1`
```json
{"model": "google/gemini-omni-flash-1-1", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Create a futuristic night city short film with a slow push-in shot as the character walks out from a neon-lit street.", "image_urls": ["https://example.com/assets/scene-1.png", "https://example.com/assets/scene-2.png"], "audio_ids": ["audio_01hx8p0demo"], "video_list": [{"url": "https://example.com/assets/source-video.mp4", "start": 0, "ends": 10}], "duration": "4"}}
```

### `market/google/imagen4`
```json
{"model": "google/imagen4", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A lively comic scene where two colleagues are in an office. The first person says, 'Have you heard about Google Imagen 4 Ultra?' The second person responds with excitement, 'It’s the best text-to-image tool out there!' The first person asks again, 'Do you know where to get the API?' The second person smiles and says, 'Kie.ai has it!' In the final panel, the two look at a screen showing Kie.ai’s interface with an API option, with bright and colorful comic-style illustrations.", "negative_prompt": "", "aspect_ratio": "1:1", "seed": ""}}
```

### `market/google/imagen4-fast`
```json
{"model": "google/imagen4-fast", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Create a cinematic, photorealistic medium shot capturing the nostalgic warmth of a late 90s indie film. The focus is a young woman with brightly dyed pink hair (slightly faded) and freckled skin, looking directly and intently into the camera lens with a hopeful yet slightly uncertain smile. She wears an oversized, vintage band t-shirt (slightly worn, with the faintly cracked white text “KIE AI” across the chest) layered over a long-sleeved striped top, along with simple silver stud earrings. The lighting is soft, golden hour sunlight streaming through a slightly dusty window, creating lens flare and illuminating dust motes in the air. The background shows a blurred, cluttered bedroom with posters on the wall and fairy lights, rendered with a shallow depth of field. Natural film grain, a warm, slightly muted color palette, and sharp focus on her expressive eyes enhance the intimate, authentic feel.", "negative_prompt": "", "aspect_ratio": "16:9"}}
```

### `market/google/imagen4-ultra`
```json
{"model": "google/imagen4-ultra", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A lively comic scene where two colleagues are in an office. The first person says, 'Have you heard about Google Imagen 4 Ultra?' The second person responds with excitement, 'It’s the best text-to-image tool out there!' The first person asks again, 'Do you know where to get the API?' The second person smiles and says, 'Kie.ai has it!' In the final panel, the two look at a screen showing Kie.ai’s interface with an API option, with bright and colorful comic-style illustrations.", "negative_prompt": "", "aspect_ratio": "1:1", "seed": ""}}
```

### `market/google/nano-banana`
```json
{"model": "google/nano-banana", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A surreal painting of a giant banana floating in space, stars and galaxies in the background, vibrant colors, digital art", "output_format": "png", "aspect_ratio": "1:1"}}
```

### `market/google/nano-banana-2-lite`
```json
{"model": "nano-banana-2-lite", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png"], "prompt": "Generate a pig on the grass, cinematic light", "aspect_ratio": "auto"}}
```

### `market/google/nano-banana-edit`
```json
{"model": "google/nano-banana-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "turn this photo into a character figure. Behind it, place a box with the character’s image printed on it, and a computer showing the Blender modeling process on its screen. In front of the box, add a round plastic base with the character figure standing on it. set the scene indoors if possible", "image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png"], "output_format": "png", "aspect_ratio": "1:1"}}
```

### `market/google/nanobanana2`
```json
{"model": "nano-banana-2", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Comic poster: cool banana hero in shades leaps from sci-fi pad. Six panels: 1) 4K mountain landscape, 2) banana holds page of long multilingual text with auto translation, 3) Gemini 3 hologram for search/knowledge/reasoning, 4) camera UI sliders for angle focus color, 5) frame trio 1:1-9:16, 6) consistent banana poses. Footer shows Google icons. Tagline: Nano Banana Pro now on Kie AI.", "image_input": [], "aspect_ratio": "auto", "resolution": "1K", "output_format": "png"}}
```

### `market/google/pro-image-to-image`
```json
{"model": "nano-banana-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Comic poster: cool banana hero in shades leaps from sci-fi pad. Six panels: 1) 4K mountain landscape, 2) banana holds page of long multilingual text with auto translation, 3) Gemini 3 hologram for search/knowledge/reasoning, 4) camera UI sliders for angle focus color, 5) frame trio 1:1-9:16, 6) consistent banana poses. Footer shows Google icons. Tagline: Nano Banana Pro now on Kie AI.", "image_input": [], "aspect_ratio": "1:1", "resolution": "1K", "output_format": "png"}}
```

### `market/gpt-image/1-5-image-to-image`
```json
{"model": "gpt-image/1.5-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"input_urls": ["https://static.aiquickdraw.com/tools/example/1765962794374_GhtqB9oX.webp"], "prompt": "Edit the image to dress the woman using the provided clothing images. Preserve her exact likeness, expression, hairstyle, and proportions. Replace only the clothing, fitting the garments naturally to her existing pose and body geometry with realistic fabric behavior. Match lighting, shadows, and color temperature to the original photo so the outfit integrates photorealistically, without looking pasted on.", "aspect_ratio": "3:2", "quality": "medium"}}
```

### `market/gpt-image/1-5-text-to-image`
```json
{"model": "gpt-image/1.5-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Create a photorealistic candid photograph of an elderly sailor standing on a small fishing boat.  He has weathered skin with visible wrinkles, pores, and sun texture, and a few faded traditional sailor tattoos on his arms. He is calmly adjusting a net while his dog sits nearby on the deck. Shot like a 35mm film photograph, medium close-up at eye level, using a 50mm lens. The image should feel honest and unposed, with real skin texture, worn materials, and everyday detail. No glamorization, no heavy retouching. ", "aspect_ratio": "1:1", "quality": "medium"}}
```

### `market/gpt/gpt-image-2-5-flare-image-to-image`
```json
{"model": "gpt-image-2-5-flare-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Transform this product image into a premium e-commerce poster style.", "input_urls": ["https://example.com/"], "aspect_ratio": "auto", "resolution": "4K", "background": "transparent"}}
```

### `market/gpt/gpt-image-2-5-flare-text-to-image`
```json
{"model": "gpt-image-2-5-flare-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cinematic night city poster with neon reflections on a rainy street.", "aspect_ratio": "3:2", "resolution": "1K", "background": "transparent"}}
```

### `market/gpt/gpt-image-2-5-sunburst-image-to-image`
```json
{"model": "gpt-image-2-5-sunburst-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Transform this product image into a premium e-commerce poster style.", "input_urls": ["https://example.com/"], "aspect_ratio": "auto", "resolution": "4K", "background": "opaque"}}
```

### `market/gpt/gpt-image-2-5-sunburst-text-to-image`
```json
{"model": "gpt-image-2-5-sunburst-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cinematic night city poster with neon reflections on a rainy street.", "aspect_ratio": "4:3", "resolution": "2K", "background": "opaque"}}
```

### `market/gpt/gpt-image-2-image-to-image`
```json
{"model": "gpt-image-2-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "take a photo with Sam Altman in the conference room", "input_urls": ["https://static.aiquickdraw.com/tools/example/1776782793756_wrogXTdd.png"], "aspect_ratio": "auto"}}
```

### `market/gpt/gpt-image-2-text-to-image`
```json
{"model": "gpt-image-2-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cinematic night city poster with neon reflections on a rainy street.", "aspect_ratio": "auto"}}
```

### `market/grok-imagine-image-2-0/image-edit`
```json
{"model": "grok-imagine-image-2-0/segment-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Change the background to a sunset beach while preserving the subject.", "task_id": "task_grok_imagine_1234567890", "mask_indexs": [1, 2]}}
```

### `market/grok-imagine-image-2-0/image-to-image`
```json
{"model": "grok-imagine-image-2-0/image-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Recreate the Titanic movie poster with two adorable anthropomorphic cats in the same romantic pose at the bow of the ship. The male cat is an orange tabby wearing a vest, standing behind a white long-haired female cat in a lace dress, holding her paws as they stretch forward in the wind. Both cats are photorealistic with detailed fur, wind-swept hair, and dramatic sunset lighting (warm golden highlights, cool blue shadows). Background: the Titanic ship at dusk with four smokestacks, glowing deck lights, calm ocean, and orange-pink sunset sky. Center title: “CATANIC” in the same gold metallic serif style as Titanic, same size and position.", "aspect_ratio": "1:1", "image_urls": ["https://static.aiquickdraw.com/tools/example/1767602105243_0MmMCrwq.png"]}}
```

### `market/grok-imagine-image-2-0/segment-map`
```json
{"model": "grok-imagine-image-2-0/segment-map", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "task_grok_imagine_1765180586443"}}
```

### `market/grok-imagine-image-2-0/text-to-image`
```json
{"model": "grok-imagine-image-2-0/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "aspect_ratio": "1:1"}}
```

### `market/grok-imagine/1-5-preview`
```json
{"model": "grok-imagine-video-1-5-preview", "input": {"prompt": "Describe the scene you want to generate.", "image_urls": ["https://your-domain.com/image/example.png"], "aspect_ratio": "16:9", "resolution": "480p", "duration": 8}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/grok-imagine/extend`
```json
{"model": "grok-imagine/extend", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "task_grok_12345678", "prompt": "", "extend_at": 2, "extend_times": "6"}}
```
```json
{"model": "grok-imagine/upscale", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "task_grok_12345678"}}
```

### `market/grok-imagine/image-to-image`
```json
{"model": "grok-imagine/image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Recreate the Titanic movie poster with two adorable anthropomorphic cats in the same romantic pose at the bow of the ship. The male cat is an orange tabby wearing a vest, standing behind a white long-haired female cat in a lace dress, holding her paws as they stretch forward in the wind. Both cats are photorealistic with detailed fur, wind-swept hair, and dramatic sunset lighting (warm golden highlights, cool blue shadows). Background: the Titanic ship at dusk with four smokestacks, glowing deck lights, calm ocean, and orange-pink sunset sky. Center title: “CATANIC” in the same gold metallic serif style as Titanic, same size and position.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1767602105243_0MmMCrwq.png"]}}
```

### `market/grok-imagine/image-to-video`
```json
{"model": "grok-imagine/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "task_grok_12345678", "image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1762247692373tw5di116.png"], "prompt": "POV hand comes into frame handing the girl a cup of take away coffee, the girl steps out of the screen looking tired, then takes it and she says happily: \"thanks! Back to work\" she exits the frame and walks right to a different part of the office.", "mode": "normal", "duration": "6", "resolution": "480p", "aspect_ratio": "16:9"}}
```
```json
{"model": "grok-imagine/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1762247692373tw5di116.png"], "prompt": "POV hand comes into frame handing the girl a cup of take away coffee, the girl steps out of the screen looking tired, then takes it and she says happily: \"thanks! Back to work\" she exits the frame and walks right to a different part of the office.", "mode": "normal"}}
```

### `market/grok-imagine/text-to-image`
```json
{"model": "grok-imagine/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Cinematic portrait of a woman sitting by a vinyl record player, retro living room background, soft ambient lighting, warm earthy tones, nostalgic 1970s wardrobe, reflective mood, gentle film grain texture, shallow depth of field, vintage editorial photography style.", "aspect_ratio": "3:2"}}
```

### `market/grok-imagine/text-to-video`
```json
{"model": "grok-imagine/text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A couple of doors open to the right one by one randomly and stay open, to show the inside, each is either a living room, or a kitchen, or a bedroom or an office, with little people living inside.", "aspect_ratio": "2:3", "mode": "normal", "duration": "6", "resolution": "480p"}}
```
```json
{"model": "grok-imagine/text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A couple of doors open to the right one by one randomly and stay open, to show the inside, each is either a living room, or a kitchen, or a bedroom or an office, with little people living inside.", "aspect_ratio": "2:3", "mode": "normal"}}
```

### `market/grok-imagine/upscale`
```json
{"model": "grok-imagine/upscale", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "task_grok_12345678"}}
```

### `market/hailuo/02-image-to-video-pro`
```json
{"model": "hailuo/02-image-to-video-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Cinematic wide shot: A colossal starship drifts silently above the rings of Saturn, its metallic hull reflecting streaks of cosmic light. The camera pushes closer, revealing thousands of illuminated windows like a floating city. Smaller fighter crafts dart across the frame, leaving neon trails as they maneuver through the vastness of space. A sudden burst of thrusters scatters asteroid fragments in slow motion, glowing faintly as they collide and drift apart.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17585210783150ispzfo7.png", "end_image_url": "", "prompt_optimizer": true}}
```

### `market/hailuo/02-image-to-video-standard`
```json
{"model": "hailuo/02-image-to-video-standard", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Epic aerial shot: A lone samurai stands atop a jagged mountain peak as a storm of sakura petals is swept across the wind. Behind him, the sky is split in two — half daylight, half night. The shot pulls back to reveal that the mountain is actually the curved back of a sleeping dragon that spans across the horizon. Lightning crackles in the distance as the dragon's eye slowly opens, glowing with ancient magic. The samurai doesn’t flinch; he lowers his straw hat and places his hand on the hilt of his blade.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17585207681646umf3lz8.png", "end_image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1758521423357w8586uq8.png", "duration": "10", "resolution": "768P", "prompt_optimizer": true}}
```

### `market/hailuo/02-text-to-video-pro`
```json
{"model": "hailuo/02-text-to-video-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "High top angle wide mid close-up tracking shot, flying very fast two meters high over prehistoric ferns and moss-covered ground, dominated by a real young boy (pink t-shirt, pink shorts, white shoes, white long socks), with his back to the camera, body stretched out, gliding smoothly forward, flying in the air, casting a clear shadow on the terrain below. His legs and body are high above the surface, his feet not touching the ground, soaring in a Superman pose. The background is a vast Jurassic valley, filled with dense, ancient jungle vegetation and towering cycads. In the distance, rugged volcanic mountains rise with a winding path cutting through. Massive, slow-moving sauropods graze far off on the horizon. Large, fluffy white clouds float in the vibrant blue sky. Strong dynamic motion blur adds a vivid sense of high-speed flight and deep cinematic perspective. Realistic image –raw.", "prompt_optimizer": true}}
```

### `market/hailuo/02-text-to-video-standard`
```json
{"model": "hailuo/02-text-to-video-standard", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A llama and a raccoon battle it out in an intense table tennis match, inside a roaring Olympic stadium. Slow-mo, wild angles, full comedy mode.", "duration": "6", "prompt_optimizer": true}}
```

### `market/hailuo/2-3-image-to-video-pro`
```json
{"model": "hailuo/2-3-image-to-video-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A graceful geisha performs a traditional Japanese dance indoors. She wears a luxurious red kimono with golden floral embroidery, white obi belt, and white tabi socks. Soft and elegant hand movements, expressive pose, sleeves flowing naturally. Scene set in a Japanese tatami room with warm ambient lighting, shoji paper sliding doors, and cherry blossom branches hanging in the foreground. Cinematic, soft depth of field, high detail fabric texture, hyper-realistic, smooth motion.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1761736831884xl56xfiw.webp", "duration": "6", "resolution": "768P"}}
```

### `market/hailuo/2-3-image-to-video-standard`
```json
{"model": "hailuo/2-3-image-to-video-standard", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Two armored medieval knights clash in an intense duel at sunset, cinematic lighting.  Metal armor reflects warm golden light from the sun and the glowing swords. Sparks explode as the swords collide. Dynamic camera movement, shallow depth of field, dramatic slow motion. The scene takes place in an open desert battlefield, dust in the air, warm orange sun behind them, epic atmosphere.  Highly detailed armor textures, realistic reflections, volumetric lighting, cinematic quality.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1761736401898mpm67du5.webp", "duration": "6", "resolution": "768P"}}
```

### `market/happyhorse-1-1/image-to-video`
```json
{"model": "happyhorse-1-1/image-to-video", "input": {"image_urls": ["https://static.aiquickdraw.com/tools/example/1782114387854_IufKnPxR.png"], "prompt": "A cat running on the grass", "resolution": "1080p", "duration": 5}}
```

### `market/happyhorse-1-1/reference-to-video`
```json
{"model": "happyhorse-1-1/reference-to-video", "input": {"reference_image": ["https://static.aiquickdraw.com/tools/example/1782114387854_IufKnPxR.png"], "prompt": "A cat running on the grass", "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5}}
```

### `market/happyhorse-1-1/text-to-video`
```json
{"model": "happyhorse-1-1/text-to-video", "input": {"prompt": "A dog running on the earth", "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5}}
```

### `market/happyhorse/image-to-video`
```json
{"model": "happyhorse/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cat running on the grass", "image_urls": ["https://loremflickr.com/400/400?lock=4153750340434616"], "resolution": "1080p", "duration": 5, "seed": 1546095068}}
```

### `market/happyhorse/reference-to-video`
```json
{"model": "happyhorse/reference-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A woman in a red qipao character1. The shot opens with a side medium view outlining the tailored fit of the qipao and S-curve silhouette, then cuts to a low-angle shot capturing her gracefully unfolding a folding fan character2, with tassel earrings character3 swaying lightly as she turns her head. Finally, the camera pushes into a facial close-up, freezing on her fingertips lightly touching the fan ribs and the subtle, reserved charm in her expressive gaze. Through multiple angles, it comprehensively showcases an aura of Eastern elegance.", "reference_image": ["https://loremflickr.com/400/400?lock=8132663902229376", "https://loremflickr.com/400/400?lock=1716016437146867"], "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5, "seed": 1308038620}}
```

### `market/happyhorse/text-to-video`
```json
{"model": "happyhorse/text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A miniature city built from cardboard and bottle caps comes to life at night. A cardboard train slowly passes through, with small lights dotting the scene and illuminating the way ahead.", "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5, "seed": 1622429582}}
```

### `market/happyhorse/video-edit`
```json
{"model": "happyhorse/video-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Make the horse-headed humanoid character in the video wear the striped sweater from the image", "video_url": "https://hollow-joy.info/", "reference_image ": ["https://loremflickr.com/400/400?lock=3320229742640740", "https://loremflickr.com/400/400?lock=390084853871038", "https://loremflickr.com/400/400?lock=4205160298467577", "https://loremflickr.com/400/400?lock=7626507781317900", "https://loremflickr.com/400/400?lock=2804855355708229"], "resolution": "1080p", "audio_setting": "auto", "seed": 1764574909}}
```

### `market/ideogram/character`
```json
{"model": "ideogram/character", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Place the woman from the uploaded portrait, wearing a casual white blouse, in a peaceful garden setting. The scene should feature vibrant green plants and colorful flowers, with soft sunlight filtering through the leaves. She should be sitting on a wooden bench, holding a book and smiling gently. The background should be filled with lush greenery, with a serene, tranquil atmosphere. Golden afternoon light should highlight the woman’s face and create soft shadows on the ground, adding a peaceful, reflective mood to the scene", "reference_image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1755767145415pvz49dpi.webp"], "rendering_speed": "BALANCED", "style": "AUTO", "expand_prompt": true, "num_images": "1", "image_size": "square_hd", "negative_prompt": ""}}
```

### `market/ideogram/character-edit`
```json
{"model": "ideogram/character-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A fabulous look head tilted down, looking forward with a smile\n", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17557680349256sa0lk53.webp", "mask_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755768046014ftgvma28.webp", "reference_image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1755768064644jodsmfhq.webp"], "rendering_speed": "BALANCED", "style": "AUTO", "expand_prompt": true, "num_images": "1"}}
```

### `market/ideogram/character-remix`
```json
{"model": "ideogram/character-remix", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A fisheye lens selfie photograph taken at night on an urban street. The image is circular with a black border and shows a person wearing dark sunglasses and a black jacket, holding a silver digital camera up to capture the reflection. The background shows a row of shuttered storefronts with red neon lighting visible in the upper portion. The street is empty and dark, with street lights creating a warm glow along the sidewalk. The fisheye effect creates a curved, distorted perspective that bends the straight lines of the street and buildings. The lighting is predominantly red and dark, creating a moody urban atmosphere. The person's reflection shows long dark hair and is positioned in the center of the circular frame. Multiple storefront shutters are visible in the background, creating a repeating pattern of horizontal lines. The overall composition has a cinematic quality with strong contrast between the dark street and the illuminated storefronts above.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755768466167d0tiuc6e.webp", "reference_image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1755768479029sugx0g6f.webp"], "rendering_speed": "BALANCED", "style": "AUTO", "expand_prompt": true, "image_size": "square_hd", "num_images": "1", "strength": 0.8, "negative_prompt": "", "image_urls": [], "reference_mask_urls": ""}}
```

### `market/ideogram/v3-edit`
```json
{"model": "ideogram/v3-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A dog wearing a cowboy hat", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755076859801ryyol1du.webp", "mask_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755076871089hx9uonhc.webp", "rendering_speed": "BALANCED", "expand_prompt": true, "seed": 123456}}
```

### `market/ideogram/v3-remix`
```json
{"model": "ideogram/v3-remix", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Change the cube into a sphere", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17550782013854ykfihxv.webp", "rendering_speed": "BALANCED", "style": "AUTO", "expand_prompt": true, "image_size": "square_hd", "num_images": "1", "seed": 123456, "strength": 0.8, "negative_prompt": "blurry, low quality, distorted, watermark"}}
```

### `market/ideogram/v3-text-to-image`
```json
{"model": "ideogram/v3-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A cinematic photograph of a tranquil lakeside at twilight, viewed from a slight elevation. In the center, a cluster of softly glowing reeds and water lilies emit a gentle golden light, their reflections shimmering on the calm surface. The elegant neon-style white text 'Kie.ai' hovers just above the water, subtly illuminated and harmonizing with the natural glow. Surrounding willows and drifting mist frame the scene, creating a serene yet magical atmosphere, with warm highlights contrasting against the cool blues of the evening sky.", "rendering_speed": "BALANCED", "style": "AUTO", "expand_prompt": true, "image_size": "square_hd", "seed": 123456, "negative_prompt": "blurry, low detail, distorted anatomy, extra limbs, malformed text, watermark"}}
```

### `market/infinitalk/from-audio`
```json
{"model": "infinitalk/from-audio", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1757329269873ggqj2hz3.png", "audio_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1757329255705mmqwrnri.mp3", "prompt": "A young woman with long dark hair talking on a podcast.", "resolution": "480p"}}
```

### `market/kling/ai-avatar-pro`
```json
{"model": "kling/ai-avatar-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/175792685809077e8h8k3.png", "audio_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1757925802302srqfkcqh.mp3", "prompt": ""}}
```

### `market/kling/ai-avatar-standard`
```json
{"model": "kling/ai-avatar-standard", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17579268936223zs9l3dt.png", "audio_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17579258340109gghun47.mp3", "prompt": ""}}
```

### `market/kling/image-to-video`
```json
{"model": "kling-2.6/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "In a bright rehearsal room, sunlight streams through the windows, and a standing microphone is placed in the center of the room. [Campus band female lead singer] stands in front of the microphone with her eyes closed, and other members stand around her. [Campus band female lead singer, singing loudly] Lead vocal: \"I will do my best to heal you, with all my heart and soul...\" The background is a cappella harmonies, and the camera slowly pans around the band members.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1764851002741_i0lEiI8I.png"], "sound": false, "duration": "5"}}
```

### `market/kling/kling-3-0`
```json
{"model": "kling-3.0/video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "In a bright rehearsal room, sunlight streams through the window @element_dog", "image_urls": ["https://static.aiquickdraw.com/tools/example/1764851002741_i0lEiI8I.png"], "sound": true, "duration": "5", "aspect_ratio": "16:9", "mode": "pro", "multi_shots": false, "multi_prompt": [{"prompt": "a happy dog in running @element_cat", "duration": 3}, {"prompt": "a happy dog play with a cat @element_dog", "duration": 2}], "kling_elements": [{"name": "element_dog", "description": "dog", "element_input_urls": ["https://tempfileb.aiquickdraw.com/kieai/market/1770361808044_4RfUUJrI.jpeg", "https://tempfileb.aiquickdraw.com/kieai/market/1770361848336_ABQqRHBi.png"], "element_input_audio_urls": ["https://your-cdn.com/wjeoiajfosijfoi.mp3"]}, {"name": "element_cat", "description": "cat", "element_input_urls": ["https://your-cdn.com/element_image.mp4"], "element_input_audio_urls": ["https://your-cdn.com/wjeoiajfosijfoi.mp3"], "start_time": 0, "end_time": 8000}]}}
```

### `market/kling/motion-control`
```json
{"model": "kling-2.6/motion-control", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The cartoon character is dancing.", "input_urls": ["https://static.aiquickdraw.com/tools/example/1767694885407_pObJoMcy.png"], "video_urls": ["https://static.aiquickdraw.com/tools/example/1767525918769_QyvTNib2.mp4"], "mode": "720p", "character_orientation": "image"}}
```

### `market/kling/motion-control-v3`
```json
{"model": "kling-3.0/motion-control", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The cartoon character is dancing.", "input_urls": ["https://static.aiquickdraw.com/tools/example/1767694885407_pObJoMcy.png"], "video_urls": ["https://static.aiquickdraw.com/tools/example/1767525918769_QyvTNib2.mp4"], "mode": "720p", "character_orientation": "image", "background_source": "input_video"}}
```

### `market/kling/text-to-video`
```json
{"model": "kling-2.6/text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Scene: A fashion live-streaming sales setting, with clothes hanging on racks and the host's figure reflected in a full-length mirror. Lines: [African female host] turns around to showcase the hoodie's cut. [African female host, in a cheerful tone] says: \"360-degree flawless tailoring, slimming and versatile.\" She then [African female host] leans closer to the camera. [African female host, in a lively tone] says: \"Double-sided fleece fabric, $30 off immediately when you order now.\"", "sound": false, "aspect_ratio": "1:1", "duration": "5"}}
```

### `market/kling/v2-1-master-image-to-video`
```json
{"model": "kling/v2-1-master-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A team of paratroopers descends into enemy territory, as they pass through clouds, the camera switches to a slow pan above the battlefield lighting up with", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755256297923kmjpynul.png", "duration": "5", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5}}
```

### `market/kling/v2-1-master-text-to-video`
```json
{"model": "kling/v2-1-master-text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "First-person view from a soldier jumping from a transport plane — the camera shakes with turbulence, oxygen mask reflections flicker — as the clouds part, the battlefield below pulses with anti-air fire and missile trails.", "duration": "5", "aspect_ratio": "16:9", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5}}
```

### `market/kling/v2-1-pro`
```json
{"model": "kling/v2-1-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "POV shot of a gravity surfer diving between ancient ruins suspended midair, glowing moss lights the path, the board hisses as it carves through thin mist, echoes rise with speed ", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1754892534386c8wt0qfs.png", "duration": "5", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5, "tail_image_url": ""}}
```

### `market/kling/v2-1-standard`
```json
{"model": "kling/v2-1-standard", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Begin with the uploaded image as the first frame. Gradually animate the scene: steam rises and drifts upward from the train; lantern lights flicker subtly; cloaked figures begin to move slowly — walking, turning, adjusting their belongings. Floating dust or magical particles catch the light. The text “KLING 2.1 STANDARD API — Now on Kie.ai” softly pulses with a golden glow. The camera pushes forward slightly, then slowly fades to black.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755256596169mkkwr2ag.png", "duration": "5", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5}}
```

### `market/kling/v25-turbo-text-to-video-pro`
```json
{"model": "kling/v2-5-turbo-text-to-video-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Real-time playback. Wide shot of a ruined city: collapsed towers, fires blazing, storm clouds with lightning. Camera drops fast from the sky over burning streets and tilted buildings. Smoke and dust fill the air. A lone hero walks out of the ruins, silhouetted by fire. Camera shifts front: his face is dirty with dust and sweat, eyes firm, a faint smile. Wind blows, debris rises. Extreme close-up: his eyes reflect the approaching enemy. Music and drums hit. Final wide shot: fire forms a blazing halo behind him — reborn in flames with epic cinematic vibe.", "duration": "5", "aspect_ratio": "16:9", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5}}
```

### `market/kling/v3-omni-image-to-video`
```json
{"model": "kling-3.0-omni/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A happy golden retriever running across a grassy field", "image_urls": ["https://example.com/first-frame.jpg"], "customize_multi_shots": true, "audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 5, "elements": []}}
```
```json
{"model": "kling-3.0-omni/image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A happy golden retriever running across a grassy field", "image_urls": ["https://example.com/first-frame.jpg", "https://example.com/last-frame.jpg"], "customize_multi_shots": false, "audio": false, "resolution": "720p", "aspect_ratio": "auto", "duration": 5, "elements": []}}
```

### `market/kling/v3-omni-reference-to-video`
```json
{"model": "kling-3.0-omni/reference-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Generate a video of the character walking along a city street, using the character appearance in the reference images.", "image_urls": ["https://example.com/character-reference.png"], "customize_multi_shots": true, "multi_prompt": [{"prompt": "A wide shot of the character walking through the city.", "duration": 2}, {"prompt": "A close-up of the character looking toward the camera.", "duration": 3}], "audio": true, "resolution": "720p", "aspect_ratio": "16:9", "duration": 5, "elements": []}}
```
```json
{"model": "kling-3.0-omni/reference-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Generate a natural, smooth video based on the input video.", "video_urls": ["https://example.com/reference-video.mp4"], "customize_multi_shots": false, "audio": false, "resolution": "720p", "aspect_ratio": "auto"}}
```
```json
{"model": "kling-3.0-omni/reference-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Generate a video of the character walking along a city street, using the character shown in the reference video and images.", "image_urls": ["https://example.com/reference-image.jpg"], "video_urls": ["https://example.com/reference-video.mp4"], "customize_multi_shots": true, "multi_prompt": [{"prompt": "A wide shot of the character walking through the city.", "duration": 2}, {"prompt": "A close-up of the character looking toward the camera.", "duration": 3}], "audio": false, "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5}}
```

### `market/kling/v3-omni-text-to-video`
```json
{"model": "kling-3.0-omni/text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A wide shot of the fox entering the snowy forest.", "customize_multi_shots": true, "multi_prompt": [{"prompt": "A wide shot of the fox entering the snowy forest.", "duration": 2}, {"prompt": "A cinematic close-up of the fox looking toward the sunrise.", "duration": 3}], "audio": false, "resolution": "720p", "aspect_ratio": "16:9", "duration": 5}}
```

### `market/kling/v3-omni-transformation`
```json
{"model": "kling-3.0-omni/transformation", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Transform the input video into a cinematic night scene while preserving the character movements from the original video.", "video_urls": ["https://example.com/source-video.mp4"], "resolution": "720p", "aspect_ratio": "auto", "audio": false}}
```
```json
{"model": "kling-3.0-omni/transformation", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Transform the video into a cinematic night scene using the visual style of the reference image.", "image_urls": ["https://example.com/reference-image.jpg"], "video_urls": ["https://example.com/source-video.mp4"], "duration": "5", "resolution": "720p", "aspect_ratio": "16:9", "audio": false}}
```

### `market/kling/v3-turbo-image-to-video`
```json
{"model": "kling/v3-turbo-image-to-video", "input": {"image_urls": ["https://static.aiquickdraw.com/tools/example/1770688028208_jxcvxCQm.png"], "prompt": "Outdoor terrace of a European villa, by a dining table with a blue and white checkered tablecloth, a young white woman in a blue and white striped short-sleeve shirt and khaki shorts, with a brown belt, sits barefoot, opposite a young white man in a white T-shirt.\n\nThe camera zooms in, the woman swirls the juice in a glass, her eyes looking at the distant woods, and says, \"These trees will turn yellow in a month, won't they?\"\n\nClose-up of the man, he lowers his head and says, \"But they'll be green again next summer.\"\n\nThen the woman turns her head, smiles at the man opposite, and says, \"Are you always this optimistic? Or just about summer?\"\n\nThen the man lifts his head, looks at the woman and says, \"Only about summers with you.\"", "duration": "5", "resolution": "720p"}}
```

### `market/kling/v3-turbo-text-to-video`
```json
{"model": "kling/v3-turbo-text-to-video", "input": {"prompt": "Outdoor terrace of a European villa, by a dining table with a blue and white checkered tablecloth, a young white woman in a blue and white striped short-sleeve shirt and khaki shorts, with a brown belt, sits barefoot, opposite a young white man in a white T-shirt.\n\nThe camera zooms in, the woman swirls the juice in a glass, her eyes looking at the distant woods, and says, \"These trees will turn yellow in a month, won't they?\"\n\nClose-up of the man, he lowers his head and says, \"But they'll be green again next summer.\"\n\nThen the woman turns her head, smiles at the man opposite, and says, \"Are you always this optimistic? Or just about summer?\"\n\nThen the man lifts his head, looks at the woman and says, \"Only about summers with you.\"", "duration": "5", "aspect_ratio": "16:9", "resolution": "720p"}}
```

### `market/minimax-h3/image-to-video`
```json
{"model": "minimax-h3/image-to-video", "callBackUrl": "https://example.com/callback", "input": {"prompt": "Let the character in the scene turn around naturally and smile, camera slowly pushing forward", "first_frame_url": "https://example.com/first-frame.jpg", "last_frame_url": "https://example.com/last-frame.jpg", "duration": 6}}
```

### `market/minimax-h3/reference-to-video`
```json
{"model": "minimax-h3/reference-to-video", "callBackUrl": "https://example.com/callback", "input": {"prompt": "Generate a continuous cinematic video referencing the characters, actions, and scenes in the input material", "reference_image_urls": ["https://example.com/reference-image.jpg"], "reference_video_urls": ["https://example.com/reference-video.mp4"], "reference_audio_urls": ["https://example.com/reference-audio.mp3"], "aspect_ratio": "adaptive", "duration": 6}}
```

### `market/minimax-h3/text-to-video`
```json
{"model": "minimax-h3/text-to-video", "callBackUrl": "https://example.com/callback", "input": {"prompt": "A cat walking slowly on the beach at sunset, cinematic shot", "aspect_ratio": "16:9", "duration": 6}}
```

### `market/omnihuman-1-5`
```json
{"model": "omnihuman-1-5", "input": {"image_url": "https://your-domain.com/image/portrait.png", "mask_url": ["https://your-domain.com/image/mask.png"], "audio_url": "https://your-domain.com/audio/speech.mp3", "prompt": "A person speaking naturally with gentle expressions.", "output_resolution": "1080", "pe_fast_mode": false, "seed": -1}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/omnihuman-1-5/human-identification`
```json
{"model": "omnihuman-1-5/human-identification", "input": {"image_url": "https://your-domain.com/image/portrait.png"}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/omnihuman-1-5/subject-detection`
```json
{"model": "omnihuman-1-5/subject-detection", "input": {"image_url": "https://your-domain.com/image/portrait.png"}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/pixverse/extend`
```json
{"model": "pixverse-v6/extend", "input": {"prompt": "Continue the same camera motion and extend the scene naturally", "taskId": "parent_task_id_from_previous_success_video", "duration": 5, "quality": "720p", "generate_audio_switch": false, "seed": 123456}, "callBackUrl": "https://example.com/kie/callback"}
```

### `market/pixverse/image-to-video`
```json
{"model": "pixverse-v6/image-to-video", "input": {"prompt": "Animate the subject with gentle wind and cinematic lighting", "image_urls": ["https://example.com/input-image.png"], "duration": 5, "quality": "720p", "generate_audio_switch": false, "generate_multi_clip_switch": false, "seed": 123456}, "callBackUrl": "https://example.com/kie/callback"}
```

### `market/qwen2-1/image-to-image`
```json
{"model": "qwen2-1/image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_urls": ["https://example.com/a.jpg", "https://example.com/b.jpg"], "prompt": "Replace the backpack in the first image with the colour scheme from the second image, and leave everything else unchanged", "aspect_ratio": "auto", "resolution": "1K", "background": "opaque", "output_format": "png", "enhance_prompt": true, "seed": 20260921}}
```

### `market/qwen2-1/text-to-image`
```json
{"model": "qwen2-1/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A corgi wearing a yellow rain hat sitting on stone steps after the rain, shallow depth of field", "aspect_ratio": "16:9", "resolution": "1K", "background": "opaque", "output_format": "png", "enhance_prompt": true, "seed": 20260921}}
```

### `market/qwen2/image-edit`
```json
{"model": "qwen2/image-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755603225969i6j87xnw.jpg", "image_size": "16:9", "output_format": "png", "seed": 0}}
```

### `market/qwen2/text-to-image`
```json
{"model": "qwen2/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "image_size": "16:9", "seed": 0, "output_format": "png"}}
```

### `market/qwen3-pro/image-to-image`
```json
{"model": "qwen3/pro-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_urls": ["https://example.com/input.png"], "prompt": "Turn the input image into a cinematic watercolor illustration.", "resolution": "1K", "image_size": "1:1", "output_format": "png", "prompt_extend": true, "nsfw_checker": false, "negative_prompt": "blurry, low quality, distorted", "seed": 1}}
```

### `market/qwen3-pro/text-to-image`
```json
{"model": "qwen3/pro-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A futuristic city at sunset, cinematic lighting, ultra detailed.", "resolution": "1K", "image_size": "1:1", "output_format": "png", "prompt_extend": true, "nsfw_checker": false, "negative_prompt": "blurry, low quality, distorted", "seed": 1}}
```

### `market/qwen3/image-to-image`
```json
{"model": "qwen3/image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_urls": ["https://example.com/input.png"], "prompt": "Turn the input image into a cinematic watercolor illustration.", "resolution": "1K", "image_size": "1:1", "output_format": "png", "prompt_extend": true, "nsfw_checker": false, "negative_prompt": "blurry, low quality, distorted", "seed": 1}}
```

### `market/qwen3/text-to-image`
```json
{"model": "qwen3/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A futuristic city at sunset, cinematic lighting, ultra detailed.", "resolution": "1K", "image_size": "1:1", "output_format": "png", "prompt_extend": true, "nsfw_checker": false, "negative_prompt": "blurry, low quality, distorted", "seed": 1}}
```

### `market/qwen/image-edit`
```json
{"model": "qwen/image-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755603225969i6j87xnw.jpg", "acceleration": "none", "image_size": "landscape_4_3", "num_inference_steps": 25, "guidance_scale": 4, "sync_mode": false, "enable_safety_checker": true, "output_format": "png", "negative_prompt": "blurry, ugly"}}
```

### `market/qwen/image-to-image`
```json
{"model": "qwen/image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "image_url": "", "strength": 0.8, "output_format": "png", "acceleration": "none", "negative_prompt": "blurry, ugly", "num_inference_steps": 30, "guidance_scale": 2.5, "enable_safety_checker": true}}
```

### `market/qwen/text-to-image`
```json
{"model": "qwen/text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "", "image_size": "square_hd", "num_inference_steps": 30, "guidance_scale": 2.5, "enable_safety_checker": true, "output_format": "png", "negative_prompt": " ", "acceleration": "none"}}
```

### `market/recraft/crisp-upscale`
```json
{"model": "recraft/crisp-upscale", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image": "https://file.aiquickdraw.com/custom-page/akr/section-images/1757169577325ijj8vwvt.jpg"}}
```

### `market/recraft/remove-background`
```json
{"model": "recraft/remove-background", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image": "https://file.aiquickdraw.com/custom-page/akr/section-images/1757057285447k9qcbki1.webp"}}
```

### `market/seedream-5-lite-image-to-image`
```json
{"model": "seedream/5-lite-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"], "aspect_ratio": "1:1", "quality": "basic", "output_format": "png", "nsfw_checker": true}}
```

### `market/seedream/4-5-edit`
```json
{"model": "seedream/4.5-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"], "aspect_ratio": "1:1", "quality": "basic", "nsfw_checker": true}}
```

### `market/seedream/4-5-text-to-image`
```json
{"model": "seedream/4.5-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio.", "aspect_ratio": "1:1", "quality": "basic", "nsfw_checker": false}}
```

### `market/seedream/5-lite-text-to-image`
```json
{"model": "seedream/5-lite-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio.", "aspect_ratio": "1:1", "quality": "basic", "output_format": "png", "nsfw_checker": false}}
```

### `market/seedream/5-pro-image-to-image`
```json
{"model": "seedream/5-pro-image-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"], "aspect_ratio": "1:1", "quality": "basic", "output_format": "png", "nsfw_checker": true}}
```

### `market/seedream/5-pro-text-to-image`
```json
{"model": "seedream/5-pro-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio.", "aspect_ratio": "1:1", "quality": "basic", "output_format": "png", "nsfw_checker": false}}
```

### `market/seedream/seedream-v4-edit`
```json
{"model": "bytedance/seedream-v4-edit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Refer to this logo and create a single visual showcase for an outdoor sports brand named ‘KIE AI’. Display five branded items together in one image: a packaging bag, a hat, a carton box, a wristband, and a lanyard. Use blue as the main visual color, with a fun, simple, and modern style.", "image_urls": ["https://file.aiquickdraw.com/custom-page/akr/section-images/1757930552966e7f2on7s.png"], "image_size": "square_hd", "image_resolution": "1K", "max_images": 1, "seed": 80960659, "nsfw_checker": true}}
```

### `market/seedream/seedream-v4-text-to-image`
```json
{"model": "bytedance/seedream-v4-text-to-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Draw the following system of binary linear equations and the corresponding solution steps on the blackboard: 5x + 2y = 26; 2x -y = 5.", "image_size": "square_hd", "image_resolution": "1K", "max_images": 1, "seed": 50331296, "nsfw_checker": true}}
```

### `market/topaz/image-upscale`
```json
{"model": "topaz/image-upscale", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_url": "https://static.aiquickdraw.com/tools/example/1762752805607_mErUj1KR.png", "upscale_factor": "2"}}
```

### `market/topaz/video-upscale`
```json
{"model": "topaz/video-upscale", "callBackUrl": "https://your-domain.com/api/callback", "input": {"video_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1758166466095hvbwkrpw.mp4", "upscale_factor": "2"}}
```

### `market/volcengine/video-to-video-lip-sync`
```json
{"model": "volcengine/video-to-video-lip-sync", "input": {"mode": "lite", "video_url": "https://your-domain.com/video/example.mp4", "audio_url": "https://your-domain.com/audio/speech.mp3", "separate_vocal": false, "open_scenedet": false, "align_audio": true, "align_audio_reverse": false, "templ_start_seconds": 0}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/wan/2-2-a14b-image-to-video-turbo`
```json
{"model": "wan/2-2-a14b-image-to-video-turbo", "callBackUrl": "https://your-domain.com/api/callback", "input": {"image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755166042585gtf2mlrk.png", "prompt": "Overcast lighting, medium lens, soft lighting, low contrast lighting, edge lighting, low angle shot, desaturated colors, medium close-up shot, clean single shot, cool colors, center composition.The camera captures a low-angle close-up of a Western man outdoors, sharply dressed in a black coat over a gray sweater, white shirt, and black tie. His gaze is fixed on the lens as he advances. In the background, a brown building looms, its windows glowing with warm, yellow light above a dark doorway. As the camera pushes in, a blurred black object on the right side of the frame drifts back and forth, partially obscuring the view against a dark, nighttime background.", "resolution": "720p", "enable_prompt_expansion": false, "seed": 0, "acceleration": "none", "nsfw_checker": false}}
```

### `market/wan/2-2-a14b-speech-to-video-turbo`
```json
{"model": "wan/2-2-a14b-speech-to-video-turbo", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The lady is talking", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1756797663082u4pjmcrq.png", "audio_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17567977044127d1emlmc.mp3", "num_frames": 80, "frames_per_second": 16, "resolution": "480p", "negative_prompt": "", "num_inference_steps": 27, "guidance_scale": 3.5, "shift": 5}}
```

### `market/wan/2-2-a14b-text-to-video-turbo`
```json
{"model": "wan/2-2-a14b-text-to-video-turbo", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Drone shot, fast traversal, starting inside a cracked, frosty circular pipe. The camera bursts upward through the pipe to reveal a vast polar landscape bathed in golden sunrise light. Workers in orange suits operate steaming machinery. The camera tilts up, revealing the scene from the perspective of a rising hot air balloon. It continues ascending into a glowing sky, the balloon trailing steam and displaying the letters \"KIE AI\" as it rises into breathtaking polar majesty.", "resolution": "720p", "aspect_ratio": "16:9", "enable_prompt_expansion": false, "seed": 0, "acceleration": "none", "nsfw_checker": false}}
```

### `market/wan/2-2-animate-move`
```json
{"model": "wan/2-2-animate-move", "callBackUrl": "https://your-domain.com/api/callback", "input": {"video_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17586254974931y2hottk.mp4", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1758625466310wpehpbnf.png", "resolution": "480p", "nsfw_checker": false}}
```

### `market/wan/2-2-animate-replace`
```json
{"model": "wan/2-2-animate-replace", "callBackUrl": "https://your-domain.com/api/callback", "input": {"video_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17586199429271xscyd5d.mp4", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/17586199255323tks43kq.png", "resolution": "480p", "nsfw_checker": false}}
```

### `market/wan/2-5-image-to-video`
```json
{"model": "wan/2-5-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The same woman from the reference image looks directly into the camera, takes a breath, then smiles brightly and speaks with enthusiasm: \"Have you heard? Alibaba Wan 2.5 API is now available on Kie.ai!\" Ambient audio: quiet indoor atmosphere, soft natural room tone. Camera: medium close-up, steady framing, natural daylight mood, accurate lip-sync with dialogue.", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1758796480945qb63zxq8.webp", "duration": "5", "resolution": "1080p", "negative_prompt": "blurry, flicker, camera shake, distorted face, low quality", "enable_prompt_expansion": true, "seed": 123456, "nsfw_checker": false}}
```

### `market/wan/2-5-text-to-video`
```json
{"model": "wan/2-5-text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A dimly lit jazz bar at night, wooden tables glowing under warm pendant lights. Patrons sip drinks and chat quietly while a three-piece band performs on stage. The saxophone player stands under a spotlight, gleaming instrument reflecting the light. No dialogue. Ambient audio: smooth live jazz music with saxophone and piano, clinking glasses, low murmur of audience conversations, occasional burst of laughter from a nearby table. Camera: slow pan across the crowd, then gentle zoom toward the saxophone player's solo, focusing on expressive hand movements.", "duration": "5", "aspect_ratio": "16:9", "resolution": "1080p", "negative_prompt": "blurry, flicker, low quality, distorted people, camera shake", "enable_prompt_expansion": true, "seed": 123456, "nsfw_checker": false}}
```

### `market/wan/2-6-flash-image-to-video`
```json
{"model": "wan/2-6-flash-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Anthopmopric fox singing a Christmas song at the rubbish dump in the rain.", "image_urls": [], "duration": "5", "resolution": "1080p", "audio": false, "multi_shots": false, "nsfw_checker": false}}
```

### `market/wan/2-6-flash-video-to-video`
```json
{"model": "wan/2-6-flash-video-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The video drinks milk tea while doing some improvised dance moves to the music.", "video_urls": [], "duration": "5", "resolution": "1080p", "multi_shots": false, "nsfw_checker": false}}
```

### `market/wan/2-6-image-to-video`
```json
{"model": "wan/2-6-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Anthopmopric fox singing a Christmas song at the rubbish dump in the rain.", "image_urls": ["https://static.aiquickdraw.com/tools/example/1765957673717_awiBAidD.webp"], "duration": "5", "resolution": "1080p", "multi_shots": false, "nsfw_checker": false}}
```

### `market/wan/2-6-text-to-video`
```json
{"model": "wan/2-6-text-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "In a hyperrealistic ASMR video, a hand uses a knitted knife to slowly slice a burger made entirely of knitted wool. The satisfyingly crisp cut reveals a detailed cross-section of knitted meat, lettuce, and tomato slices. Captured in a close-up with a shallow depth of field, the scene is set against a stark, matte black surface. Cinematic lighting makes the surreal yarn textures shine with clear reflections. The focus is on the deliberate, satisfying motion and the unique, tactile materials.", "duration": "5", "resolution": "1080p", "multi_shots": false, "nsfw_checker": false}}
```

### `market/wan/2-6-video-to-video`
```json
{"model": "wan/2-6-video-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The video drinks milk tea while doing some improvised dance moves to the music.", "video_urls": ["https://static.aiquickdraw.com/tools/example/1765957777782_cNJpvhRx.mp4"], "duration": "5", "resolution": "1080p", "multi_shots": false, "nsfw_checker": false}}
```

### `market/wan/2-7-image-to-video`
```json
{"model": "wan/2-7-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A white cat stands on a windowsill in warm afternoon light. The camera slowly pushes in as the cat blinks softly and turns to look outside.", "negative_prompt": "blurry, flicker, low quality, distorted", "first_frame_url": "https://your-domain.com/assets/first-frame.png", "last_frame_url": "https://your-domain.com/assets/last-frame.png", "resolution": "1080p", "duration": 5, "prompt_extend": true, "watermark": false, "seed": 123456}}
```
```json
{"model": "wan/2-7-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A white cat stands on a windowsill in warm afternoon light. The camera slowly pushes in as the cat blinks softly and turns to look outside.", "negative_prompt": "blurry, flicker, low quality, distorted", "first_frame_url": "https://your-domain.com/assets/first-frame.png", "driving_audio_url": "https://your-domain.com/assets/driving-audio.mp3", "resolution": "1080p", "duration": 5, "prompt_extend": true, "watermark": false, "seed": 123456}}
```
```json
{"model": "wan/2-7-image-to-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A white cat stands on a windowsill in warm afternoon light. The camera slowly pushes in as the cat blinks softly and turns to look outside.", "negative_prompt": "blurry, flicker, low quality, distorted", "first_clip_url": "https://your-domain.com/assets/first-clip.mp4", "resolution": "1080p", "duration": 5, "prompt_extend": true, "watermark": false, "seed": 123456}}
```

### `market/wan/2-7-r2v`
```json
{"model": "wan/2-7-r2v", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Image 1 is eating, while video 1 and image 2 are singing beside it.", "negative_prompt": "low resolution, errors, worst quality, low quality, malformed, extra fingers, bad proportions", "reference_image": ["https://example.com/demo/ref-image-1.png", "https://example.com/demo/ref-image-2.png"], "reference_video": ["https://example.com/demo/ref-video-1.mp4"], "first_frame": "https://example.com/demo/first-frame.png", "reference_voice": "https://example.com/demo/reference-voice.mp3", "resolution": "1080p", "aspect_ratio": "16:9", "duration": 5, "prompt_extend": true, "watermark": false, "seed": 0}}
```

### `market/wan/2-7-text-to-video`
```json
{"model": "wan/2-7-text-to-video", "input": {"prompt": "A futuristic city street at night, neon reflections shimmering on the wet ground. The camera slowly pushes forward as a silver hover car glides in from the left. Giant holographic billboards flicker in the distance, creating a cinematic atmosphere.", "negative_prompt": "blurry, low quality, flicker, distorted characters", "audio_url": "https://your-domain.com/audio/custom-track.mp3", "resolution": "1080p", "ratio": "16:9", "duration": 5, "prompt_extend": true, "watermark": false, "seed": 123456}, "callBackUrl": "https://your-domain.com/api/callback"}
```

### `market/wan/2-7-videoedit`
```json
{"model": "wan/2-7-videoedit", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Change the character's outfit and add the hat shown in the reference image.", "negative_prompt": "low resolution, errors, worst quality, low quality, malformed, extra fingers, bad proportions", "video_url": "https://example.com/demo/video.mp4", "reference_image": "https://example.com/demo/reference.png", "resolution": "1080p", "aspect_ratio": "16:9", "duration": 0, "audio_setting": "auto", "prompt_extend": true, "watermark": false, "seed": 0}}
```

### `market/wan/3-0-video`
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Under the moonlight, a little cat is running on the roof. In the distance, the neon lights are flashing, giving a cinematic feel. The camera movement is smooth.", "resolution": "480P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The graffiti teenager emerged from the concrete wall, rapping under the night-time railway bridge, with a cinematic atmosphere.", "first_frame_url": "https://example.com/first-frame.png", "resolution": "720P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The young girl's expression changed from a smile to a wide laugh. The camera slowly moved in, and the lighting shifted from a cool tone to a warm tone.", "first_frame_url": "https://example.com/first-frame.jpg", "last_frame_url": "https://example.com/last-frame.jpg", "resolution": "1080P", "aspect_ratio": "adaptive", "duration": 8, "audio": true, "seed": 12345}}
```
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Video 1 holds image 3 and is playing a song on the chair in image 4. Image 1 holds image 2 and passes through Video 1, placing image 2 on the table.", "reference_image_urls": ["https://example.com/character.jpg", "https://example.com/object.png", "https://example.com/prop.png", "https://example.com/background.png"], "reference_video_urls": ["https://example.com/role.mp4"], "reference_audio_urls": ["https://example.com/voice.mp3"], "resolution": "720P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Based on this product presentation PPT, create an advertisement video for an ultra-minimalist tech-style smart glasses.", "reference_file_urls": ["https://example.com/product.pptx"], "resolution": "480P", "aspect_ratio": "adaptive", "duration": 10, "audio": true}}
```
```json
{"model": "wan/3-0-video", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Based on the content of this public webpage, create a concise product introduction video.", "reference_link_urls": ["https://example.com/article"], "resolution": "720P", "aspect_ratio": "16:9", "duration": 8, "audio": true}}
```

### `market/wan/3-0-video-prime`
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Under the moonlight, a little cat is running on the roof. In the distance, the neon lights are flashing, giving a cinematic feel. The camera movement is smooth.", "resolution": "480P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The graffiti teenager emerged from the concrete wall, rapping under the night-time railway bridge, with a cinematic atmosphere.", "first_frame_url": "https://example.com/first-frame.png", "resolution": "720P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "The young girl's expression changed from a smile to a wide laugh. The camera slowly moved in, and the lighting shifted from a cool tone to a warm tone.", "first_frame_url": "https://example.com/first-frame.jpg", "last_frame_url": "https://example.com/last-frame.jpg", "resolution": "1080P", "aspect_ratio": "adaptive", "duration": 8, "audio": true, "seed": 12345}}
```
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Video 1 holds image 3 and is playing a song on the chair in image 4. Image 1 holds image 2 and passes through Video 1, placing image 2 on the table.", "reference_image_urls": ["https://example.com/character.jpg", "https://example.com/object.png", "https://example.com/prop.png", "https://example.com/background.png"], "reference_video_urls": ["https://example.com/role.mp4"], "reference_audio_urls": ["https://example.com/voice.mp3"], "resolution": "720P", "aspect_ratio": "adaptive", "duration": 5, "audio": true}}
```
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Based on this product presentation PPT, create an advertisement video for an ultra-minimalist tech-style smart glasses.", "reference_file_urls": ["https://example.com/product.pptx"], "resolution": "480P", "aspect_ratio": "adaptive", "duration": 10, "audio": true}}
```
```json
{"model": "wan/3-0-video-prime", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Based on the content of this public webpage, create a concise product introduction video.", "reference_link_urls": ["https://example.com/article"], "resolution": "720P", "aspect_ratio": "16:9", "duration": 8, "audio": true}}
```

### `market/z-image/z-image`
```json
{"model": "z-image", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "Generate a photorealistic image of a cafe terrace in the Marais district of Paris on a Wednesday morning in March 2025. It is a crisp, cool spring morning with clear skies. Locals are drinking coffee. In sharp focus should be a young woman with a pixie cut wearing a scarf, stirring a cappuccino and looking thoughtfully to the side; the waiter and street traffic behind her are blurred. The photo should have the candid, natural morning light feel of an iPhone image.", "aspect_ratio": "1:1", "nsfw_checker": true}}
```

### `runway-api/extend-ai-video`
```json
{"model": "runway/extend-ai-video", "callBackUrl": "https://api.example.com/callback", "input": {"task_id": "ee603959-debb-48d1-98c4-a6d1c717eba6", "prompt": "The cat continues dancing with more energy and excitement, spinning around with colorful light effects intensifying", "quality": "720p", "watermark": "kie.ai"}}
```

### `runway-api/generate-ai-video`
```json
{"model": "runway", "callBackUrl": "https://api.example.com/callback", "input": {"prompt": "A fluffy orange cat dancing energetically in a colorful room with disco lights", "image_url": "https://example.com/cat-image.jpg", "duration": "5", "quality": "720p", "aspect_ratio": "9:16", "watermark": "kie.ai"}}
```

### `runway-api/generate-aleph-video`
```json
{"model": "runway/gen4-aleph", "callBackUrl": "https://api.example.com/callback", "input": {"prompt": "A majestic eagle soaring through mountain clouds at sunset with cinematic camera movement", "video_url": "https://example.com/input-video.mp4", "watermark": "kie.ai", "upload_cn": false, "aspect_ratio": "16:9", "seed": 123456, "reference_image": "https://example.com/reference.jpg"}}
```

### `veo3-api/extend-video`
```json
{"model": "veo/extend", "callBackUrl": "https://your-domain.com/api/callback", "input": {"task_id": "veo_task_abcdef123456", "prompt": "The dog continues running through the park, jumping over obstacles and playing with other dogs", "seeds": 12345, "watermark": "MyBrand"}}
```

### `veo3-api/generate-veo-3-video`
```json
{"model": "veo-3-1", "callBackUrl": "http://your-callback-url.com/complete", "input": {"prompt": "A dog playing in a park", "image_urls": ["http://example.com/image1.jpg", "http://example.com/image2.jpg"], "watermark": "MyBrand", "aspect_ratio": "16:9", "enable_fallback": false, "enable_translation": true, "generation_type": "REFERENCE_2_VIDEO"}}
```

### `veo3-api/get-veo-3-1080-p-video`
```json
{"model": "veo/get-1080p-video", "callBackUrl": "https://acceptable-nectarine.us/", "input": {"taskId": "46", "index": 0}}
```

### `veo3-api/get-veo-3-4k-video`
```json
{"model": "veo/get-4k-video", "callBackUrl": "http://your-callback-url.com/4k-callback", "input": {"task_id": "veo_task_abcdef123456", "index": 0}}
```

### Pages with NO usable example in the doc
- `market/kling/v25-turbo-image-to-video-pro` — example is malformed in the doc (stray `image` token): `{"model": "kling/v2-5-turbo-image-to-video-pro", "callBackUrl": "https://your-domain.com/api/callback", "input": {"prompt": "A team of paratroopers descends into enemy territory, as they pass through clouds, the camera switches to a slow pan above the battlefield lighting up with", "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1755256297923kmjpynul.png", "duration": "5", "negative_prompt": "blur, distort, and low quality", "cfg_scale": 0.5}}` (cleaned)
- `market/seedream/seedream` (3.0), `market/seedream/5-pro-layer-decomposition`, `market/wan/2-7-image`, `market/wan/2-7-image-pro`, `market/pixverse/text-to-video`, `market/pixverse/transition`, `market/pixverse/reference-to-video` — no example in doc.
- `market/gemini-omni-audio`, `market/gemini-omni-character` — non-createTask helper endpoints (examples quoted in B10).


---

# APPENDIX 2 — Raw image/video pricing rows (credits) from `POST https://api.kie.ai/client/v1/model-pricing/page`

Format: type(i/v) | provider | description | price | playground anchor

```
i|Alibaba|Qwen image 3.0 Pro, input, 1K|0.5 per image|/qwen-image-3?model=qwen3/pro-image-to-image
i|Alibaba|Qwen image 3.0 Pro, input, 2K|0.5 per image|/qwen-image-3?model=qwen3/pro-image-to-image
i|Alibaba|Qwen image 3.0 Pro, output, 1K|6.4 per image|/qwen-image-3?model=qwen3/pro-image-to-image
i|Alibaba|Qwen image 3.0 Pro, output, 2K|12 per image|/qwen-image-3?model=qwen3/pro-image-to-image
i|Alibaba|Qwen image 3.0 Pro, text to image, 1K|6.4 per image|/qwen-image-3?model=qwen3/pro-text-to-image
i|Alibaba|Qwen image 3.0 Pro, text to image, 2K|12 per image|/qwen-image-3?model=qwen3/pro-text-to-image
i|Alibaba|Qwen image 3.0, input, 1K|0.5 per image|/qwen-image-3?model=qwen3/image-to-image
i|Alibaba|Qwen image 3.0, input, 2K|0.5 per image|/qwen-image-3?model=qwen3/image-to-image
i|Alibaba|Qwen image 3.0, output, 1K|4.8 per image|/qwen-image-3?model=qwen3/image-to-image
i|Alibaba|Qwen image 3.0, output, 2K|4.8 per image|/qwen-image-3?model=qwen3/image-to-image
i|Alibaba|Qwen image 3.0, text to image, 1K|4.8 per image|/qwen-image-3?model=qwen3/text-to-image
i|Alibaba|Qwen image 3.0, text to image, 2K|4.8 per image|/qwen-image-3?model=qwen3/text-to-image
i|Alibaba|Qwen-Image-2.1, image to image, 1K|4 per image|/qwen-image-2.1
i|Alibaba|Qwen-Image-2.1, image to image, 2K|8 per image|/qwen-image-2.1
i|Alibaba|Qwen-Image-2.1, text to image, 1K|4 per image|/qwen-image-2.1
i|Alibaba|Qwen-Image-2.1, text to image, 2K|8 per image|/qwen-image-2.1
i|Black Forest Labs|Black Forest Labs Flux 2 Flex, image to image, 1.0s-1K|14.0 per image|/flux-2?model=flux-2/flex-image-to-image
i|Black Forest Labs|Black Forest Labs Flux 2 Flex, image to image, 1.0s-2K|24.0 per image|/flux-2?model=flux-2/flex-image-to-image
i|Black Forest Labs|Black Forest Labs Flux 2 Flex, text to image, 1.0s-1K|14 per image|/flux-2?model=flux-2/flex-text-to-image
i|Black Forest Labs|Black Forest Labs Flux 2 Flex, text to image, 1.0s-2K|24 per image|/flux-2?model=flux-2/flex-text-to-image
i|Black Forest Labs|Black Forest Labs flux-2 pro, image to image, 1.0s-1K|5.0 per image|/flux-2?model=flux-2/pro-image-to-image
i|Black Forest Labs|Black Forest Labs flux-2 pro, image to image, 1.0s-2K|7.0 per image|/flux-2?model=flux-2/pro-image-to-image
i|Black Forest Labs|Black Forest Labs flux-2 pro, text-to-image, 1.0s-1K|5.0 per image|/flux-2?model=flux-2/pro-text-to-image
i|Black Forest Labs|Black Forest Labs flux-2 pro, text-to-image, 1.0s-2K|7.0 per image|/flux-2?model=flux-2/pro-text-to-image
i|Black Forest Labs|Black Forest Labs flux1-kontext, text-to-image, Max|10.0 per image|/flux-kontext-api
i|Black Forest Labs|Black Forest Labs flux1-kontext, text-to-image, Pro|5.0 per image|/flux-kontext-api
i|ByteDance|seedream 4.5, image-to-image|6.5 per image|/seedream-4-5?model=seedream/4.5-edit
i|ByteDance|seedream 4.5, text-to-image|6.5 per image|/seedream-4-5?model=seedream/4.5-text-to-image
i|ByteDance|seedream 5 Pro, Layer Decomposition, 1.5K|7 per image|
i|ByteDance|seedream 5 Pro, Layer Decomposition, 1K|7 per image|
i|ByteDance|seedream 5 Pro, Layer Decomposition, 2K|14 |
i|ByteDance|seedream 5 Pro, image-to-image, 1K|7 per image|/seedream-5-0-pro
i|ByteDance|seedream 5 Pro, image-to-image, 2K|14 per image|/seedream-5-0-pro
i|ByteDance|seedream 5 Pro, input image, First image free|0.5 per image|
i|ByteDance|seedream 5 Pro, text-to-image, 1K|7 per image|/seedream-5-0-pro?model=seedream/5-pro-text-to-image
i|ByteDance|seedream 5 Pro, text-to-image, 2K|14 per image|/seedream-5-0-pro?model=seedream/5-pro-text-to-image
i|ByteDance|seedream 5.0 Lite, image-to-image|5.5 per image|/seedream5-0-lite?model=seedream/5-lite-image-to-image
i|ByteDance|seedream 5.0 Lite, text-to-image|5.5 per image|/seedream5-0-lite?model=seedream/5-lite-text-to-image
i|Google|Google nano banana 2, 1K|8 per image|/nano-banana-2
i|Google|Google nano banana 2, 2K|12 per image|/nano-banana-2
i|Google|Google nano banana 2, 4K|18 per image|/nano-banana-2
i|Google|Google nano banana edit, image-to-image|4.0 per image|/nano-banana?model=google/nano-banana-edit
i|Google|Google nano banana pro, 1/2K|18.0 per image|/nano-banana-pro
i|Google|Google nano banana pro, 4K|24.0 per image|/nano-banana-pro
i|Google|Google nano banana, text-to-image|4.0 per image|/nano-banana
i|Google|google imagen4, text-to-image, Fast|4.0 per request|/google/imagen4?model=google/imagen4-fast
i|Google|google imagen4, text-to-image, Ultra|12.0 per image|/google/imagen4?model=google/imagen4-ultra
i|Google|google imagen4, text-to-image, default|8.0 per request|/google/imagen4?model=google/imagen4
i|Google|nano-banana-2-lite, 1k|4 per image|/nano-banana-2-lite
i|Grok|grok-imagine, image-to-image|4 per generation|/grok-imagine?model=grok-imagine/image-to-image
i|Grok|grok-imagine, text-to-image|4.0 per 2 images|/grok-imagine?model=grok-imagine/text-to-video
i|Grok|grok-imagine, text-to-image(quality)|5 per generation|/grok-imagine?model=grok-imagine/text-to-image
i|Grok|grok-imagine-image-2-0, Image Edit|4 per image|/grok-imagine-image-2?model=grok-imagine-image-2-0/image-edit
i|Grok|grok-imagine-image-2-0, Text to Image|4 per image|/grok-imagine-image-2?model=grok-imagine-image-2-0/text-to-image
i|Ideogram|Ideogram V3 Reframe, image to image, Balanced|7.0 per image|/ideogram-reframe
i|Ideogram|Ideogram V3 Reframe, image to image, Quality|10.0 per image|/ideogram-reframe
i|Ideogram|Ideogram V3 Reframe, image to image, Turbo|3.5 per image|/ideogram-reframe
i|Ideogram|ideogram character, image-to-image, BALANCED|18.0 per image|/ideogram/character
i|Ideogram|ideogram character, image-to-image, QUALITY|24.0 per image|/ideogram/character?model=ideogram/character
i|Ideogram|ideogram character, image-to-image, TURBO|12.0 per image|/ideogram/character?model=ideogram/character
i|Ideogram|ideogram character-edit, image-to-image, BALANCED|18.0 per image|/ideogram/character?model=ideogram/character-edit
i|Ideogram|ideogram character-edit, image-to-image, QUALITY|24.0 per image|/ideogram/character?model=ideogram/character-edit
i|Ideogram|ideogram character-edit, image-to-image, TURBO|12.0 per image|/ideogram/character?model=ideogram/character-edit
i|Ideogram|ideogram character-remix, image-to-image, BALANCED|18.0 per image|/ideogram/character?model=ideogram/character-remix
i|Ideogram|ideogram character-remix, image-to-image, QUALITY|24.0 per image|/ideogram/character?model=ideogram/character-remix
i|Ideogram|ideogram character-remix, image-to-image, TURBO|12.0 per image|/ideogram/character?model=ideogram/character-remix
i|Ideogram|ideogram v3,  text-to-image, BALANCED|7.0 per image|/ideogram/v3?model=ideogram/v3-text-to-image
i|Ideogram|ideogram v3,  text-to-image, QUALITY|10.0 per image|/ideogram/v3?model=ideogram/v3-text-to-image
i|Ideogram|ideogram v3,  text-to-image, TURBO|3.5 per image|/ideogram/v3?model=ideogram/v3-text-to-image
i|Ideogram|ideogram v3-edit, image-to-image, BALANCED|7.0 per image|/ideogram/v3?model=ideogram/v3-edit
i|Ideogram|ideogram v3-edit, image-to-image, QUALITY|10.0 per image|/ideogram/v3?model=ideogram/v3-edit
i|Ideogram|ideogram v3-edit, image-to-image, TURBO|3.5 per image|/ideogram/v3?model=ideogram/v3-edit
i|Ideogram|ideogram v3-remix, image-to-image, BALANCED|7.0 per image|/ideogram/v3?model=ideogram/v3-remix
i|Ideogram|ideogram v3-remix, image-to-image, QUALITY|10.0 per image|/ideogram/v3?model=ideogram/v3-remix
i|Ideogram|ideogram v3-remix, image-to-image, TURBO|3.5 per image|/ideogram/v3?model=ideogram/v3-remix
i|OpenAI|gpt image 1.5, image-to-image, high|22.0 per image|/gpt-image-1.5?model=gpt-image/1.5-image-to-image
i|OpenAI|gpt image 1.5, image-to-image, medium|4.0 per image|/gpt-image-1.5?model=gpt-image/1.5-image-to-image
i|OpenAI|gpt image 1.5, text-to-image, high|22.0 per image|/gpt-image-1.5?model=gpt-image/1.5-text-to-image
i|OpenAI|gpt image 1.5, text-to-image, medium|4.0 per image|/gpt-image-1.5?model=gpt-image/1.5-text-to-image
i|OpenAI|gpt image 2, image-to-image, 1k|6 per image|/gpt-image-2?model=gpt-image-2-image-to-image
i|OpenAI|gpt image 2, image-to-image, 2k|10 per image|/gpt-image-2?model=gpt-image-2-image-to-image
i|OpenAI|gpt image 2, image-to-image, 4k|16 per image|/gpt-image-2?model=gpt-image-2-image-to-image
i|OpenAI|gpt image 2, text-to-image, 1k|6 per image|/gpt-image-2?model=gpt-image-2-text-to-image
i|OpenAI|gpt image 2, text-to-image, 2k|10 per image|/gpt-image-2?model=gpt-image-2-text-to-image
i|OpenAI|gpt image 2, text-to-image, 4k|16 per image|/gpt-image-2?model=gpt-image-2-text-to-image
i|OpenAI|gpt-image-2-5-flare, image-to-image, 1K|6 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-flare, image-to-image, 2K|10 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-flare, image-to-image, 4K|16 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-flare, text-to-image, 1K|6 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-flare, text-to-image, 2K|10 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-flare, text-to-image, 4K|16 per image|/gpt-image-2-5
i|OpenAI|gpt-image-2-5-sunburst, image-to-image, 1K|6 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-image-to-image
i|OpenAI|gpt-image-2-5-sunburst, image-to-image, 2K|10 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-image-to-image
i|OpenAI|gpt-image-2-5-sunburst, image-to-image, 4K|16 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-image-to-image
i|OpenAI|gpt-image-2-5-sunburst, text-to-image, 1K|6 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-text-to-image
i|OpenAI|gpt-image-2-5-sunburst, text-to-image, 2K|10 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-text-to-image
i|OpenAI|gpt-image-2-5-sunburst, text-to-image, 4K|16 per image|/gpt-image-2-5?model=gpt-image-2-5-sunburst-text-to-image
i|OpenAI 4o|OpenAI 4o image, text-to-image|6.0 per image|/4o-image-api
i|Qwen|Qwen Image , text-to-image|4.0 per megapixel|/qwen-image
i|Qwen|Qwen Image, image-to-image|4.0 per megapixel|/qwen-image
i|Qwen|Qwen image-edit, image-to-image|5.0 per megapixel|/qwen/image-edit
i|Qwen|Qwen z-image, text-to-image, 1.0s|0.8 per image|/z-image
i|Qwen|Qwen2 - Image edit, image-to-image|5.6 per image|/qwen-image-2
i|Qwen|Qwen2 - Image edit, text-to-image|5.6 per image|/qwen-image-2?model=qwen2/text-to-image
i|Recraft|Recraft Crisp Upscale, image to image|0.5 per image|/recraft-crisp-upscale
i|Recraft|Recraft Remove Background , image to image|1.0 per image|/recraft-remove-background
i|Topaz|Topaz Image Upscaler, image-upscale, 2K|10.0 per image|/topaz-image-upscale
i|Topaz|Topaz Image Upscaler, image-upscale, 4K|20.0 per image|/topaz-image-upscale
i|Wan|wan 2.7 image|4.8 per image|/wan-2-7-image
i|Wan|wan 2.7 image pro|12 per image|/wan-2-7-image?model=wan/2-7-image-pro
v|Alibaba|HappyHorse-1.0, image-to-video, 1080p|48 per second|/happyhorse-1-0?model=happyhorse/image-to-video
v|Alibaba|HappyHorse-1.0, image-to-video, 720p|28 per second|/happyhorse-1-0?model=happyhorse/image-to-video
v|Alibaba|HappyHorse-1.0, reference-to-video, 1080p|48 per second|/happyhorse-1-0?model=happyhorse/reference-to-video
v|Alibaba|HappyHorse-1.0, reference-to-video, 720p|28 per second|/happyhorse-1-0?model=happyhorse/reference-to-video
v|Alibaba|HappyHorse-1.0, text-to-video, 1080p|48 per second|/happyhorse-1-0?model=happyhorse/text-to-video
v|Alibaba|HappyHorse-1.0, text-to-video, 720p|28 per second|/happyhorse-1-0?model=happyhorse/text-to-video
v|Alibaba|HappyHorse-1.0, video-edit, 1080p|48 per second|/happyhorse-1-0?model=happyhorse/video-edit
v|Alibaba|HappyHorse-1.0, video-edit, 720p|28 per second|/happyhorse-1-0?model=happyhorse/video-edit
v|Alibaba|HappyHorse-1.1, image-to-video, 1080p|29 per second|/happyhorse-1-1?model=happyhorse-1-1/image-to-video
v|Alibaba|HappyHorse-1.1, image-to-video, 720p|22.5 per second|/happyhorse-1-1?model=happyhorse-1-1/image-to-video
v|Alibaba|HappyHorse-1.1, reference-to-video, 1080p|29 per second|/happyhorse-1-1?model=happyhorse-1-1/reference-to-video
v|Alibaba|HappyHorse-1.1, reference-to-video, 720p|22.5 per second|/happyhorse-1-1?model=happyhorse-1-1/reference-to-video
v|Alibaba|HappyHorse-1.1, text-to-video, 1080p|29 per second|/happyhorse-1-1?model=happyhorse-1-1/text-to-video
v|Alibaba|HappyHorse-1.1, text-to-video, 720p|22.5 per second|/happyhorse-1-1?model=happyhorse-1-1/text-to-video
v|ByteDance|bytedance/seedance-1.5-pro, with audio-1080p|15 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-1.5-pro, with audio-480p|3.5 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-1.5-pro, with audio-720p|7 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-1.5-pro, without audio-1080p|7.5 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-1.5-pro, without audio-480p|1.75 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-1.5-pro, without audio-720p|3.5 per second|/seedance-1-5-pro
v|ByteDance|bytedance/seedance-2 fast, 480p no video input|11.7 per second|/seedance-2-0?model=bytedance/seedance-2-fast
v|ByteDance|bytedance/seedance-2 fast, 480p with video input|6.8 per second|/seedance-2-0?model=bytedance/seedance-2-fast
v|ByteDance|bytedance/seedance-2 fast, 720p no video input|24.8 per second|/seedance-2-0?model=bytedance/seedance-2-fast
v|ByteDance|bytedance/seedance-2 fast, 720p with video input|15 per second|/seedance-2-0?model=bytedance/seedance-2-fast
v|ByteDance|bytedance/seedance-2, 1080p no video input|102 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 1080p with video input|62 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 480p no video input|19 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 480p with video input|11.5 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 4K no video input|208 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 4K with video input|128 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 720p no video input|41 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2, 720p with video input|25 per second|/seedance-2-0?model=bytedance/seedance-2
v|ByteDance|bytedance/seedance-2-5, 1080p no video|158 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-5, 1080p with video|95 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-5, 480p no video|28 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-5, 480p with video|17 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-5, 720p no video|63 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-5, 720p with video|38 per second|/seedance-2-5
v|ByteDance|bytedance/seedance-2-mini, 480P no video|3.8 per second|/seedance-2-0-mini
v|ByteDance|bytedance/seedance-2-mini, 480P with video|2.4 per second|/seedance-2-0-mini
v|ByteDance|bytedance/seedance-2-mini, 720P no video|8.2 per second|/seedance-2-0-mini
v|ByteDance|bytedance/seedance-2-mini, 720P with video|5 per second|/seedance-2-0-mini
v|ByteDance|omnihuman-1-5, lip sync|27 per second|/omnihuman-1-5?model=omnihuman-1-5
v|ByteDance|volcengine , lip sync|8 per second|/volcengine-video-to-video-lip-sync
v|Google| google/gemini-omni-flash-1-1, video, 1080p with video input|168 per video|/gemini-omni-1-1-flash
v|Google| google/gemini-omni-flash-1-1, video, 10s 1080p no video input|126 per video|/gemini-omni-1-1-flash
v|Google| google/gemini-omni-flash-1-1, video, 10s 360p no video input|126 per video|/gemini-omni-1-1-flash
v|Google| google/gemini-omni-flash-1-1, video, 10s 720p no video input|126 per video|/gemini-omni-1-1-flash
v|Google| google/gemini-omni-flash-1-1, video, 360p with video input|168 per video|/gemini-omni-1-1-flash
v|Google| google/gemini-omni-flash-1-1, video, 720p with video input|168 per video|/gemini-omni-1-1-flash
v|Google|Google veo 3.1, Extend, Fast|60 per video|/veo-3-1?model=veo/extend
v|Google|Google veo 3.1, Extend, Lite|30 per vedio|/veo-3-1?model=veo/extend
v|Google|Google veo 3.1, Extend, Quality|250 per video|/veo-3-1?model=veo/extend
v|Google|Google veo 3.1, Get 1080P Video|5 per video|/veo-3-1?model=veo/get-1080p-video
v|Google|Google veo 3.1, Get 4K Video|120.0 per video|https://docs.kie.ai/veo3-api/get-veo-3-4k-video
v|Google|Google veo 3.1, image-to-video, Fast-1080p|65 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Fast-4K|180 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Fast-720p|60 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Lite-1080p|35 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Lite-4K|150 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Lite-720p|30 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Quality-1080p|255 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Quality-4K|370 per video|/veo-3-1
v|Google|Google veo 3.1, image-to-video, Quality-720p|250 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Fast-1080p|65 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Fast-4k|180 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Fast-720p|60.0 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Lite-1080p|35 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Lite-4k|150 per video|/veo-3-1
v|Google|Google veo 3.1, reference-to-video, Lite-720p|30 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Fast-1080p|65 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Fast-4K|180 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Fast-720p|60 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Lite-1080p|35 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Lite-4K|150 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Lite-720p|30 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Quality-1080p|255 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Quality-4K|380 per video|/veo-3-1
v|Google|Google veo 3.1, text-to-video, Quality-720p|250 per video|/veo-3-1
v|Google|gemini-omni-video, video, 1080p with video input|168 per video|/gemini-omni
v|Google|gemini-omni-video, video, 10s 1080p no video input|126 per video|/gemini-omni
v|Google|gemini-omni-video, video, 10s 4k no video input|210 per video|/gemini-omni
v|Google|gemini-omni-video, video, 10s 720p no video input|126 per vedio|/gemini-omni
v|Google|gemini-omni-video, video, 4k with video input|252 per video|/gemini-omni
v|Google|gemini-omni-video, video, 4s 1080p no video input|63 per video|/gemini-omni
v|Google|gemini-omni-video, video, 4s 4k no video input|147 per video|/gemini-omni
v|Google|gemini-omni-video, video, 4s 720p no video input|63 per vedio|/gemini-omni
v|Google|gemini-omni-video, video, 6s 1080p no video input|84 per video|/gemini-omni
v|Google|gemini-omni-video, video, 6s 4k no video input|168 per video|/gemini-omni
v|Google|gemini-omni-video, video, 6s 720p no video input|84 per vedio|/gemini-omni
v|Google|gemini-omni-video, video, 720p with video input|168 per video|/gemini-omni
v|Google|gemini-omni-video, video, 8s 1080p no video input|105 per video|/gemini-omni
v|Google|gemini-omni-video, video, 8s 4k no video input|189 per video|/gemini-omni
v|Google|gemini-omni-video, video, 8s 720p no video input|105 per vedio|/gemini-omni
v|Google|google/gemini-omni-flash-1-1, video, 10s 4k no video input|210 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 4k with video input|252 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 4s 1080p no video input|63 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 4s 360p no video input|63 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 4s 4k no video input|147 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 4s 720p no video input|63 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 6s 1080p no video input|84 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 6s 360p no video input|84 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 6s 4k no video input|168 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 6s 720p no video input|84 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 8s 1080p no video input|105 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 8s 360p no video input|105 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 8s 4k no video input|189 per video|/gemini-omni-1-1-flash
v|Google|google/gemini-omni-flash-1-1, video, 8s 720p no video input|105 per video|/gemini-omni-1-1-flash
v|Grok|grok-imagine, image-to-video, 1080p|8 per second|/grok-imagine?model=grok-imagine/image-to-video
v|Grok|grok-imagine, image-to-video, 480p|2.4 per second|/grok-imagine?model=grok-imagine/image-to-video
v|Grok|grok-imagine, image-to-video, 720p|4.5 per second|/grok-imagine?model=grok-imagine/image-to-video
v|Grok|grok-imagine, text-to-video, 1080p|8 per second|/grok-imagine?model=grok-imagine/text-to-video
v|Grok|grok-imagine, text-to-video, 480p|2.4 per second|/grok-imagine?model=grok-imagine/text-to-video
v|Grok|grok-imagine, text-to-video, 720p|4.5 per second|/grok-imagine?model=grok-imagine/text-to-video
v|Grok|grok-imagine, upscale, 360p→720p|10.0 per upscale|/grok-imagine?model=grok-imagine/upscale
v|Grok|grok-imagine, upscale, 480P → 1080P|30 per upscale|/grok-imagine?model=grok-imagine/upscale
v|Grok|grok-imagine, upscale, 720P → 1080P|20 per upscale|/grok-imagine?model=grok-imagine/upscale
v|Grok|grok-imagine-video-1-5-preview, image-to-video, 480p|2.4 per second|/grok-imagine-video-1.5
v|Grok|grok-imagine-video-1-5-preview, image-to-video, 720p|4.5 per second|/grok-imagine-video-1.5
v|Grok|grok-imagine/extend, 10s 480p|24 |/grok-imagine?model=grok-imagine/extend
v|Grok|grok-imagine/extend, 10s 720p|45 |/grok-imagine?model=grok-imagine/extend
v|Grok|grok-imagine/extend, 6s 480p|14.4 |/grok-imagine?model=grok-imagine/extend
v|Grok|grok-imagine/extend, 6s 720p|27 |/grok-imagine?model=grok-imagine/extend
v|Hailuo|MiniMax H3, image input, 768p, 2k|4 per image|/minimax-h3
v|Hailuo|MiniMax H3, image to video, 2K|13 per second|/minimax-h3?model=minimax-h3/image-to-video
v|Hailuo|MiniMax H3, image to video, 768p|8 per second|/minimax-h3?model=minimax-h3/image-to-video
v|Hailuo|MiniMax H3, reference to video, 2K|13 per second|/minimax-h3?model=minimax-h3/reference-to-video
v|Hailuo|MiniMax H3, reference to video, 768p|8 per second|/minimax-h3?model=minimax-h3/reference-to-video
v|Hailuo|MiniMax H3, text to video, 2K|13 per second|/minimax-h3?model=minimax-h3/text-to-video
v|Hailuo|MiniMax H3, text to video, 768p|8 per second|/minimax-h3?model=minimax-h3/text-to-video
v|Hailuo|MiniMax H3, video input, 2k|13 per second|/minimax-h3
v|Hailuo|MiniMax H3, video input, 768p|8 per second|/minimax-h3
v|Hailuo|hailuo 2.3, image-to-video, Pro-10.0s-768p|90.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-pro
v|Hailuo|hailuo 2.3, image-to-video, Pro-6.0s-1080p|80.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-pro
v|Hailuo|hailuo 2.3, image-to-video, Pro-6.0s-768p|45.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-pro
v|Hailuo|hailuo 2.3, image-to-video, Standard-10.0s-768p|50.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-standard
v|Hailuo|hailuo 2.3, image-to-video, Standard-6.0s-1080p|50.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-standard
v|Hailuo|hailuo 2.3, image-to-video, Standard-6.0s-768p|30.0 per video|/hailuo-2-3?model=hailuo/2-3-image-to-video-standard
v|Kling|Kling 2.1, image-to-video, Master-10.0s|320.0 per video|/kling/v2-1?model=kling/v2-1-master-image-to-video
v|Kling|Kling 2.1, image-to-video, Master-5.0s|160.0 per video|/kling/v2-1?model=kling/v2-1-master-image-to-video
v|Kling|Kling 2.1, text-to-video, Master-10.0s|320.0 per video|/kling/v2-1?model=kling/v2-1-master-text-to-video
v|Kling|Kling 2.1, text-to-video, Master-5.0s|160.0 per video|/kling/v2-1?model=kling/v2-1-master-text-to-video
v|Kling|Kling 2.1, video-generation, Pro-10.0s|100.0 per video|/kling/v2-1?model=kling/v2-1-pro
v|Kling|Kling 2.1, video-generation, Pro-5.0s|50.0 per video|/kling/v2-1?model=kling/v2-1-pro
v|Kling|Kling 2.1, video-generation, Standard-10.0s|50.0 per video|/kling/v2-1?model=kling/v2-1-standard
v|Kling|Kling 2.1, video-generation, Standard-5.0s|25.0 per video|/kling/v2-1?model=kling/v2-1-standard
v|Kling|Kling 3.0, video, with audio-1080P|27 per second|/kling-3-0
v|Kling|Kling 3.0, video, with audio-4K|67 per second|/kling-3-0
v|Kling|Kling 3.0, video, with audio-720P|20 per second|/kling-3-0
v|Kling|Kling 3.0, video, without audio-1080P|18 per second|/kling-3-0
v|Kling|Kling 3.0, video, without audio-4K|67 per second|/kling-3-0
v|Kling|Kling 3.0, video, without audio-720P|14 per second|/kling-3-0
v|Kling|Kling AI Avtar , lip sync, Pro-up to 15 secondss-1080p|16.0 per second|/kling-ai-avatar?model=kling/ai-avatar-v1-pro
v|Kling|Kling AI Avtar , lip sync, Standard-up to 15 secondss-720p|8.0 per second|/kling-ai-avatar?model=kling/v1-avatar-standard
v|Kling|kling 2.5 turbo , image-to-video, Turbo Pro-10.0s|84.0 per video|/kling-2-5?model=kling/v2-5-turbo-image-to-video-pro
v|Kling|kling 2.5 turbo , image-to-video, Turbo Pro-5.0s|42.0 per video|/kling-2-5?model=kling/v2-5-turbo-image-to-video-pro
v|Kling|kling 2.5 turbo , text-to-video, Turbo Pro-10.0s|84.0 per video|/kling-2-5?model=kling/v2-5-turbo-text-to-video-pro
v|Kling|kling 2.5 turbo , text-to-video, Turbo Pro-5.0s|42.0 per video|/kling-2-5?model=kling/v2-5-turbo-text-to-video-pro
v|Kling|kling 2.6 motion control, video to video, 1080P|18 per second|/kling-2.6-motion-control
v|Kling|kling 2.6 motion control, video-to-video, 720P|11 per second|/kling-2.6-motion-control
v|Kling|kling 2.6, image-to-video, with audio-10.0s|220.0 per video|/kling-2-6?model=kling-2.6/image-to-video
v|Kling|kling 2.6, image-to-video, with audio-5.0s|110.0 per video|/kling-2-6?model=kling-2.6/image-to-video
v|Kling|kling 2.6, image-to-video, without audio-10.0s|110.0 per video|/kling-2-6?model=kling-2.6/image-to-video
v|Kling|kling 2.6, image-to-video, without audio-5.0s|55.0 per video|/kling-2-6
v|Kling|kling 2.6, text-to-video, with audio-10.0s|220.0 per video|/kling-2-6?model=kling-2.6/text-to-video
v|Kling|kling 2.6, text-to-video, with audio-5.0s|110.0 per video|/kling-2-6?model=kling-2.6/text-to-video
v|Kling|kling 2.6, text-to-video, without audio-10.0s|110.0 per video|/kling-2-6?model=kling-2.6/text-to-video
v|Kling|kling 2.6, text-to-video, without audio-5.0s|55.0 per video|/kling-2-6?model=kling-2.6/text-to-video
v|Kling|kling 3.0 motion control, video-to-video, 1080P|27 per second|/kling-3-motion-control
v|Kling|kling 3.0 motion control, video-to-video, 720P|20 per second|/kling-3-motion-control
v|Kling|kling 3.0 turbo, image-to-video, 1080P|22.5 per second|/kling-3-0-turbo
v|Kling|kling 3.0 turbo, image-to-video, 720P|18 per second|/kling-3-0-turbo
v|Kling|kling 3.0 turbo, text-to-video, 1080P|22.5 per second|/kling-3-0-turbo
v|Kling|kling 3.0 turbo, text-to-video, 720P|18 per second|/kling-3-0-turbo
v|Other|MeiGen-AI InfiniteTalk, lip sync, up to 15 secondss-480p|3.0 per second|/infinitalk
v|Other|MeiGen-AI InfiniteTalk, lip sync, up to 15 secondss-720p|12.0 per second|/infinitalk
v|Other|hailuo 02, image-to-video, Pro-6.0s-1080p|57.0 per video|/hailuo-api?model=hailuo/02-image-to-video-pro
v|Other|hailuo 02, image-to-video, Standard-10.0s-512p|20.0 per video|/hailuo-api?model=hailuo/02-image-to-video-standard
v|Other|hailuo 02, image-to-video, Standard-10.0s-768p|50.0 per video|/hailuo-api?model=hailuo/02-image-to-video-standard
v|Other|hailuo 02, image-to-video, Standard-6.0s-512p|12.0 per video|/hailuo-api?model=hailuo/02-image-to-video-standard
v|Other|hailuo 02, text-to-video, Pro-6.0s-1080p|57.0 per video|/hailuo-api?model=hailuo/02-text-to-video-pro
v|Other|hailuo 02, text-to-video, Standard-10.0s-768p|50.0 per video|/hailuo-api?model=hailuo/02-text-to-video-standard
v|Other|hailuo 02, text-to-video, Standard-6.0s-768p|30.0 per video|/hailuo-api?model=hailuo/02-text-to-video-standard
v|Pixverse|pixverse-v6, Extend, 1080p(no aiduo)|14.4 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 1080p(with aiduo)|18.4 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 360p(no aiduo)|4 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 360p(with aiduo)|5.6 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 540p(no aiduo)|5.6 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 540p(with aiduo)|7.2 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 720p(no aiduo)|7.2 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Extend, 720p(with aiduo)|9.6 per second|/pixverse-v6?model=pixverse-v6/extend
v|Pixverse|pixverse-v6, Reference To Video, 1080p(no audio)|16.2 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 1080p(with audio)|20.7 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 360p(no audio)|4.5 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 360p(with audio)|6.3 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 540p(no audio)|6.3 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 540p(with audio)|8.1 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 720p(no audio)|8.1 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Reference To Video, 720p(with audio)|10.8 per second|/pixverse-v6?model=pixverse-v6/reference-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 1080p (no audio)|14.4 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 1080p (with audio)|18.4 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 360p (with audio)|5.6 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 360p（no audio）|4 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 540p (no audio)|5.6 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 540p (with audio)|7.2 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 720p (no audio)|7.2 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Pixverse|pixverse-v6, Text /Image to Video, 720p (with audio)|9.6 per second|/pixverse-v6?model=pixverse-v6/image-to-video
v|Runway|Runway Aleph|110.0 per video|https://docs.kie.ai/runway-api/generate-aleph-video
v|Runway|Runway, image-to-video, 10.0s-720p|30.0 per video|/runway-api
v|Runway|Runway, image-to-video, 5.0s-1080p|30.0 per video|/runway-api
v|Runway|Runway, image-to-video, 5.0s-720p|12.0 per video|/runway-api
v|Runway|Runway, text-to-video, 10.0s-720p|30.0 per video|/runway-api
v|Runway|Runway, text-to-video, 5.0s-1080p|30.0 per video|/runway-api
v|Runway|Runway, text-to-video, 5.0s-720p|12.0 per video|/runway-api
v|Topaz|Topaz Video Upscaler, upscale factor 1x/2x|8.0 per second|/topaz-video-upscaler
v|Topaz|Topaz Video Upscaler, upscale factor 4x|14 per second|/topaz-video-upscaler
v|Wan|Wan 2.2 A14B Turbo API Speech to Video, 480p|12.0 per second|/wan-speech-to-video-turbo
v|Wan|Wan 2.2 A14B Turbo API Speech to Video, 580p|18.0 per second|/wan-speech-to-video-turbo
v|Wan|Wan 2.2 A14B Turbo API Speech to Video, 720p|24.0 per second|/wan-speech-to-video-turbo
v|Wan|wan 2.2 Animate, 2.2 Animate Move, 1.0s-480p|6.0 per second|/wan-animate
v|Wan|wan 2.2 Animate, 2.2 Animate Move, 1.0s-580p|9.5 per second|/wan-animate
v|Wan|wan 2.2 Animate, 2.2 Animate Move, 1.0s-720p|12.5 per second|/wan-animate
v|Wan|wan 2.2 Animate, 2.2 Animate Replace, 1.0s-480p|6 per second|/wan-animate
v|Wan|wan 2.2 Animate, 2.2 Animate Replace, 1.0s-580p|9.5 per second|/wan-animate
v|Wan|wan 2.2 Animate, 2.2 Animate Replace, 1.0s-720p|12.5 per second|/wan-animate
v|Wan|wan 2.2,  text-to-video, 5.0s-480p|40.0 per video|/wan/v2-2?model=wan/2-2-a14b-text-to-video-turbo
v|Wan|wan 2.2,  text-to-video, 5.0s-580p|60.0 per video|/wan/v2-2?model=wan/2-2-a14b-text-to-video-turbo
v|Wan|wan 2.2,  text-to-video, 5.0s-720p|80.0 per video|/wan/v2-2?model=wan/2-2-a14b-text-to-video-turbo
v|Wan|wan 2.2, image-to-video, 5.0s-480p|40 per video|/wan/v2-2
v|Wan|wan 2.2, image-to-video, 5.0s-580p|60.0 per video|/wan/v2-2?model=wan/2-2-a14b-image-to-video-turbo
v|Wan|wan 2.2, image-to-video, 5.0s-720p|80.0 per video|/wan/v2-2?model=wan/2-2-a14b-image-to-video-turbo
v|Wan|wan 2.5, image-to-video, default-10.0s-1080p|200.0 per video|/wan-2-5?model=wan/2-5-image-to-video
v|Wan|wan 2.5, image-to-video, default-10.0s-720p|120.0 per video|/wan-2-5?model=wan/2-5-image-to-video
v|Wan|wan 2.5, image-to-video, default-5.0s-1080p|100.0 per video|/wan-2-5?model=wan/2-5-image-to-video
v|Wan|wan 2.5, image-to-video, default-5.0s-720p|60.0 per video|/wan-2-5?model=wan/2-5-image-to-video
v|Wan|wan 2.5, text-to-video, default-10.0s-1080p|200.0 per video|/wan-2-5?model=wan/2-5-text-to-video
v|Wan|wan 2.5, text-to-video, default-10.0s-720p|120.0 per video|/wan-2-5?model=wan/2-5-text-to-video
v|Wan|wan 2.5, text-to-video, default-5.0s-1080p|100.0 per video|/wan-2-5?model=wan/2-5-text-to-video
v|Wan|wan 2.5, text-to-video, default-5.0s-720p|60.0 per video|/wan-2-5?model=wan/2-5-text-to-video
v|Wan|wan 2.6, image-to-video, 10.0s-1080p|209.5 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, image-to-video, 10.0s-720p|140.0 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, image-to-video, 15.0s-1080p|315.0 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, image-to-video, 15.0s-720p|210.0 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, image-to-video, 5.0s-1080p|104.5 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, image-to-video, 5.0s-720p|70.0 per video|/wan-2-6?model=wan/2-6-image-to-video
v|Wan|wan 2.6, text to video, 10.0s-1080p|209.5 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, text to video, 10.0s-720p|140.0 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, text to video, 15.0s-1080p|315.0 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, text to video, 15.0s-720p|210.0 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, text to video, 5.0s-1080p|104.5 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, text to video, 5.0s-720p|70.0 per video|/wan-2-6?model=wan/2-6-text-to-video
v|Wan|wan 2.6, video-to-video, 10.0s-1080p|209.5 per video|/wan-2-6?model=wan/2-6-video-to-video
v|Wan|wan 2.6, video-to-video, 10.0s-720p|140.0 per video|/wan-2-6?model=wan/2-6-video-to-video
v|Wan|wan 2.6, video-to-video, 5.0s-1080p|104.5 per video|/wan-2-6?model=wan/2-6-video-to-video
v|Wan|wan 2.6, video-to-video, 5.0s-720p|70.0 per video|/wan-2-6?model=wan/2-6-video-to-video
v|Wan|wan 2.7 video, image-to-video, 1080p|24 per second|/wan-2-7-video?model=wan/2-7-image-to-video
v|Wan|wan 2.7 video, image-to-video, 720p|16 per second|/wan-2-7-video?model=wan/2-7-image-to-video
v|Wan|wan 2.7 video, r2v, 1080p|24 per second|/wan-2-7-video?model=wan/2-7-r2v
v|Wan|wan 2.7 video, r2v, 720p|16 per second|/wan-2-7-video?model=wan/2-7-r2v
v|Wan|wan 2.7 video, text-to-video, 1080p|24 per second|/wan-2-7-video?model=wan/2-7-text-to-video
v|Wan|wan 2.7 video, text-to-video, 720p|16 per second|/wan-2-7-video?model=wan/2-7-text-to-video
v|Wan|wan 2.7 video, videoedit, 1080p|24 per second|/wan-2-7-video?model=wan/2-7-videoedit
v|Wan|wan 2.7 video, videoedit, 720p|16 per second|/wan-2-7-video?model=wan/2-7-videoedit
v|Wan|wan 3.0 video, 1080p, video|32 per second|/wan3.0-video
v|Wan|wan 3.0 video, 480p, video|8 per second|/wan3.0-video
v|Wan|wan 3.0 video, 720p, video|16 per second|/wan3.0-video
v|Wan|wan3.0 video prime, 1080p, video|50.4 per second|/wan3.0-video-prime
v|Wan|wan3.0 video prime, 480p, video|12.2 per second|/wan3.0-video-prime
v|Wan|wan3.0 video prime, 720p, video|25.2 per second|/wan3.0-video-prime
```

# APPENDIX 3 — Image/video ids from `GET https://api.kie.ai/api/v1/playground/model-paths` (177 of 254; chat/music/TTS filtered out)

Ids here WITHOUT a doc page (UNVERIFIED for API use): `nano-banana-upscale`, `kie/image-refiner`, `ideogram/v3-reframe` (priced), `infinitalk/from-text`, `kling-o1/*` (4), `kling/ai-avatar-v1-pro`, `kling/v1-avatar-standard`, `kling/v1-tts`, `luma-dream-machine/modify`, `luma-dream-machine/ray-2-flash-reframe`, `sora-2-*` / `sora2-remix` / `sora-watermark-remover` (11), `v3-api`, `wantest/2-5-text-to-video`, `bytedance/omni-human`, `gemini-omni-character`.

```
4o-image-api
bytedance/omni-human
bytedance/seedance-1.5-pro
bytedance/seedance-2
bytedance/seedance-2-5
bytedance/seedance-2-fast
bytedance/seedance-2-mini
bytedance/seedream
bytedance/seedream-v4-edit
bytedance/seedream-v4-text-to-image
bytedance/v1-lite-image-to-video
bytedance/v1-lite-text-to-video
bytedance/v1-pro-fast-image-to-video
bytedance/v1-pro-image-to-video
bytedance/v1-pro-text-to-video
flux-2/flex-image-to-image
flux-2/flex-text-to-image
flux-2/pro-image-to-image
flux-2/pro-text-to-image
flux1-kontext
gemini-omni-character
gemini-omni-video
google/gemini-omni-flash-1-1
google/imagen4
google/imagen4-fast
google/imagen4-ultra
google/nano-banana
google/nano-banana-edit
gpt-image-2-5-flare-image-to-image
gpt-image-2-5-flare-text-to-image
gpt-image-2-5-sunburst-image-to-image
gpt-image-2-5-sunburst-text-to-image
gpt-image-2-image-to-image
gpt-image-2-text-to-image
gpt-image/1.5-image-to-image
gpt-image/1.5-text-to-image
grok-imagine-image-2-0/image-edit
grok-imagine-image-2-0/segment-edit
grok-imagine-image-2-0/segment-map
grok-imagine-image-2-0/text-to-image
grok-imagine-video-1-5-preview
grok-imagine/extend
grok-imagine/image-to-image
grok-imagine/image-to-video
grok-imagine/text-to-image
grok-imagine/text-to-video
grok-imagine/upscale
hailuo/02-image-to-video-pro
hailuo/02-image-to-video-standard
hailuo/02-text-to-video-pro
hailuo/02-text-to-video-standard
hailuo/2-3-image-to-video-pro
hailuo/2-3-image-to-video-standard
happyhorse-1-1/image-to-video
happyhorse-1-1/reference-to-video
happyhorse-1-1/text-to-video
happyhorse/image-to-video
happyhorse/reference-to-video
happyhorse/text-to-video
happyhorse/video-edit
ideogram/character
ideogram/character-edit
ideogram/character-remix
ideogram/v3-edit
ideogram/v3-reframe
ideogram/v3-remix
ideogram/v3-text-to-image
infinitalk/from-audio
infinitalk/from-text
kie/image-refiner
kling-2.6/image-to-video
kling-2.6/motion-control
kling-2.6/text-to-video
kling-3.0-omni/image-to-video
kling-3.0-omni/reference-to-video
kling-3.0-omni/text-to-video
kling-3.0-omni/transformation
kling-3.0/motion-control
kling-3.0/video
kling-o1/kling-hig-image-omni-flf-o1
kling-o1/kling-hig-image-reference-o1
kling-o1/kling-hig-video-edit-o1
kling-o1/kling-hig-video-reference-o1
kling/ai-avatar-pro
kling/ai-avatar-standard
kling/ai-avatar-v1-pro
kling/v1-avatar-standard
kling/v1-tts
kling/v2-1-master-image-to-video
kling/v2-1-master-text-to-video
kling/v2-1-pro
kling/v2-1-standard
kling/v2-5-turbo-image-to-video-pro
kling/v2-5-turbo-text-to-video-pro
kling/v3-turbo-image-to-video
kling/v3-turbo-text-to-video
luma-dream-machine/modify
luma-dream-machine/ray-2-flash-reframe
minimax-h3/image-to-video
minimax-h3/reference-to-video
minimax-h3/text-to-video
nano-banana-2
nano-banana-2-lite
nano-banana-pro
nano-banana-upscale
omnihuman-1-5
omnihuman-1-5/human-identification
omnihuman-1-5/subject-detection
pixverse-v6/extend
pixverse-v6/image-to-video
pixverse-v6/reference-to-video
pixverse-v6/text-to-video
pixverse-v6/transition
qwen/image-edit
qwen/image-to-image
qwen/text-to-image
qwen2-1/image-to-image
qwen2-1/text-to-image
qwen2/image-edit
qwen2/text-to-image
qwen3/image-to-image
qwen3/pro-image-to-image
qwen3/pro-text-to-image
qwen3/text-to-image
recraft/crisp-upscale
recraft/remove-background
runway
runway/extend-ai-video
runway/gen4-aleph
seedream/4.5-edit
seedream/4.5-text-to-image
seedream/5-lite-image-to-image
seedream/5-lite-text-to-image
seedream/5-pro-image-to-image
seedream/5-pro-layer-decomposition
seedream/5-pro-text-to-image
sora-2-characters
sora-2-characters-pro
sora-2-image-to-video
sora-2-image-to-video-stable
sora-2-pro-image-to-video
sora-2-pro-storyboard
sora-2-pro-text-to-video
sora-2-text-to-video
sora-2-text-to-video-stable
sora-watermark-remover
sora2-remix
topaz/image-upscale
topaz/video-upscale
v3-api
veo-3-1
veo/extend
veo/get-1080p-video
veo/get-4k-video
volcengine/video-to-video-lip-sync
wan/2-2-a14b-image-to-video-turbo
wan/2-2-a14b-speech-to-video-turbo
wan/2-2-a14b-text-to-video-turbo
wan/2-2-animate-move
wan/2-2-animate-replace
wan/2-5-image-to-video
wan/2-5-text-to-video
wan/2-6-flash-image-to-video
wan/2-6-flash-video-to-video
wan/2-6-image-to-video
wan/2-6-text-to-video
wan/2-6-video-to-video
wan/2-7-image
wan/2-7-image-pro
wan/2-7-image-to-video
wan/2-7-r2v
wan/2-7-text-to-video
wan/2-7-videoedit
wan/3-0-video
wan/3-0-video-prime
wantest/2-5-text-to-video
z-image
```
