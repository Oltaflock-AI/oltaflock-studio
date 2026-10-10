# PROMUNCH Studio: team guide

PROMUNCH Studio is where the PROMUNCH team makes everyday creative without waiting on a designer: social posts, carousels, stories, ad sets, marketplace and A+ images, comparison cards, posters, standees, flyers, shelf strips, pack ideas, festive editions and short reels. The brand rules, real claims and real pack shots are built in.

## The everyday flow

1. **Home → pick a job** (or pick an idea from **Coming up**, the festival and campaign calendar, and the brief arrives half filled in).
2. **Fill in the brief.** Required fields have a `*`. Stuck on words? **Suggest lines** writes headline options in the PROMUNCH voice. Choose **Draft** to try ideas cheaply, **Final** for posting, **Print** for 4K print files. The cost shows before you press **Make**.
3. **Review together.** Everything the team makes lands in **Recent work**. Anyone can **Approve** a result or send it back with **Changes** and a note. Filter by *Waiting for review*, *Needs changes* or *Approved*. *Approved* is the "ready to post or print" list.
4. **Ship it.** Download, **Write caption** (caption, hashtags and alt text in the brand voice) for social posts, or **Upscale 2× for print** for print and packaging. Each print result shows the largest A size it prints sharp at. **Tweak in Create** opens any result in the full studio with the exact prompt and settings.

Carousels, ad sets and A+ banners make the first image first, then pass it to the rest as a reference so the set shares one look. The rest arrive a minute or two after the first.

## Set up once

**Home → Set up once** lists the logo and every product. Add a clear front photo of each pack (and the logo). They're shared with the whole team as **Packs & assets** (`@MasalaMania`, `@PromunchLogo`…), and every job attaches them so the real pack is shown, not an invented one.

## Other tools

- **Create**: the full studio. Every image and video model, any prompt. Type `@MasalaMania` to bring in a pack. Prompt Brain already knows the brand.
- **Presets**: **PROMUNCH looks** (Crunch Burst, Bold Colour Block, Desi Snack Moment, Macro Crunch, Gym Fuel, Festive Gifting, Marketplace White) and **PROMUNCH ads** (Pack Drop, Bowl Pour, Snack Swap), plus photo edits like background removal and upscaling.
- **Assistant**: a creative director who knows PROMUNCH, the products, claims and offers. Good for working out an idea before you make it.
- **Library**: everything you've made, in folders (brand jobs file themselves into `PROMUNCH · Social`, `· Print` and so on).
- **Claude / ChatGPT connector**: Settings → Connect AI. Make PROMUNCH creative from your AI chat.

## Before anything goes out

- Read every word on the image: AI can still misspell.
- Claims come from the brand kit (e.g. 45g protein per 100g for Himalayan Rock Salt, 42g for Masala Mania and Indori Chatka). Check them against the current pack.
- Packaging jobs make **concepts**. Final pack artwork (dieline, FSSAI panel, barcode, CMYK, bleed) still goes through the printer's artwork check.
- Posters come out at 2:3. A sizes are slightly squarer, so the printer trims a little top and bottom (text is kept inside a safe area).

## Team and access

PROMUNCH Studio is invite only. Admins invite people from **Settings → Team** (any email address), make others admins, or remove people. Removed people can't sign in again, but their work stays with the team.

## For whoever maintains it

| What | Where |
|------|-------|
| Brand kit: products, claims, voice, taglines, offers, palette, jobs | `supabase/functions/_shared/brand/promunch.ts` |
| Campaign calendar (festival dates, ready-made briefs) | `supabase/functions/_shared/brand/campaigns.ts` (add next year's dates each autumn) |
| What every AI helper is told about the brand | `supabase/functions/_shared/brand/context.ts` |
| Brief → generations (model, ratio, resolution, references, cost) | `src/brands/compose.ts` |
| Running jobs, matched sets, upscale for print | `src/brands/runJob.ts` |
| Name, logo files, claims ticker | `src/brands/identity.ts` |
| Colours and fonts | `src/index.css` (`:root` tokens), `tailwind.config.ts` |
| Team, reviews, invite-only sign-up | `supabase/migrations/20261010120000_promunch_team.sql`, `supabase/functions/team-admin` |
| Captions and headlines | `supabase/functions/brand-copy` |
| Brand research (sources for every fact) | `docs/research/PROMUNCH_BRAND_RESEARCH.md` |

The brand kit lives in `supabase/functions/_shared/brand`, so the web app (via the `@brand` alias), the Assistant, Prompt Brain, the caption writer and the AI-chat connector all read the same facts. Brand-job results are ordinary generations tagged in `model_params` (`source: 'brand'`, `job`, `run_id`, `shot_label`, `brief`…). Reviews live in `brand_reviews`.
