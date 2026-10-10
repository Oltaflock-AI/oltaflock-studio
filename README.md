# PROMUNCH Studio

The PROMUNCH team's creative studio, at **studio.promunch.in**. It makes on-brand social posts, carousels, ad sets, marketplace and A+ images, posters, pack concepts and short reels, using PROMUNCH's real packs, claims and voice. The team reviews and approves the work together.

- **Home**: ready-made jobs with short briefs, a festival and campaign calendar, and the team's review board.
- **Create**: every image and video model, with a Prompt Brain that knows the brand.
- **Presets**: PROMUNCH looks and ad moves, plus photo edits (background removal, upscaling, product shots).
- **Assistant**: a creative director that knows the products, claims and offers.
- **Packs & assets**: the team's shared pack shots and logo, used as references in every job.
- **Connect AI**: use the studio from Claude or ChatGPT.
- **Invite-only team**: admins invite people, members make and review.

How to use it: [docs/TEAM_GUIDE.md](docs/TEAM_GUIDE.md). How to deploy it: [docs/DEPLOY.md](docs/DEPLOY.md). Brand research and sources: [docs/research/PROMUNCH_BRAND_RESEARCH.md](docs/research/PROMUNCH_BRAND_RESEARCH.md).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui, Framer Motion |
| State | Zustand (client), TanStack Query (server) |
| Backend | Supabase: Auth, Postgres with row-level security, Edge Functions, Storage |
| Image and video models | Kie.ai (Nano Banana, GPT Image, Seedream, Flux, Veo, Kling, Seedance, Sora…) and Higgsfield |
| Language models | Claude, for Prompt Brain, the Assistant, captions and headlines |
| Email | Resend |
| Hosting | Vercel (web app), Supabase (backend), optional Cloudflare R2 for media |

## How a brand job works

```
Brief (Home)  ──▶  src/brands/compose.ts                     ──▶  src/brands/runJob.ts
                   • job turns the brief into shots               • creates generation rows, filed in
                   • brand rules + claims added                     "PROMUNCH · <category>"
                   • pack shots + logo attached as refs           • matched sets wait for shot 1 and
                   • model, ratio, resolution, cost picked          pass it on as a style reference
                                                                     │
                                                                     ▼
                                     supabase/functions/generate  ──▶  Kie.ai  ──▶  generation-callback
                                                                     │
Review board (Home) ◀── team-wide read of brand runs + brand_reviews ◀┘
```

The brand kit (`supabase/functions/_shared/brand`) is shared by the web app (through the `@brand` alias) and the server functions. The Assistant, Prompt Brain, the caption writer and the AI-chat connector all work from the same products, claims and voice.

## Directory guide

```
src/
├── pages/            Home (BrandStudio), Create (Index), Library, Presets, Packs & assets (Elements),
│                     Assistant, Settings, Auth, GenerationDetail, OAuthConsent
├── brands/           compose (brief → generations), runJob, review/team hooks, identity (name, logo)
├── components/brand/ brief dialog, review board, campaign calendar, caption dialog, brand mark
├── components/       studio, library, presets, assistant, settings (incl. Team), ui
└── config/           presets (incl. PROMUNCH looks), photo edits, pricing
supabase/
├── functions/_shared/brand/   brand kit, jobs, campaign calendar, AI briefing
├── functions/_shared/catalog/ model catalog (shared with the web app via @catalog)
├── functions/                 generate, callbacks, prompt-chat, mcp, team-admin, brand-copy, …
├── migrations/                schema; 20261010120000_promunch_team.sql = team + reviews + invite only
└── templates/                 PROMUNCH auth emails (invite, sign-in link, reset)
mcp-app/              chat panel shown inside Claude/ChatGPT (bundled into functions/mcp/ui.gen.ts)
workers/storage/      optional R2 storage Worker
```

## Development

```bash
bun install            # dependencies (bun.lockb is the lockfile)
bun run dev            # http://localhost:8080
bun run build          # production build
bun run lint           # ESLint
bun run build:mcp-ui   # rebuild the chat panel after changing mcp-app/
```

Frontend `.env`:

```
VITE_SUPABASE_URL=https://zzjrqylecslpuoiysdmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_STORAGE_API_URL=https://studio-storage.promunch.in   # optional, with R2
```

Server secrets are listed in [docs/DEPLOY.md](docs/DEPLOY.md).

## License

Internal use only. All rights reserved.
