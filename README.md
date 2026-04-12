# Oltaflock Creative Studio

An internal production dashboard for multi-AI content generation — text-to-image, text-to-video, and image-to-image transformations. Built for authorized Oltaflock personnel to generate, manage, and rate media using multiple AI models.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 (code-split via React.lazy) |
| Routing | React Router v6 |
| State | Zustand (client) + TanStack React Query (server) |
| Backend | Supabase (Auth, Postgres, Edge Functions, Storage) |
| AI Processing | n8n workflows (webhook-based) |
| Email | Resend (transactional + SMTP for auth emails) |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Forms | React Hook Form + Zod |

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (React SPA)                         │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │   Mode &   │  │  Prompt &  │  │   Output   │  │   Request    │  │
│  │  History   │  │  Controls  │  │  Display   │  │   Details    │  │
│  │ (sidebar)  │  │  (center)  │  │   (main)   │  │  (sidebar)   │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  │
│        │               │               │                │           │
│        └───────────────┴───────┬───────┴────────────────┘           │
│                                │                                     │
│                    Zustand Store + React Query                       │
│                         (polling every 5s)                           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────▼──────┐          ┌───────▼───────┐
             │  Supabase   │          │     n8n       │
             │             │          │  Workflows    │
             │  - Auth     │          │               │
             │  - Postgres │ callback │  - Image Gen  │
             │  - RLS      │◄────────┤  - Video Gen  │
             │  - Storage  │         │  - I2I Gen    │
             │  - Edge Fns │         │  - Balance    │
             └──────┬──────┘          └───────────────┘
                    │
             ┌──────▼──────┐
             │   Resend    │
             │             │
             │  - Welcome  │
             │  - Auth     │
             │  - Alerts   │
             └─────────────┘
```

## Generation Flow (End-to-End)

```
User                    Frontend                  Supabase               n8n                  Resend
 │                         │                         │                    │                      │
 ├─ Select model ─────────►│                         │                    │                      │
 ├─ Enter prompt ─────────►│                         │                    │                      │
 ├─ Click Generate ───────►│                         │                    │                      │
 │                         ├─ Check credits ─────────►│                    │                      │
 │                         ├─ Deduct credits ────────►│                    │                      │
 │                         ├─ INSERT generation ─────►│ (status: queued)   │                      │
 │                         ├─ POST webhook ──────────────────────────────►│                      │
 │                         │                         │                    ├─ AI Processing       │
 │                         │◄── Poll every 5s ───────│                    │   (30s - 5min)       │
 │                         │                         │◄── POST callback ──┤                      │
 │                         │                         │  (status: done,    │                      │
 │                         │                         │   output_url set)  │                      │
 │                         │◄── Poll detects done ───│                    │                      │
 │◄── Display result ──────┤                         │                    │                      │
 ├─ Rate (1-5 stars) ─────►├─ UPDATE rating ─────────►│                    │                      │
```

## Multi-User System

### Authentication
- Email/password + magic link login via Supabase Auth
- Signup restricted to `@oltaflock.ai` domain (enforced in frontend + DB trigger)
- Emails auto-confirmed for `@oltaflock.ai` accounts (no verification needed)
- Auth emails (magic links, password resets) sent via Resend SMTP

### Per-User Isolation (Row-Level Security)
Every table enforces RLS — users only see their own data:
- `generations` — each user's generation history
- `jobs` — job tracking
- `profiles` — display name, email
- `user_credits` — individual credit balance
- `credit_logs` — transaction history
- `storage.objects` — uploads scoped to `{userId}/` folder

### Credit System
- New users receive **1,000 credits** on signup
- Credits deducted on each generation based on model + settings
- Balance shown in header with real-time updates
- Insufficient credit warning in cost preview panel
- Transaction log tracks every deduction with model, generation ID, timestamp

### Signup Flow
```
User signs up
  → Supabase creates auth.users record
  → DB trigger fires (handle_new_user):
      1. Creates profile with display_name from email
      2. Creates user_credits with 1000 balance
      3. Logs initial credit grant
      4. Auto-confirms @oltaflock.ai email
      5. Sends welcome email via Resend
```

## Database Schema

### Tables

| Table | RLS | Purpose |
|-------|-----|---------|
| `generations` | Yes | Generation records (prompt, model, status, output, rating) |
| `profiles` | Yes | User display names and metadata |
| `user_credits` | Yes | Per-user credit balance, total spent, generation count |
| `credit_logs` | Yes | Credit transaction history with generation references |
| `jobs` | Yes | Job tracking (legacy, parallel to generations) |

### Key Columns: `generations`
```
id, request_id, type (image/video), model, user_prompt, final_prompt,
model_params (JSONB), status (queued/running/done/error), output_url,
error_message, rating (1-5), progress (0-100), external_task_id, user_id
```

### Key Columns: `user_credits`
```
user_id, balance (starts at 1000), total_spent, total_generations
```

## Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `generation-callback` | Webhook secret (`x-webhook-secret` header) | Receives completion callbacks from n8n, updates generation status |
| `check-balance` | JWT | Proxies credit balance check to n8n webhook |
| `send-email` | JWT | Sends transactional emails via Resend (welcome, notifications, alerts) |

### Email Templates (via `send-email`)
- **welcome** — sent on signup with credit info
- **generation_complete** — sent when a generation finishes (with preview)
- **low_credits** — alert when balance is low
- **password_reset** — custom branded reset email

## Supported Models

### Text-to-Image
| Model | Credits | Controls |
|-------|---------|----------|
| Nano Banana Pro | 18–24 | Resolution (1K/2K/4K), aspect ratio, output format |
| Seedream 4.5 | 6.5 | Aspect ratio, quality |
| Flux 2 Flex | 14–24 | Resolution, aspect ratio |
| Flux 2 Pro | 5–7 | Resolution, aspect ratio |
| GPT-4o Image | 10 | Aspect ratio |
| Z Image | 0.8 | Aspect ratio |

### Text-to-Video
| Model | Credits | Controls |
|-------|---------|----------|
| Veo 3.1 | 60–250 | Variant (fast/quality), aspect ratio |
| Sora 2 Pro | 150–630 | Quality, duration (10s/15s), character IDs |
| Kling 2.6 | 55–220 | Duration (5s/10s), sound toggle |
| Seedance 1.0 | 25–50 | Variant (lite/pro) |
| Grok Imagine | 30 | — |

### Image-to-Image
| Model | Credits | Controls |
|-------|---------|----------|
| Nano Banana Pro I2I | 18–24 | Resolution, aspect ratio |
| Seedream 4.5 Edit | 6.5 | Aspect ratio, quality |
| Flux Flex I2I | 14–24 | Resolution, aspect ratio |
| Flux Pro I2I | 5–7 | Resolution, aspect ratio |
| Qwen Image Edit | 2 | — |

**Pricing:** 1000 credits = $5 USD

## Directory Structure

```
src/
├── pages/                        # Route pages (lazy-loaded)
│   ├── Index.tsx                 # Main studio dashboard (protected)
│   ├── Auth.tsx                  # Login/signup
│   └── NotFound.tsx              # 404
├── components/
│   ├── studio/                   # Studio UI components (18 files)
│   │   ├── GenerateButton.tsx    # Submit → credit check → DB → n8n webhook
│   │   ├── ModeSelector.tsx      # image / video / image-to-image toggle
│   │   ├── ModelSelector.tsx     # Model picker with descriptions
│   │   ├── PromptInput.tsx       # Prompt textarea
│   │   ├── ReferenceUpload.tsx   # Image upload for I2I (Supabase Storage)
│   │   ├── ModelControls.tsx     # Dynamic per-model control panel
│   │   ├── OutputDisplay.tsx     # Result preview, progress, fullscreen, download
│   │   ├── RatingPanel.tsx       # 5-star rating after generation
│   │   ├── RequestsPanel.tsx     # Generation history sidebar
│   │   ├── RequestDetailPanel.tsx# Metadata for selected job
│   │   ├── CostPreview.tsx       # Estimated cost + remaining balance
│   │   ├── BalanceButton.tsx     # Per-user credit balance from DB
│   │   ├── UserMenu.tsx          # Profile + sign out
│   │   ├── ProfileDialog.tsx     # Display name + password change
│   │   └── ThemeToggle.tsx       # Dark/light mode
│   ├── ErrorBoundary.tsx         # Crash recovery UI
│   ├── ProtectedRoute.tsx        # Auth guard
│   └── ui/                       # shadcn/ui components (48 files)
├── store/
│   └── generationStore.ts        # Zustand store (mode, model, prompt, active jobs)
├── hooks/
│   ├── useAuth.tsx               # Auth context (signIn, signUp, signOut, magicLink)
│   ├── useGenerations.tsx        # CRUD + polling + auto-timeout for generations
│   ├── useUserCredits.tsx        # Per-user credit balance, deduction, logs
│   ├── usePricing.ts             # Cost calculation per model + controls
│   ├── useRetryGeneration.tsx    # Retry failed jobs
│   ├── useGenerationProgress.tsx # Simulated progress bar (0-100%)
│   ├── useJobs.tsx               # Job management
│   ├── useCreditLogs.tsx         # Credit transaction history
│   └── useNotificationSound.tsx  # Audio on completion
├── types/
│   └── generation.ts             # All type definitions (models, jobs, modes, API names)
├── config/
│   └── pricing.ts                # Credit costs per model/resolution/duration
├── integrations/supabase/
│   ├── client.ts                 # Supabase client init (reads from env)
│   └── types.ts                  # Auto-generated DB types
└── lib/
    └── utils.ts                  # cn() classname helper

supabase/
├── config.toml                   # Project config
├── functions/
│   ├── generation-callback/      # Webhook: n8n → Supabase (auth via shared secret)
│   ├── check-balance/            # Proxy: balance check via n8n
│   └── send-email/               # Resend: transactional emails with templates
└── migrations/                   # 10 SQL migrations (schema, RLS, indexes, triggers)
```

## Security

- **RLS on all tables** — users only access their own data
- **Service role policies** — edge functions can update generations via service key
- **Webhook secret** — `generation-callback` validates `x-webhook-secret` header
- **CORS restricted** — callback endpoint only accepts requests from n8n domain
- **Storage scoping** — uploads restricted to `{userId}/` folder prefix
- **Domain restriction** — signup limited to `@oltaflock.ai` emails
- **Auto-timeout** — generations stuck >10 minutes auto-marked as errored
- **Error boundary** — app-level crash recovery instead of white screen

## Environment Variables

### Frontend (`.env`)
```
VITE_SUPABASE_PROJECT_ID=xynnkyipiwkvbavquypo
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_URL=https://xynnkyipiwkvbavquypo.supabase.co
VITE_WEBHOOK_URL=<n8n webhook URL>              # optional, has fallback
VITE_IMAGE_TO_IMAGE_WEBHOOK_URL=<n8n i2i URL>   # optional, has fallback
```

### Edge Function Secrets (Supabase Dashboard)
```
WEBHOOK_SECRET=<shared secret for n8n callback auth>
RESEND_API_KEY=<Resend API key>
FROM_EMAIL=Oltaflock Studio <studio@oltaflock.ai>
```

## Development

```bash
npm i           # Install dependencies
npm run dev     # Start dev server (localhost:8080)
npm run build   # Production build (code-split)
npm run lint    # Run ESLint
npm run preview # Preview production build
```

## Deployment

Hosted on Vercel. Pushes to `main` trigger automatic deployments.

Edge functions are deployed to Supabase via MCP or the Supabase CLI:
```bash
supabase functions deploy generation-callback
supabase functions deploy check-balance
supabase functions deploy send-email
```

## License

Internal use only. All rights reserved by Oltaflock.
