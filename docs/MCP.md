# Oltaflock Studio MCP server

Connect Claude (claude.ai, Desktop, Code) or ChatGPT to Oltaflock Studio so you can
direct image and video work in chat. Generations use your account and credits,
land in your library, and share the same creative memory and elements as the
in-app Assistant.

- **Endpoint:** `https://xynnkyipiwkvbavquypo.supabase.co/functions/v1/mcp`
- **Transport:** Streamable HTTP (stateless, JSON responses)
- **Auth:** OAuth 2.1 via Supabase Auth's OAuth server (dynamic client registration)
- **Code:** `supabase/functions/mcp/` (server) · `src/pages/OAuthConsent.tsx` (consent screen) · `src/components/settings/ConnectAISection.tsx` (in-app guide at Settings → Connect Claude & ChatGPT, `/settings#connect-ai`)

## How it works

```
Claude / ChatGPT ──OAuth──▶ Supabase Auth (/auth/v1)  ──▶ studio.oltaflock.ai/oauth/consent
       │                                                        (user approves)
       └──Bearer JWT──▶ functions/v1/mcp ──▶ user-scoped Supabase client (RLS)
                                         └─▶ functions/v1/generate (same pipeline as the Studio)
```

The access token is an ordinary Supabase user JWT, so every tool runs under the
user's RLS policies. Generation goes through the existing `generate` function;
`generation-callback` and `poll-tasks` finish jobs as usual. Rows started from MCP
carry `model_params.source = 'mcp'`.

## Tools

| Area | Tools |
|---|---|
| Catalog | `studio_list_models`, `studio_get_model`, `studio_estimate_cost`, `studio_get_balance` |
| Prompting | `studio_enhance_prompt` (Prompt Brain + memory) |
| Generation | `studio_generate`, `studio_get_generations` (waits up to 50s per call) |
| Library | `studio_list_generations`, `studio_update_generation` (title, rating, folder), `studio_list_folders`, `studio_create_folder` |
| Memory | `studio_list_memories`, `studio_remember`, `studio_update_memory`, `studio_forget_memory` |
| Elements | `studio_list_elements`, `studio_save_element`, `studio_delete_element` |
| Uploads | `studio_upload_media` (URL or base64 → permanent URL for references) |

Prompt: `direct_video` walks the model through brief → shot list → keyframes → clips.

`@Name` in a `studio_generate` prompt works the same as in the Studio: the
element's images fill the model's image slots and its description is appended.

## One-time setup

1. **Enable the OAuth server** — Supabase dashboard → Authentication → OAuth Server:
   - Enable the OAuth 2.1 server.
   - Authorization path: `/oauth/consent` (with Site URL `https://studio.oltaflock.ai`).
   - Allow dynamic client registration (Claude and ChatGPT register themselves).
2. **Deploy the function** (JWT verification is done inside the function):
   ```sh
   supabase functions deploy mcp --no-verify-jwt
   ```
   `STORAGE_API_URL` and `ANTHROPIC_API_KEY` are already project secrets; the
   function reuses them for uploads and Prompt Brain.
3. **Deploy the web app** so `/oauth/consent` exists.

Check: `curl -s https://xynnkyipiwkvbavquypo.supabase.co/.well-known/oauth-authorization-server/auth/v1`
should return JSON metadata instead of `OAuth server is disabled`.

## Connecting

- **claude.ai / Claude Desktop:** Settings → Connectors → Add custom connector → paste the endpoint URL.
- **ChatGPT:** Settings → Apps & Connectors → Advanced → Developer mode → Create connector → paste the endpoint URL, auth "OAuth".
- **Claude Code:** `claude mcp add --transport http oltaflock https://xynnkyipiwkvbavquypo.supabase.co/functions/v1/mcp`, then `/mcp` to sign in.

## Limits and notes

- Edge function requests are capped at ~150s, so waits are 50s per call; the
  model calls `studio_get_generations` again for long videos.
- Clips are delivered per shot. Stitching them into one final cut is not built yet.
- The credit check uses the shared kie.ai balance, the same as the Studio.
