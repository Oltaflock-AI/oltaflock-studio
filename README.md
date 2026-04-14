# Oltaflock Creative Studio

An internal AI media production platform for text-to-image, text-to-video, and image-to-image generation. Features a Claude-powered prompt brain that learns from user ratings, 16+ AI models via Kie.ai, and a modular tile-based UI with 3D interactive effects.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| State | Zustand (client) + TanStack React Query (server) |
| Backend | Supabase (Auth, Postgres, Edge Functions, Storage) |
| AI Models | Kie.ai (unified API for 16+ image/video models) |
| Prompt Intelligence | Claude API (prompt enhancement + learning from ratings) |
| Email | Resend (transactional + SMTP for auth) |
| Hosting | Vercel (frontend) + Supabase (backend) |

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA on Vercel)                         │
│                                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Mode &  │  │   Prompt &   │  │    Output    │  │   Request    │    │
│  │ History  │  │  Controls &  │  │   Display    │  │   Details    │    │
│  │  (tile)  │  │ Brain Toggle │  │   (tile)     │  │   (tile)     │    │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│       └───────────────┴────────┬────────┴──────────────────┘            │
│                                │                                         │
│               Zustand Store + React Query (polls every 5s)               │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    supabase.functions.invoke('generate')
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│                    Supabase Edge Functions                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    generate/index.ts                             │    │
│  │                                                                  │    │
│  │  1. Auth (verify JWT)                                           │    │
│  │  2. Credit check (server-side, no client manipulation)          │    │
│  │  3. Claude Prompt Brain (enhance prompt with learned patterns)  │    │
│  │  4. Route to Kie.ai (model-specific endpoint + payload)         │    │
│  │  5. Store task_id → poll or await callback                      │    │
│  └──────────┬──────────────────────────────┬───────────────────────┘    │
│             │                              │                             │
│  ┌──────────▼──────────┐    ┌──────────────▼──────────────┐             │
│  │  prompt-brain.ts    │    │  model-routes.ts             │             │
│  │                     │    │                              │             │
│  │  Claude API call    │    │  16 models mapped to:        │             │
│  │  with few-shot      │    │  - Kie.ai endpoint           │             │
│  │  examples from      │    │  - Exact payload structure   │             │
│  │  user's rated       │    │  - Model persona (for brain) │             │
│  │  generations        │    │                              │             │
│  └─────────────────────┘    └──────────────────────────────┘             │
│                                                                          │
│  ┌─────────────────────┐    ┌──────────────────────────────┐            │
│  │  poll-tasks/        │    │  generation-callback/         │            │
│  │                     │    │                              │            │
│  │  Check pending      │    │  Receives Kie.ai webhook     │            │
│  │  tasks against      │    │  when async tasks complete   │            │
│  │  Kie.ai status API  │    │  Updates DB + deducts credits│            │
│  └─────────────────────┘    └──────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────▼──────┐          ┌───────▼───────┐
             │  Supabase   │          │   Kie.ai      │
             │  Postgres   │          │   API          │
             │             │          │               │
             │  - Auth     │          │  Endpoints:   │
             │  - RLS      │          │  /jobs/createTask      (most models)
             │  - Storage  │          │  /veo/generate         (Veo 3.1)
             │  - Profiles │          │  /gpt4o-image/generate (GPT-4o)
             │  - Credits  │          │  /jobs/recordInfo      (status poll)
             └─────────────┘          └───────────────┘
```

## Generation Flow

```
User clicks Generate
  │
  ├─ Client: INSERT generation (status: queued) into Supabase
  ├─ Client: supabase.functions.invoke('generate', { prompt, model, controls })
  │
  └─ Edge Function (generate/index.ts):
       ├─ Verify user JWT
       ├─ Check credits server-side (no client-side deduction)
       ├─ [Optional] Call Claude API → enhance prompt with learned patterns
       ├─ Build Kie.ai payload (per-model endpoint + payload structure)
       ├─ POST to Kie.ai → receive task_id
       ├─ Store task_id in generations.external_task_id
       └─ Return { task_id } to client

  Meanwhile:
  ├─ Client polls Supabase every 5s for status changes
  ├─ Kie.ai processes generation (30s - 5min)
  └─ Kie.ai calls back → generation-callback edge function
       ├─ Parse resultJson.resultUrls[0]
       ├─ Update generation: status=done, output_url=...
       └─ Deduct credits server-side

  User sees result → rates 1-5 stars
  │
  └─ Next generation: Claude brain fetches top-rated examples
     and avoids low-rated patterns → prompt quality improves over time
```

## Prompt Brain (Self-Learning System)

The Claude-powered prompt brain enhances user prompts before they hit Kie.ai:

```
Generation #1: "a dog" → Brain (no history) → "a golden retriever in soft
  afternoon light, shallow depth of field" → User rates ★★★★★

Generation #2: "a cat" → Brain (sees #1 was 5★) → "a tabby cat in warm
  afternoon light, bokeh background" → User rates ★★★★★

Generation #3: "a bird" → Brain (sees #1, #2 patterns) → adapts to user's
  aesthetic preferences automatically
```

| Generations rated | Brain behavior |
|---|---|
| 0 | Uses model persona only. Generic but correct. |
| 3-5 | Starts seeing user's stylistic preferences. |
| 10-15 | Clear personal style profile. Strongly personalized. |
| 20+ | Reliably matches user's taste. Avoids known bad patterns. |

**Cost:** ~$0.001-0.002 per enhancement call (Claude Sonnet). Toggleable via "Prompt Brain" switch.

## Supported Models

### Text-to-Image (via `/jobs/createTask`)
| Model | Kie.ai Model Name | Credits |
|-------|--------------------|---------|
| Nano Banana Pro | `nano-banana-pro` | 18-24 |
| Seedream 4.5 | `seedream/4.5-text-to-image` | 6.5 |
| Flux 2 Flex | `flux-2/flex-text-to-image` | 14-24 |
| Flux 2 Pro | `flux-2/pro-text-to-image` | 5-7 |
| Z Image | `z-image` | 0.8 |

### Text-to-Image (dedicated endpoints)
| Model | Endpoint | Credits |
|-------|----------|---------|
| GPT-4o Image | `/gpt4o-image/generate` | 10 |

### Text-to-Video
| Model | Kie.ai Model Name | Endpoint | Credits |
|-------|--------------------|----------|---------|
| Veo 3.1 | `veo3_fast` / `veo3_quality` | `/veo/generate` | 60-250 |
| Sora 2 Pro | `sora-2-pro-text-to-video` | `/jobs/createTask` | 150-630 |
| Kling 2.6 | `kling-2.6/text-to-video` | `/jobs/createTask` | 55-220 |
| Seedance 1.0 | `bytedance/v1-{variant}-text-to-video` | `/jobs/createTask` | 25-50 |
| Grok Imagine | `grok-imagine/text-to-video` | `/jobs/createTask` | 30 |

### Image-to-Image (via `/jobs/createTask`)
| Model | Kie.ai Model Name | Image Field |
|-------|--------------------|-------------|
| Nano Banana Pro | `nano-banana-pro` | `input_image_input` |
| Seedream 4.5 Edit | `seedream/4.5-edit` | `image_urls` |
| Flux Flex I2I | `flux-2/flex-image-to-image` | `input_urls` |
| Flux Pro I2I | `flux-2/pro-image-to-image` | `input_urls` |
| Qwen Image Edit | `qwen/image-edit` | `image_url` |

**Pricing:** 1000 credits = $5 USD

## Edge Functions

| Function | JWT | Purpose |
|----------|-----|---------|
| `generate` | No (handles auth internally) | Main orchestrator: auth → credits → brain → Kie.ai |
| `poll-tasks` | No | Checks pending async tasks against Kie.ai status API |
| `generation-callback` | No (receives Kie.ai webhooks) | Updates generation on async completion + deducts credits |
| `delete-account` | No (handles auth internally) | Cascade deletes all user data + auth account |
| `send-email` | Yes | Transactional emails via Resend |

## Database Schema

| Table | RLS | Purpose |
|-------|-----|---------|
| `generations` | Yes | Generation records (prompt, model, status, output, rating, external_task_id) |
| `profiles` | Yes | User display name, avatar_url, email |
| `user_credits` | Yes | Per-user credit balance, total spent, generation count |
| `credit_logs` | Yes | Credit transaction history |
| `jobs` | Yes | Legacy job tracking |

## UI Features

- **Tile-based dashboard** with rounded card layout and gaps between sections
- **3D interactive effects**: TiltCard (mouse-tracked perspective), MouseParallax (depth layers), GlowOrb (animated gradient background with mouse tracking)
- **Framer Motion everywhere**: page transitions, stagger animations, crossfade on model switch, icon rotation on theme toggle, AnimatePresence exit animations
- **Skeleton loading screens** replacing spinner-only states
- **Settings page** (`/settings`): Profile (avatar upload + crop), Security (password + strength indicator), Preferences (theme, default mode, sounds), Account (delete with type-to-confirm)
- **Consistent button system**: `active:scale-[0.97]` press, focus glow, `rounded-lg` everywhere
- **Accessibility**: `MotionConfig reducedMotion="user"`, `prefers-reduced-motion` CSS fallback

## Directory Structure

```
src/
├── pages/                         # Route pages (lazy-loaded)
│   ├── Index.tsx                  # Main studio (modular tile layout)
│   ├── Auth.tsx                   # Login/signup (GlowOrb + TiltCard)
│   ├── Settings.tsx               # Full settings page (4 sections)
│   └── NotFound.tsx
├── components/
│   ├── layout/                    # Modular layout shell (5 components)
│   │   ├── StudioLayout.tsx       # Tile-based 4-column layout
│   │   ├── StudioHeader.tsx       # Header with motion entrance
│   │   ├── LeftSidebar.tsx        # Mode + History tiles
│   │   ├── ControlsPanel.tsx      # Prompt + Model + Generate tiles
│   │   └── RightSidebar.tsx       # Request details tile
│   ├── studio/                    # Studio components
│   │   ├── GenerateButton.tsx     # Edge function invocation (no n8n)
│   │   ├── PromptBrainToggle.tsx  # On/off switch for Claude enhancement
│   │   ├── OutputDisplay.tsx      # Result preview + GlowOrb empty state
│   │   ├── RequestsPanel.tsx      # Staggered history list
│   │   └── ...                    # 15+ more studio components
│   ├── settings/                  # Settings page sections
│   │   ├── ProfileSection.tsx     # Name + avatar upload
│   │   ├── SecuritySection.tsx    # Password + 2FA placeholder
│   │   ├── PreferencesSection.tsx # Theme, mode, sounds
│   │   ├── AccountSection.tsx     # Delete account with confirmation
│   │   ├── AvatarUpload.tsx       # Upload + crop via react-cropper
│   │   └── AvatarCropDialog.tsx
│   ├── effects/                   # Visual effects
│   │   ├── GlowOrb.tsx           # Animated gradient orbs (mouse-tracked)
│   │   ├── TiltCard.tsx          # 3D perspective on mouse move
│   │   └── MouseParallax.tsx     # Depth layers following cursor
│   └── ui/                        # shadcn/ui components (48 files)
├── store/
│   ├── generationStore.ts         # Zustand (mode, model, prompt, brain toggle)
│   └── preferencesStore.ts        # Persisted preferences (theme, mode, sounds)
├── hooks/
│   ├── useAuth.tsx                # Auth context
│   ├── useGenerations.tsx         # CRUD + polling for generations
│   ├── useProfile.ts             # Centralized profile + avatar hook
│   ├── useUserCredits.tsx         # Credit balance + deduction
│   └── ...                        # 6 more hooks
├── lib/
│   ├── motion.ts                  # Framer Motion variants library
│   └── utils.ts                   # cn() helper
└── types/
    └── generation.ts              # All model types, API name mappings

supabase/
├── config.toml
├── functions/
│   ├── generate/                  # Main generation orchestrator
│   │   ├── index.ts              # Auth → credits → brain → Kie.ai
│   │   ├── prompt-brain.ts       # Claude-powered prompt enhancement
│   │   └── model-routes.ts       # 16 models → Kie.ai endpoints + payloads
│   ├── poll-tasks/               # Async task status checker
│   ├── generation-callback/      # Kie.ai webhook receiver
│   ├── delete-account/           # Cascade account deletion
│   └── send-email/               # Resend transactional emails
└── migrations/                    # SQL migrations (schema, RLS, triggers)
```

## Environment Variables

### Frontend (`.env`)
```
VITE_SUPABASE_PROJECT_ID=<project id>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_URL=https://<project>.supabase.co
```

### Supabase Edge Function Secrets
```
KIE_AI_API_KEY=<Kie.ai API key>
ANTHROPIC_API_KEY=<Claude API key for prompt brain>
RESEND_API_KEY=<Resend API key>
FROM_EMAIL=Oltaflock Studio <studio@oltaflock.ai>
```

## Development

```bash
bun install       # Install dependencies
bun run dev       # Start dev server (localhost:8080)
bun run build     # Production build
bun run lint      # ESLint
```

## Deployment

**Frontend:** Vercel (auto-deploys on push to `main`)

**Edge Functions:**
```bash
supabase functions deploy generate --no-verify-jwt
supabase functions deploy poll-tasks --no-verify-jwt
supabase functions deploy generation-callback --no-verify-jwt
supabase functions deploy delete-account
supabase functions deploy send-email
```

## License

Internal use only. All rights reserved by Oltaflock.
