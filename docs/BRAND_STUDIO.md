# Brand Studio (PROMUNCH edition)

An internal workspace at `/brand` so a brand team can make everyday creative
without a full-time designer: social posts, carousels, stories, ad sets,
marketplace images, posters, standees, flyers, shelf strips, packaging
concepts and short product reels.

The team picks a job, fills in a short brief (headline, product, offer, look)
and presses **Make**. The job writes the prompt, adds the brand rules, attaches
the product's real pack shots and the logo, picks the model, size and
resolution, and files the results in a `PROMUNCH · <category>` library folder.

## For the team

1. **Set up once.** At the top of the page, add the logo and a clear front
   photo of each pouch. They are saved as Elements (`@PromunchLogo`,
   `@MasalaMania`, `@NoodleMasala`…). Without them the pack is invented, so do
   this first. Elements are per account, so each team member adds them once.
2. **Pick a job, fill the brief.** Required fields are marked `*`. Suggested
   lines and offer codes are one click away.
3. **Draft, then Final.** Draft is cheapest for trying ideas; Final is full
   quality; Print makes 4K.
4. **Results** appear under *Recent work*. Click one for the full detail view
   (edit, animate, rate, more). Each result also has download,
   *Tweak in the Studio* (loads the exact prompt and settings) and, for print
   and packaging, *Upscale 2× for print*, with the largest A size it prints
   sharp at.

Carousels and ad sets make the first image, then pass it to the others as a
reference so the set shares one look; the rest arrive a minute or two later.

### Before anything is published or printed

- Read every word: AI can still misspell text.
- Check claims against the real pack and FSSAI label. Jobs only use claims
  from the brand kit, but the kit must be kept current.
- Packaging jobs make **concepts**. Final print artwork (dieline, FSSAI panel,
  barcode, CMYK, bleed) still needs your printer's artwork check.
- Posters come out at 2:3; A sizes are slightly squarer, so prints trim a
  little top and bottom (prompts keep text inside a safe area).

## For maintainers

| File | What it holds |
|------|---------------|
| `src/brands/promunch.ts` | The brand kit: products, claims, voice, rules, offers, and the jobs with their brief fields and prompts |
| `src/brands/types.ts` | Brand kit and job types |
| `src/brands/compose.ts` | Turns a brief into generations: model choice, closest aspect ratio, resolution per quality, reference legend, brand block, cost |
| `src/brands/runJob.ts` | Starts the generations, files them, makes "match the first" shots wait for the first result; upscale for print |
| `src/brands/useBrandAssets.ts` | Finds pack shots and logo among the user's Elements |
| `src/pages/BrandStudio.tsx`, `src/components/brand/*` | The page, brief dialog and recent work |

- **Models.** Images use Nano Banana 2.1 (up to 14 references, good text);
  videos use Seedance 2.0 (Fast for Draft), reference mode when pack shots
  exist. Change them at the top of `compose.ts`.
- **Brand colours.** `palette` is empty until the Promunch team confirms their
  hex codes; until then the pack shots set the colours.
- **Results are ordinary generations.** Runs are tagged in `model_params`
  (`source: 'brand'`, `brand`, `job`, `run_id`, `shot_label`…), so no new
  tables or migrations are needed.
- **Another brand.** Copy `promunch.ts`, register it in `src/brands/index.ts`,
  and build with `VITE_BRAND=<id>`. `VITE_BRAND=none` hides the workspace.
  This edition defaults to `promunch`.
