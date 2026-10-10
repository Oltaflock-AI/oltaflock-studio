# Deploying PROMUNCH Studio at studio.promunch.in

PROMUNCH Studio runs on its own accounts, separate from Oltaflock Studio: its own database, file storage, server functions, hosting and API keys. Nothing is shared with Oltaflock's projects. No WordPress is needed. It is a React web app on Vercel with a Supabase backend.

| Piece | Service | Owned by |
|-------|---------|----------|
| Web app (`studio.promunch.in`) | Vercel project from the `promunch-studio` branch | PROMUNCH |
| Database, sign-in, server functions | New Supabase project | PROMUNCH |
| Image and video models | Kie.ai account (and optionally Higgsfield) | PROMUNCH |
| Prompt Brain, Assistant, caption writer | Anthropic API key | PROMUNCH |
| Sign-in and invite emails | Resend, sending from a `promunch.in` address | PROMUNCH |
| Large files (optional) | Cloudflare R2 + the storage Worker in `workers/storage` | PROMUNCH |

## 1. Supabase (database, sign-in, functions)

1. Create a project at supabase.com (region: Mumbai, `ap-south-1`). Note its **project ref** (the `abcd…` in `https://abcd….supabase.co`).
2. Link and push the schema from this repo:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push            # runs every migration, including 20261010120000_promunch_team.sql
   ```
3. **Authentication → Sign In / Providers:**
   - Turn **off** "Allow new users to sign up". PROMUNCH Studio is invite only.
   - Keep Email on (magic links and passwords). Turn on Google if the team uses Google Workspace.
   - **URL Configuration:** Site URL `https://studio.promunch.in`; Redirect URLs `https://studio.promunch.in/**`.
4. **Authentication → Email Templates:** paste `supabase/templates/invite.html`, `magic_link.html` and `recovery.html` into Invite user, Magic Link and Reset Password.
5. **Authentication → SMTP:** use Resend (smtp.resend.com) with a verified `promunch.in` sender, e.g. `PROMUNCH Studio <studio@promunch.in>`.
6. **Authentication → OAuth Server** (only for the Claude/ChatGPT connector): enable it, set the authorization path to `/oauth/consent`, and allow dynamic client registration.
7. Secrets for the functions (`supabase secrets set NAME=value`):

   | Secret | What it's for |
   |--------|---------------|
   | `KIE_AI_API_KEY` | Every image and video model |
   | `ANTHROPIC_API_KEY` | Prompt Brain, Assistant, captions and headlines, titles |
   | `RESEND_API_KEY` | App emails |
   | `FROM_EMAIL` | `PROMUNCH Studio <studio@promunch.in>` |
   | `SITE_URL` | `https://studio.promunch.in` (invite links, emails, connector links) |
   | `ALLOWED_ORIGIN` | `https://studio.promunch.in` |
   | `MCP_PUBLIC_URL` | `https://studio.promunch.in/mcp` (only for the connector) |
   | `HF_API_KEY_ID`, `HF_API_KEY_SECRET` | Higgsfield models (optional) |
   | `STORAGE_API_URL`, `STORAGE_INGEST_SECRET`, `PUBLIC_CDN_URL` | Only with the R2 storage Worker (step 4) |

8. Deploy the functions:
   ```bash
   for f in generate poll-tasks generation-callback check-balance enhance-prompt generate-title \
            model-assistant higgsfield prompt-chat download mcp team-admin brand-copy; do
     supabase functions deploy "$f" --no-verify-jwt
   done
   supabase functions deploy delete-account
   supabase functions deploy send-email
   ```

## 2. The first admin

Sign-ups are off, so invite the first person from the Supabase dashboard: **Authentication → Users → Invite user** (e.g. the founder's `@promunch.in` address). The first account becomes the team's **admin** automatically. From then on, admins invite everyone else in the app under **Settings → Team**, and can make other admins or remove people. Removed people are signed out for good, but what they made stays with the team.

## 3. Vercel (the web app)

1. New Vercel project from this repository, **production branch `promunch-studio`**. Framework preset: Vite.
2. Environment variables:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from Supabase → Settings → API>
   VITE_STORAGE_API_URL=https://studio-storage.promunch.in   # only with R2 (step 4)
   ```
3. In `vercel.json`, replace `YOUR-PROMUNCH-PROJECT-REF` with the project ref. These rewrites serve the AI-chat connector at `studio.promunch.in/mcp`.
4. **Domains:** add `studio.promunch.in`. Then in promunch.in's DNS, wherever the domain is managed, add a `CNAME` record named `studio` pointing to `cname.vercel-dns.com`. The Shopify store on promunch.in is not affected.

## 4. Large-file storage (optional, recommended)

Without this, uploads and results live in Supabase Storage, which is fine to start with. For cheaper storage and fast previews, use Cloudflare R2:

1. Cloudflare: create an R2 bucket `promunch-studio`, and add `promunch.in` (or just the two subdomains) to Cloudflare.
2. In `workers/storage/wrangler.jsonc`, set `YOUR-PROMUNCH-PROJECT-REF`. Then:
   ```bash
   cd workers/storage && npm install
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put INGEST_SECRET
   npx wrangler deploy
   ```
3. Point `studio-storage.promunch.in` at the Worker and `studio-cdn.promunch.in` at the bucket's public domain. Then set the `STORAGE_*` / `PUBLIC_CDN_URL` secrets (step 1) and `VITE_STORAGE_API_URL` (step 3).

## 5. Brand assets (do once, in the app)

1. Sign in, open **Home**, and in "Set up once" add the logo and a clear front photo of each pack. These are shared by the whole team.
2. Put PROMUNCH's real logo files in `public/brand/` and set `logo` / `logoOnDark` in `src/brands/identity.ts` (the app shows a typeset wordmark until then).
3. Confirm the brand colours: replace the provisional hex codes in `src/index.css` (the `:root` tokens) and in `supabase/functions/_shared/brand/promunch.ts` (`palette`).

## Checklist

- [ ] `supabase db push` ran without errors
- [ ] Sign-ups off; Site URL and redirect URLs set to studio.promunch.in
- [ ] Email templates and SMTP sender set
- [ ] Secrets set and functions deployed
- [ ] First admin invited and signed in
- [ ] Vercel env vars set, `vercel.json` project ref replaced, domain verified
- [ ] Pack shots and logo added under Home → Set up once
