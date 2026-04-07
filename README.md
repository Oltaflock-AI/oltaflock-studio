# OltaFlock Creative Studio

An internal production dashboard for multi-AI content generation — text-to-image, text-to-video, and image-to-image transformations. Built for authorized personnel to generate, manage, and rate media using multiple AI models.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| State | Zustand |
| Backend/Auth | Supabase |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Data Fetching | TanStack React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Mode &   │  │ Prompt & │  │  Output  │  │  Request  │  │
│  │  History  │  │ Controls │  │ Display  │  │  Details  │  │
│  │ (sidebar) │  │ (center) │  │  (main)  │  │ (sidebar) │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                       │                                     │
│              Zustand Store + React Query                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐         ┌─────▼─────┐
   │Supabase │         │   n8n     │
   │ - Auth  │         │ Workflows │
   │ - DB    │         │ (AI Gen)  │
   │ - Edge  │◄────────│           │
   │  Funcs  │callback │           │
   └─────────┘         └───────────┘
```

## Directory Structure

```
src/
├── pages/                     # Route pages
│   ├── Index.tsx              # Main studio dashboard (protected)
│   ├── Auth.tsx               # Login/signup
│   └── NotFound.tsx           # 404
├── components/
│   ├── studio/                # Studio UI components
│   │   ├── GenerateButton.tsx # Triggers generation → Supabase + n8n webhook
│   │   ├── ModeSelector.tsx   # Text-to-Image / Video / Image-to-Image
│   │   ├── ModelSelector.tsx  # Model picker with descriptions
│   │   ├── PromptInput.tsx    # Prompt textarea
│   │   ├── ReferenceUpload.tsx# Image upload for I2I mode
│   │   ├── ModelControls.tsx  # Renders model-specific control panel
│   │   ├── OutputDisplay.tsx  # Result preview, progress bar, download
│   │   ├── RatingPanel.tsx    # 5-star rating after generation
│   │   ├── RequestsPanel.tsx  # Generation history sidebar
│   │   ├── RequestDetailPanel.tsx # Metadata for selected job
│   │   ├── CostPreview.tsx    # Estimated cost before generating
│   │   ├── BalanceButton.tsx  # Credit balance display
│   │   └── UserMenu.tsx       # Profile/logout
│   ├── studio/controls/       # Per-model control components
│   │   ├── Veo31Controls.tsx
│   │   ├── Sora2ProControls.tsx
│   │   ├── FluxFlexControls.tsx
│   │   └── ... (one per model)
│   ├── ui/                    # shadcn/ui base components
│   └── ProtectedRoute.tsx     # Auth guard
├── store/
│   └── generationStore.ts     # Zustand store (mode, model, prompt, jobs, etc.)
├── hooks/
│   ├── useAuth.tsx            # Auth context (signIn, signUp, signOut, magicLink)
│   ├── useGenerations.tsx     # CRUD for generations table (React Query)
│   ├── usePricing.ts          # Cost calculation per model + controls
│   ├── useRetryGeneration.tsx # Retry failed jobs
│   ├── useGenerationProgress.tsx
│   ├── useJobs.tsx
│   ├── useCreditLogs.tsx
│   └── useNotificationSound.tsx
├── types/
│   └── generation.ts          # All type definitions (models, jobs, modes)
├── config/
│   └── pricing.ts             # Credit costs per model/resolution/duration
├── integrations/supabase/
│   ├── client.ts              # Supabase client init
│   └── types.ts               # Auto-generated DB types
└── lib/
    └── utils.ts               # Utility helpers

supabase/functions/
├── generation-callback/       # Webhook handler — n8n calls this on completion
└── check-balance/             # Credit balance proxy
```

## Supported Models

### Text-to-Image
| Model | Credits |
|-------|---------|
| Nano Banana Pro | 18–24 |
| Seedream 4.5 | 6.5 |
| Flux Flex | 14–24 |
| Flux Flex Pro | 5–7 |
| GPT-4o Image | 10 |
| Z Image | 0.8 |

### Text-to-Video
| Model | Credits |
|-------|---------|
| Veo 3.1 | 60–250 |
| Sora 2 Pro | 150–630 |
| Kling 2.6 | 55–220 |
| Seedance 1.0 | 25–50 |
| Grok Imagine | 30 |

### Image-to-Image
Nano Banana Pro I2I, Seedream 4.5 Edit, Flux Flex I2I, Flux Pro I2I, Qwen Image Edit

**Pricing:** 1000 credits = $5 USD

## Generation Flow

```
1. User selects Mode → Model → enters Prompt → configures Controls
2. GenerateButton creates a record in Supabase (status: queued)
3. Webhook fires to n8n workflow for AI processing
4. n8n processes with the selected model
5. n8n calls Supabase edge function (generation-callback) on completion
6. Edge function updates DB record (status: done, output_url set)
7. Frontend polls via React Query (every 5s) and displays result
8. User rates the output (1-5 stars)
```

## Database (Supabase)

### Tables

**generations**
- `id`, `request_id`, `type` (image/video), `model`, `user_prompt`, `final_prompt`
- `model_params` (JSON), `status` (queued/running/done/error), `output_url`
- `rating` (1-5), `progress` (0-100), `external_task_id`, `user_id`

**profiles** — user metadata (name, avatar, email)

**credit_logs** — balance history

### Auth
- Email/password + magic link login
- Signup restricted to `@oltaflock.ai` domain
- Row-level security on all tables

## Key Behaviors

- **Concurrent generations:** Up to 5 simultaneous jobs, each tracked independently
- **Rating gate:** Must rate a completed generation before switching mode/model
- **Soft delete:** Generations are flagged as deleted, not removed from DB
- **Notifications:** Sound plays on generation completion
- **Themes:** Dark/light mode toggle

## Development

```bash
npm i           # Install dependencies
npm run dev     # Start dev server (localhost:8080)
npm run build   # Production build
npm run lint    # Run ESLint
```

## Deployment

Built with [Lovable](https://lovable.dev) and deployed on Vercel.
