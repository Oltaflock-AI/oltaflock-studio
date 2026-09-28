/**
 * Style presets: a look you pick once and keep while you write your own
 * prompts. At generate time the style's description is added to the prompt
 * (see composeStylePrompt), so it works with every model and with Prompt Brain.
 */

export type StyleCategory = 'light' | 'retro' | 'film' | 'editorial' | 'art';

export const STYLE_CATEGORIES: Array<{ id: StyleCategory; label: string }> = [
  { id: 'light', label: 'Light & mood' },
  { id: 'retro', label: 'Retro & eras' },
  { id: 'film', label: 'Film & camera' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'art', label: 'Art & dream' },
];

/** Texture drawn over a style's swatch on the Presets page. */
export type SwatchTexture = 'grain' | 'haze' | 'scanlines' | 'halation' | 'chrome' | 'halftone' | 'flash' | 'none';

export interface StylePreset {
  id: string;
  name: string;
  category: StyleCategory;
  /** One line shown on the card. */
  tagline: string;
  /** Three or four words that say what the look is made of. */
  notes: string[];
  /** Added to the user's prompt. Written as visual direction, not a subject. */
  prompt: string;
  /** Aspect ratio that suits the look, applied only if the model offers it. */
  aspect?: string;
  /** CSS background for the card swatch. */
  swatch: string;
  texture: SwatchTexture;
  /** Text colour that reads on the swatch. */
  ink: 'light' | 'dark';
  /** Optional sample output shown instead of the swatch. */
  cover?: string;
  isNew?: boolean;
}

export const STYLE_PRESETS: StylePreset[] = [
  // Light & mood
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    category: 'light',
    tagline: 'Low sun, warm skin, long soft shadows',
    notes: ['Backlit', 'Warm amber', 'Lens flare'],
    prompt: 'shot during golden hour, low sun just above the horizon backlighting the subject, warm amber and honey tones, glowing rim light on hair and edges, long soft shadows, gentle lens flare, slightly lifted blacks, natural skin warmth, airy and nostalgic',
    swatch: 'radial-gradient(120% 90% at 78% 18%, #FFE3A1 0%, #F7B267 28%, #E07A5F 58%, #6B3E5E 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/golden-hour.webp',
  },
  {
    id: 'hazy-daydream',
    name: 'Hazy Daydream',
    category: 'light',
    tagline: 'Soft focus, blooming highlights, dreamy fog',
    notes: ['Bloom', 'Pastel', 'Low contrast'],
    prompt: 'dreamy hazy atmosphere, soft diffusion filter with blooming highlights, light fog and airborne haze, washed pastel palette, low contrast, milky lifted shadows, gentle glow around light sources, shallow depth of field, calm ethereal mood',
    swatch: 'linear-gradient(160deg, #F6E7F2 0%, #E6D5F5 35%, #CFE3F2 70%, #F3EBDD 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/hazy-daydream.webp',
    isNew: true,
  },
  {
    id: 'blue-hour',
    name: 'Blue Hour',
    category: 'light',
    tagline: 'Cool twilight with warm windows',
    notes: ['Twilight', 'Cool blue', 'Warm practicals'],
    prompt: 'blue hour twilight just after sunset, deep cobalt sky, cool blue ambient light, warm tungsten practical lights and glowing windows for contrast, calm quiet mood, clean shadows, subtle reflections',
    swatch: 'linear-gradient(180deg, #1B2A57 0%, #2E4A8C 45%, #5C7FC2 75%, #F2A65A 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/blue-hour.webp',
  },
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    category: 'light',
    tagline: 'Rain-slick streets in magenta and teal',
    notes: ['Night', 'Neon', 'Wet reflections'],
    prompt: 'neon noir night scene, magenta and teal neon light spilling across the subject, rain-slick reflective surfaces, deep crushed shadows, atmospheric haze catching the light, high contrast, moody cyberpunk cinema look',
    swatch: 'linear-gradient(135deg, #0B0B1A 0%, #2A0C3D 40%, #D1267A 75%, #1FC7C9 100%)',
    texture: 'halation',
    ink: 'light',
    cover: '/presets/neon-noir.webp',
  },
  {
    id: 'party-flash',
    name: 'Party Flash',
    category: 'light',
    tagline: 'Direct on-camera flash, night-out energy',
    notes: ['Hard flash', 'Red-eye era', 'Candid'],
    prompt: 'direct on-camera flash photo at night, hard frontal flash with bright skin and sharp shadow behind the subject, dark falloff background, slight overexposure on faces, candid party snapshot energy, point-and-shoot camera feel',
    swatch: 'radial-gradient(60% 55% at 50% 45%, #FFFFFF 0%, #F2F2F2 25%, #7A7A86 60%, #0E0E12 100%)',
    texture: 'flash',
    ink: 'dark',
    cover: '/presets/party-flash.webp',
  },
  {
    id: 'overcast-soft',
    name: 'Overcast Soft',
    category: 'light',
    tagline: 'Even, flattering, Nordic calm',
    notes: ['Diffused', 'Muted', 'Quiet'],
    prompt: 'soft overcast daylight, large diffused sky light with no hard shadows, muted cool-neutral palette, gentle contrast, true-to-life colour, quiet Scandinavian editorial calm',
    swatch: 'linear-gradient(180deg, #D9DDE1 0%, #C4CACF 50%, #A7AFB3 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/overcast-soft.webp',
  },

  {
    id: 'candlelit',
    name: 'Candlelit',
    category: 'light',
    tagline: 'Intimate flicker, warm pools of light',
    notes: ['Low light', 'Warm glow', 'Chiaroscuro'],
    prompt: 'lit only by candlelight, warm flickering amber glow falling off quickly into deep shadow, chiaroscuro contrast, soft highlights on faces and surfaces, intimate evening mood, subtle grain, painterly low-light richness',
    swatch: 'radial-gradient(45% 50% at 50% 55%, #FFD08A 0%, #E08A3C 30%, #5A2A14 70%, #140A06 100%)',
    texture: 'halation',
    ink: 'light',
    cover: '/presets/candlelit.webp',
  },

  // Retro & eras
  {
    id: 'y2k',
    name: 'Y2K',
    category: 'retro',
    tagline: 'Chrome, gloss and early-2000s pop',
    notes: ['Chrome', 'Glossy', 'Cyber pink'],
    prompt: 'Y2K aesthetic, early 2000s pop culture look, glossy chrome and iridescent surfaces, bubblegum pink, baby blue and silver palette, frosted translucent plastics, glitter and sparkle accents, bright digital-camera flash, playful futuristic styling',
    swatch: 'linear-gradient(135deg, #FFB3E6 0%, #C9B6FF 30%, #9EE6FF 55%, #E9EEF5 75%, #FF7AC6 100%)',
    texture: 'chrome',
    ink: 'dark',
    cover: '/presets/y2k.webp',
    isNew: true,
  },
  {
    id: '90s-disposable',
    name: '90s Disposable',
    category: 'retro',
    tagline: 'Point-and-shoot film, date stamp nostalgia',
    notes: ['Film grain', 'Flash', 'Slight blur'],
    prompt: 'shot on a 1990s disposable film camera, visible film grain, slightly soft focus, built-in flash with warm falloff, faded colour with green-yellow cast, light leaks at the edges, casual candid framing, nostalgic snapshot',
    swatch: 'linear-gradient(160deg, #F4D58D 0%, #E3A857 35%, #9DB17C 70%, #5E6B4B 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/90s-disposable.webp',
  },
  {
    id: '70s-film',
    name: '70s Film',
    category: 'retro',
    tagline: 'Warm browns, soft grain, sun-faded',
    notes: ['Earthy', 'Faded', 'Warm'],
    prompt: '1970s film photograph, warm earthy palette of burnt orange, mustard and chocolate brown, sun-faded colours, soft grain, gentle vignette, slightly hazy highlights, vintage lifestyle magazine feel',
    swatch: 'linear-gradient(180deg, #E8B04B 0%, #C9702E 40%, #7A4B2A 75%, #3D2A1E 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/70s-film.webp',
  },
  {
    id: 'synthwave',
    name: '80s Synthwave',
    category: 'retro',
    tagline: 'Sunset grids and hot magenta glow',
    notes: ['Retro-future', 'Glow', 'Purple sky'],
    prompt: '1980s synthwave aesthetic, hot magenta and electric purple gradient sky, glowing neon rim light, retro-futuristic mood, soft bloom, subtle scanline texture, chrome highlights, cinematic dusk',
    swatch: 'linear-gradient(180deg, #1A0B3B 0%, #5B1B7A 40%, #E8327B 70%, #FFB347 100%)',
    texture: 'scanlines',
    ink: 'light',
    cover: '/presets/synthwave.webp',
  },
  {
    id: 'vhs',
    name: 'VHS Tape',
    category: 'retro',
    tagline: 'Home-video fuzz, bleeding colour',
    notes: ['Tracking lines', 'Chroma bleed', 'Soft'],
    prompt: 'VHS home video still, soft low-resolution look, colour bleeding and chromatic fringing, horizontal tracking lines and noise, washed highlights, slightly oversaturated reds, late 80s camcorder feel',
    swatch: 'linear-gradient(180deg, #3A4A7A 0%, #7A5A8E 45%, #C46A6A 75%, #2B2B3A 100%)',
    texture: 'scanlines',
    ink: 'light',
    cover: '/presets/vhs.webp',
  },
  {
    id: 'polaroid',
    name: 'Instant Photo',
    category: 'retro',
    tagline: 'Creamy instant film, soft and square',
    notes: ['Square', 'Creamy', 'Low contrast'],
    prompt: 'instant film photograph, creamy muted colours with a cyan-green shadow cast, soft low-contrast tones, slight vignette, gentle chemical imperfections, intimate everyday moment',
    aspect: '1:1',
    swatch: 'linear-gradient(160deg, #EFE8D8 0%, #D6DCC9 40%, #9DB7B0 75%, #6C8A8A 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/polaroid.webp',
  },

  // Film & camera
  {
    id: 'cinematic-35',
    name: 'Cinematic 35mm',
    category: 'film',
    tagline: 'Widescreen frames with a movie grade',
    notes: ['Anamorphic', 'Teal & orange', 'Grain'],
    prompt: 'cinematic film still shot on 35mm, anamorphic widescreen framing, motivated lighting with deep shadows, subtle teal and orange colour grade, fine film grain, shallow depth of field, oval bokeh, feature-film production value',
    aspect: '21:9',
    swatch: 'linear-gradient(90deg, #0F2A33 0%, #1F4B55 40%, #C4773B 80%, #E9A25F 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/cinematic-35.webp',
  },
  {
    id: 'portra',
    name: 'Portra Glow',
    category: 'film',
    tagline: 'Kodak Portra 400 skin and pastels',
    notes: ['Warm skin', 'Pastel', 'Fine grain'],
    prompt: 'shot on Kodak Portra 400 film, warm natural skin tones, soft pastel colour rendition, gentle highlight roll-off, fine grain, slightly overexposed airy look, medium-format portrait feel',
    swatch: 'linear-gradient(160deg, #F7D9C4 0%, #EDB9A0 35%, #B9C9B3 70%, #8FA6A0 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/portra.webp',
  },
  {
    id: 'cinestill',
    name: 'CineStill 800T',
    category: 'film',
    tagline: 'Tungsten night film with red halation',
    notes: ['Halation', 'Tungsten', 'Night'],
    prompt: 'shot on CineStill 800T tungsten film at night, red-orange halation glowing around highlights and lights, cool cyan shadows, visible grain, practical street and neon lighting, moody urban night',
    swatch: 'radial-gradient(35% 40% at 30% 35%, #FF6B4A 0%, #B8322A 30%, transparent 60%), linear-gradient(180deg, #0D2230 0%, #123C4A 60%, #0A1A22 100%)',
    texture: 'halation',
    ink: 'light',
    cover: '/presets/cinestill.webp',
    isNew: true,
  },
  {
    id: 'velvia',
    name: 'Velvia Vivid',
    category: 'film',
    tagline: 'Saturated slide film, rich landscapes',
    notes: ['Saturated', 'Deep blues', 'Punchy'],
    prompt: 'shot on Fujifilm Velvia slide film, highly saturated rich colour, deep blues and vivid greens, punchy contrast, crisp detail, dramatic landscape photography',
    swatch: 'linear-gradient(170deg, #0B4F8A 0%, #1C7C54 45%, #E0B32B 80%, #C2411F 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/velvia.webp',
  },
  {
    id: 'tri-x',
    name: 'Tri-X Mono',
    category: 'film',
    tagline: 'Gritty black and white reportage',
    notes: ['B&W', 'Heavy grain', 'Contrast'],
    prompt: 'black and white photograph shot on Kodak Tri-X 400, strong grain, deep blacks and bright whites, high contrast, documentary street photography feel, timeless and raw',
    swatch: 'linear-gradient(160deg, #F2F2F2 0%, #9A9A9A 40%, #3A3A3A 75%, #0C0C0C 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/tri-x.webp',
  },

  // Editorial
  {
    id: 'glossy-magazine',
    name: 'Glossy Magazine',
    category: 'editorial',
    tagline: 'High-fashion cover polish',
    notes: ['Beauty light', 'Retouched', 'Bold'],
    prompt: 'high-fashion magazine editorial, polished beauty lighting with a large softbox and subtle rim light, flawless retouched skin, bold confident styling, clean seamless backdrop, crisp detail, luxury print quality',
    aspect: '4:5',
    swatch: 'linear-gradient(150deg, #F6F1EB 0%, #E9D7CB 40%, #C9A48C 75%, #2B211C 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/glossy-magazine.webp',
  },
  {
    id: 'studio-product',
    name: 'Studio Product',
    category: 'editorial',
    tagline: 'Clean e-commerce hero shot',
    notes: ['Seamless', 'Soft shadow', 'Sharp'],
    prompt: 'professional studio product photography, clean seamless background, soft key light with a gentle graduated shadow, controlled reflections, tack-sharp detail, accurate colour, premium commercial catalogue look',
    swatch: 'radial-gradient(70% 60% at 50% 40%, #FFFFFF 0%, #F1F1F3 55%, #D9DADF 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/studio-product.webp',
  },
  {
    id: 'quiet-luxury',
    name: 'Quiet Luxury',
    category: 'editorial',
    tagline: 'Stone, linen and restraint',
    notes: ['Neutral', 'Minimal', 'Natural light'],
    prompt: 'quiet luxury aesthetic, minimalist composition with generous negative space, natural materials like travertine, linen and oak, soft directional window light, warm neutral palette of cream, sand and taupe, refined and understated',
    swatch: 'linear-gradient(160deg, #F4EEE4 0%, #E3D6C3 45%, #C4B39A 80%, #9C8B74 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/quiet-luxury.webp',
  },
  {
    id: 'street-style',
    name: 'Street Style',
    category: 'editorial',
    tagline: 'City candid, fashion-week energy',
    notes: ['Telephoto', 'Candid', 'Urban'],
    prompt: 'street style fashion photography, candid moment on a city sidewalk, telephoto compression with blurred passers-by, natural daylight, confident pose mid-stride, urban textures, contemporary editorial colour',
    aspect: '4:5',
    swatch: 'linear-gradient(160deg, #D8D4CE 0%, #9EA3A8 40%, #4E5A66 75%, #1E232A 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/street-style.webp',
  },

  // Art & dream
  {
    id: 'dreamcore',
    name: 'Dreamcore',
    category: 'art',
    tagline: 'Surreal, nostalgic, a little uncanny',
    notes: ['Surreal', 'Liminal', 'Soft glow'],
    prompt: 'dreamcore aesthetic, surreal nostalgic scene with a slightly uncanny liminal feel, soft glowing light, pastel sky, dreamlike scale and floating elements, gentle haze, memory-like softness',
    swatch: 'linear-gradient(170deg, #BFE3FF 0%, #F5D0F0 45%, #FFF1B8 80%, #B7F0D8 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/dreamcore.webp',
  },
  {
    id: 'claymation',
    name: 'Claymation',
    category: 'art',
    tagline: 'Handmade clay, stop-motion charm',
    notes: ['Clay', 'Fingerprints', 'Miniature'],
    prompt: 'claymation stop-motion style, handmade plasticine characters and sets with visible fingerprints and tool marks, miniature diorama, soft studio lighting, rounded playful forms, saturated friendly colours',
    swatch: 'linear-gradient(150deg, #FFB86B 0%, #FF7F6E 35%, #7FC8A9 70%, #6A8CD6 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/claymation.webp',
  },
  {
    id: 'anime-cel',
    name: 'Anime Cel',
    category: 'art',
    tagline: 'Hand-painted anime film frame',
    notes: ['Cel shading', 'Painted sky', 'Clean lines'],
    prompt: 'hand-drawn anime film still, clean line art with cel shading, lush painted background with dramatic clouds, vibrant but soft colour, warm afternoon light, detailed Japanese animation aesthetic',
    aspect: '16:9',
    swatch: 'linear-gradient(180deg, #7EC8F0 0%, #BFE6F5 45%, #FFE6B0 75%, #8CC98B 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/anime-cel.webp',
  },
  {
    id: 'risograph',
    name: 'Risograph',
    category: 'art',
    tagline: 'Two-colour print with misregistration',
    notes: ['Halftone', 'Pink & blue', 'Print'],
    prompt: 'risograph print illustration, limited two-colour palette of fluorescent pink and blue, visible halftone dots and paper texture, slight colour misregistration, flat graphic shapes, indie zine aesthetic',
    swatch: 'linear-gradient(135deg, #FF5FA2 0%, #FF5FA2 48%, #3D6BFF 52%, #3D6BFF 100%)',
    texture: 'halftone',
    ink: 'light',
    cover: '/presets/risograph.webp',
  },
  {
    id: 'watercolor',
    name: 'Watercolour',
    category: 'art',
    tagline: 'Loose washes on textured paper',
    notes: ['Wet edges', 'Paper grain', 'Soft palette'],
    prompt: 'loose watercolour painting, soft translucent washes with wet bleeding edges, visible cold-press paper texture, delicate pencil underdrawing, limited harmonious palette, generous white space, hand-painted illustration',
    swatch: 'radial-gradient(40% 45% at 35% 40%, #9BC4E2 0%, transparent 70%), radial-gradient(45% 40% at 68% 62%, #F2B5A7 0%, transparent 70%), linear-gradient(180deg, #FBF8F2 0%, #F1ECE2 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/watercolor.webp',
  },
];

export function getStyle(id: string | null | undefined): StylePreset | undefined {
  return id ? STYLE_PRESETS.find((s) => s.id === id) : undefined;
}

/** The prompt sent to the model: the user's words first, then the style's look. */
export function composeStylePrompt(prompt: string, styleId: string | null | undefined): string {
  const style = getStyle(styleId);
  if (!style) return prompt;
  const base = prompt.trim().replace(/[.\s]+$/, '');
  return base ? `${base}. Style: ${style.prompt}.` : `${style.prompt}.`;
}
