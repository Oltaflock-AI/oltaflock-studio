/**
 * Photo edits: one-click recipes that transform a photo the user brings
 * (a headshot from a selfie, a GTA screenshot, a 90s home video), plus tools
 * like upscale and background removal.
 *
 * Unlike style presets, an edit is the whole instruction, not a look added to
 * the user's prompt. Applying one (see applyPhotoEdit) switches the Studio to
 * an image edit model, keeps any attached photo and fills in the prompt, so
 * the user only adds their photo and presses Generate.
 */

import type { SwatchTexture } from './stylePresets';

export type EditCategory = 'tools' | 'retouch' | 'game' | 'nostalgia';

export const EDIT_CATEGORIES: Array<{ id: EditCategory; label: string; blurb: string }> = [
  { id: 'tools', label: 'Quick tools', blurb: 'Upscale, sharpen and cut out. No prompt needed.' },
  { id: 'retouch', label: 'Portrait & retouch', blurb: 'Same person, better photo.' },
  { id: 'game', label: 'Games & toys', blurb: 'Turn the photo into a game screen or a collectible.' },
  { id: 'nostalgia', label: 'Nostalgia', blurb: 'Send the person back a few decades.' },
];

/** Identity-preserving edit models, best first. The first one in the catalog wins. */
export const EDIT_MODELS = ['nano-banana-pro-i2i', 'nano-banana-2-edit', 'seedream-5-pro-edit', 'gpt-image-2-edit'];

export interface EditChoice {
  /** What the user is picking, e.g. "Expression". */
  label: string;
  options: string[];
}

export interface PhotoEdit {
  id: string;
  name: string;
  category: EditCategory;
  tagline: string;
  notes: string[];
  /** The edit instruction. `{choice}` is replaced with the picked option. */
  prompt: string;
  /** A blank the user fills in (expression, pose…); the first option is the default. */
  choice?: EditChoice;
  /** Catalog model to use. Defaults to the first available of EDIT_MODELS. */
  model?: string;
  /** Settings applied when the model offers them, e.g. { aspect_ratio: '9:16' }. */
  controls?: Record<string, string>;
  /** Lucide icon name drawn on the swatch (see EditCover). */
  icon: 'upscale' | 'sharpen' | 'cutout' | 'portrait' | 'sparkle' | 'smile' | 'pose' | 'scene' | 'shirt'
    | 'gamepad' | 'pickaxe' | 'box' | 'film' | 'vhs' | 'book';
  swatch: string;
  texture: SwatchTexture;
  ink: 'light' | 'dark';
  cover?: string;
  isNew?: boolean;
}

/** Kept in every person edit so faces don't drift. */
const KEEP_IDENTITY =
  'Keep the person exactly recognisable: same face, facial structure, skin tone, eye colour, hairstyle and body proportions.';

export const PHOTO_EDITS: PhotoEdit[] = [
  // ─── Quick tools ──────────────────────────────────────────────────────────
  {
    id: 'upscale-2x',
    name: 'Upscale 2×',
    category: 'tools',
    tagline: 'Double the resolution, restore real detail',
    notes: ['Topaz', 'Print-ready', 'No prompt'],
    prompt: '',
    model: 'topaz-image-upscale',
    controls: { upscale_factor: '2' },
    icon: 'upscale',
    swatch: 'linear-gradient(150deg, #0B5CAD 0%, #1D7FD6 50%, #8EC5F5 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/upscale.webp',
  },
  {
    id: 'upscale-4x',
    name: 'Upscale 4×',
    category: 'tools',
    tagline: 'Four times bigger for posters and print',
    notes: ['Topaz', 'Large prints', 'No prompt'],
    prompt: '',
    model: 'topaz-image-upscale',
    controls: { upscale_factor: '4' },
    icon: 'upscale',
    swatch: 'linear-gradient(150deg, #062F5C 0%, #0B5CAD 50%, #4FA3EE 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/upscale.webp',
  },
  {
    id: 'crisp-sharpen',
    name: 'Quick Sharpen',
    category: 'tools',
    tagline: 'Crisp up a soft or small image for almost nothing',
    notes: ['Recraft', 'Budget', 'No prompt'],
    prompt: '',
    model: 'recraft-crisp-upscale',
    icon: 'sharpen',
    swatch: 'linear-gradient(150deg, #E24C2B 0%, #F08A5D 55%, #FBD1B8 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/crisp-sharpen.webp',
  },
  {
    id: 'remove-background',
    name: 'Remove Background',
    category: 'tools',
    tagline: 'Cut out the person or product onto transparency',
    notes: ['Recraft', 'Transparent PNG', 'No prompt'],
    prompt: '',
    model: 'recraft-remove-background',
    icon: 'cutout',
    swatch: 'repeating-conic-gradient(#E9E9EC 0% 25%, #FFFFFF 0% 50%) 50% / 18px 18px',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/remove-background.webp',
  },

  // ─── Portrait & retouch ───────────────────────────────────────────────────
  {
    id: 'pro-headshot',
    name: 'Pro Headshot',
    category: 'retouch',
    tagline: 'Any photo into a clean studio headshot',
    notes: ['Studio grey', '85mm', 'LinkedIn-ready'],
    prompt:
      'Turn the person in this photo into a clean, professional studio headshot. ' + KEEP_IDENTITY +
      ' Keep their exact clothing, accessories and jewellery with accurate fabric texture and colour. ' +
      'Tight head-and-shoulders framing, centred, eye-level camera, neutral confident expression looking straight into the lens. ' +
      'Replace the background with a seamless light grey studio backdrop with soft falloff, no texture or environment. ' +
      'High-end studio beauty lighting: large soft key light slightly above eye level, gentle front fill, subtle rim light to separate the shoulders, catchlights in both eyes. ' +
      'Shot on an 85mm portrait lens at f/1.8, crisp focus on the eyes, ears and shoulders slightly softer. ' +
      'Realistic skin with visible pores and fine texture, no plastic smoothing; remove only temporary blemishes. ' +
      'Neutral balanced colour grade, polished agency headshot finish.',
    controls: { aspect_ratio: '4:5' },
    icon: 'portrait',
    swatch: 'radial-gradient(70% 60% at 50% 38%, #F4F4F5 0%, #C9CBCF 55%, #8C9096 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/pro-headshot.webp',
    isNew: true,
  },
  {
    id: 'skin-retouch',
    name: 'Skin Retouch',
    category: 'retouch',
    tagline: 'Clear skin that still looks like real skin',
    notes: ['Invisible edit', 'Keeps pores', 'No airbrush'],
    prompt:
      'Professional skin retouch on this photo. Preserve the original identity, facial structure and expression exactly. ' +
      'Reduce temporary blemishes, acne and redness only; keep pores, freckles, moles and natural variation in tone. ' +
      'Even out skin tone subtly without flattening depth, keep natural highlights and shadow transitions. ' +
      'Soften under-eye shadows slightly without removing them. Leave eyes, lips, hair and eyebrows untouched. ' +
      'No reshaping of features, no artificial glow, no plastic or airbrushed finish, no over-sharpening. ' +
      'Keep the original lighting, colour balance, background and framing exactly. The edit should be invisible and photorealistic.',
    icon: 'sparkle',
    swatch: 'linear-gradient(160deg, #F7E6DC 0%, #E8C4AE 50%, #C99579 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/edits/skin-retouch.webp',
    isNew: true,
  },
  {
    id: 'change-expression',
    name: 'Change Expression',
    category: 'retouch',
    tagline: 'Same photo, a different mood on their face',
    notes: ['Smile', 'Laugh', 'Surprise'],
    prompt:
      'Change the facial expression of the person in this photo to {choice}. ' + KEEP_IDENTITY +
      ' Keep the lighting, pose, clothing, background and framing exactly the same. ' +
      'Make the new expression look natural and genuine, with matching changes around the eyes and cheeks, and blend it seamlessly into the original photo.',
    choice: {
      label: 'Expression',
      options: ['a warm natural smile', 'laughing out loud', 'surprised', 'serious and focused', 'a confident smirk', 'thoughtful, looking away'],
    },
    icon: 'smile',
    swatch: 'linear-gradient(150deg, #FFE08A 0%, #FFB86B 50%, #F47C5C 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/change-expression.webp',
    isNew: true,
  },
  {
    id: 'change-pose',
    name: 'Change Pose',
    category: 'retouch',
    tagline: 'Re-pose the person without a reshoot',
    notes: ['Arms crossed', 'Walking', 'Sitting'],
    prompt:
      'Change the pose of the person in this photo to {choice}. ' + KEEP_IDENTITY +
      ' Keep their expression, clothing, skin texture, lighting, shadows, camera angle, background and overall photo style as consistent as possible. ' +
      'Make the new pose natural, balanced and anatomically correct, with believable weight, posture, clothing folds, contact points and shadows that match the scene. ' +
      'Do not distort the face, warp the body, add extra fingers or limbs, or change the background. ' +
      'The result should look like a seamless photo of the same person captured in the new pose.',
    choice: {
      label: 'Pose',
      options: ['arms crossed', 'hands in pockets', 'walking towards the camera', 'sitting cross-legged', 'looking back over the shoulder', 'leaning against a wall', 'jumping mid-air'],
    },
    icon: 'pose',
    swatch: 'linear-gradient(150deg, #9FC4F5 0%, #5C8FD6 50%, #22335C 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/change-pose.webp',
    isNew: true,
  },
  {
    id: 'change-background',
    name: 'New Background',
    category: 'retouch',
    tagline: 'Put the person somewhere else, lit to match',
    notes: ['Relit', 'Matched shadows', 'Same person'],
    prompt:
      'Move the person from this photo to a new setting: {choice}. ' + KEEP_IDENTITY +
      ' Keep their pose, expression and clothing exactly. Replace only the background, and relight the person so the direction, colour and softness of the light match the new setting, with realistic contact shadows and edge light. ' +
      'Match perspective, lens and depth of field so it reads as one real photograph, not a cut-out.',
    choice: {
      label: 'Setting',
      options: ['a clean light grey photo studio', 'a city street at night with neon signs', 'a beach at golden hour', 'a bright modern office', 'a misty pine forest', 'a luxury hotel lobby'],
    },
    icon: 'scene',
    swatch: 'linear-gradient(180deg, #7EC8F0 0%, #F2C38B 60%, #C2793F 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/edits/change-background.webp',
  },
  {
    id: 'change-outfit',
    name: 'Change Outfit',
    category: 'retouch',
    tagline: 'Try a new look on the same person',
    notes: ['Styling', 'Real fabric', 'Same pose'],
    prompt:
      'Dress the person in this photo in {choice}. ' + KEEP_IDENTITY +
      ' Keep their pose, expression, background, lighting and framing exactly. ' +
      'The new clothing should fit their body naturally, with realistic fabric texture, folds, seams and shadows that match the original light.',
    choice: {
      label: 'Outfit',
      options: ['a sharp tailored navy suit', 'relaxed streetwear with a hoodie and sneakers', 'a black-tie evening look', 'smart casual linen', 'athletic training gear', 'a cosy knit sweater and jeans'],
    },
    icon: 'shirt',
    swatch: 'linear-gradient(150deg, #2B2B3A 0%, #5A4A6E 50%, #C9A48C 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/change-outfit.webp',
  },

  // ─── Games & toys ─────────────────────────────────────────────────────────
  {
    id: 'gta-effect',
    name: 'GTA Effect',
    category: 'game',
    tagline: 'Rebuild the photo as a GTA V screenshot',
    notes: ['Rage engine', 'Polygons', 'Los Santos'],
    prompt:
      'Rebuild the entire scene from this photo as a real-time 3D render inside the GTA V game engine. Do not just apply a filter: reconstruct every person, vehicle, building, prop and the terrain as polygonal 3D game assets. ' +
      'The person keeps their recognisable face, hair, clothing and pose, but with GTA V character proportions: slightly exaggerated, digitally sculpted, matte skin without photographic pores, clumped card-based hair, and flat fabric shaders with visible seams. ' +
      'Environment feels like Los Santos: modular buildings with slightly sharp edges, tiled surfaces, simplified but dense props and vegetation. ' +
      'GTA V real-time lighting: strong directional sun or overcast skylight, hard shadows, light ambient occlusion, imperfect screen-space reflections, the recognisable slightly saturated GTA V colour grade. ' +
      'No real-world depth of field or lens artefacts. Camera feels like a third-person gameplay or Rockstar Editor capture on a high-end PC at ultra settings. Clearly a video game, not a photograph.',
    // Nano Banana keeps too much of the photo here; GPT Image commits to the game look.
    model: 'gpt-image-2-edit',
    icon: 'gamepad',
    swatch: 'linear-gradient(160deg, #F2A65A 0%, #E0617A 45%, #3B2E6E 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/gta-effect.webp',
    isNew: true,
  },
  {
    id: 'minecraft-you-died',
    name: 'Minecraft "You Died"',
    category: 'game',
    tagline: 'Lying in the snow on a real-life death screen',
    notes: ['Top-down', 'Pixel props', '9:16'],
    prompt:
      'Use the face and body of the person in this photo. ' + KEEP_IDENTITY +
      ' Create an ultra-realistic cinematic top-down winter scene inspired by the Minecraft death screen: the person lies naturally spread out on fresh snow in a realistic jacket, scarf, gloves, jeans and boots, with footprints, soft falling snow and desaturated blue-grey tones. ' +
      'Around them, place realistic pixelated Minecraft-style items: a diamond sword, a diamond pickaxe, a bow, an emerald, a steak, an Ender Eye, and a spider mob partly in frame, blended into the photo with real shadows and depth. ' +
      'At the top, a "You died!" overlay in authentic pixel font with "Score: 0", a small crosshair and two retro buttons labelled "Respawn" and "Title Screen". ' +
      'Dramatic cinematic lighting, DSLR realism, sharp detail, subtle depth of field. No distorted anatomy, extra limbs, duplicate objects or text errors.',
    controls: { aspect_ratio: '9:16' },
    icon: 'pickaxe',
    swatch: 'linear-gradient(180deg, #2B3A55 0%, #6F87A8 45%, #DCE6F0 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/minecraft-you-died.webp',
    isNew: true,
  },
  {
    id: 'action-figure',
    name: 'Action Figure',
    category: 'game',
    tagline: 'A boxed collectible figure of the person',
    notes: ['Blister pack', 'Accessories', 'Toy shelf'],
    prompt:
      'Turn the person in this photo into a realistic collectible action figure, sealed in a retail blister-pack box. The figure has their face, hairstyle, outfit and build, sculpted and painted like a premium plastic toy with visible joint articulation. ' +
      'Inside the box beside the figure: three small accessories that suit them. The cardboard backing has bold toy-packaging graphics and a short heroic product title. ' +
      'Shot as a product photo on a toy store shelf, soft studio light, glossy plastic reflections, shallow depth of field.',
    controls: { aspect_ratio: '3:4' },
    icon: 'box',
    swatch: 'linear-gradient(150deg, #FFD23F 0%, #EE4266 50%, #3BCEAC 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/action-figure.webp',
  },
  {
    id: 'animated-movie',
    name: 'Animated Movie',
    category: 'game',
    tagline: 'As a 3D animated feature film character',
    notes: ['3D animation', 'Expressive', 'Soft light'],
    prompt:
      'Recreate the person in this photo as a character in a modern 3D animated feature film. Keep them clearly recognisable: same hairstyle, face shape, skin tone, outfit and pose, translated into stylised animated proportions with large expressive eyes and soft rounded forms. ' +
      'Rebuild the background as a matching animated set. Warm cinematic lighting with soft bounce light and subsurface scattering on the skin, rich colour, a frame from a family animated movie.',
    icon: 'film',
    swatch: 'linear-gradient(160deg, #8FD3FE 0%, #FFD1E8 50%, #FFB86B 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/edits/animated-movie.webp',
  },

  // ─── Nostalgia ────────────────────────────────────────────────────────────
  {
    id: 'vhs-home-video',
    name: '90s Home Video',
    category: 'nostalgia',
    tagline: 'A VHS camcorder still from a family tape',
    notes: ['VHS', 'Date stamp', 'Camcorder'],
    prompt:
      'Use this photo as the face and identity reference. Show the person as a parent caught on a 1990s family home video at {choice}, framed casually as if a relative filmed the moment without planning it. ' +
      'Keep them recognisable but dress them in era-appropriate clothes like a loose retro sweater or patterned shirt, with relatives and simple decorations around them. ' +
      'Make it look like a frame grabbed from a VHS Handycam: analogue blur, scan lines, tape noise, colour bleed, slightly washed colours, low resolution, imperfect handheld framing, and an orange camcorder date stamp in the lower left.',
    choice: {
      label: 'Moment',
      options: ['a backyard birthday barbecue', 'Christmas morning in the living room', 'a beach holiday', 'a school sports day', 'a wedding reception dance floor'],
    },
    controls: { aspect_ratio: '4:3' },
    icon: 'vhs',
    swatch: 'linear-gradient(180deg, #2A1F3D 0%, #6B4E8C 40%, #C7A46B 100%)',
    texture: 'scanlines',
    ink: 'light',
    cover: '/presets/edits/vhs-home-video.webp',
    isNew: true,
  },
  {
    id: 'yearbook-90s',
    name: 'Yearbook Photo',
    category: 'nostalgia',
    tagline: 'A 90s school portrait, mottled backdrop and all',
    notes: ['Laser backdrop', 'Film print', 'Big hair'],
    prompt:
      'Turn the person in this photo into a 1990s American high-school yearbook portrait. ' + KEEP_IDENTITY +
      ' Era-appropriate hair styling and clothing, a slightly awkward school-photographer smile, head-and-shoulders framing with a slight head tilt. ' +
      'Classic mottled blue studio backdrop, soft flash with a faint shadow, printed on glossy film paper with mild grain, slightly faded colours and soft focus.',
    controls: { aspect_ratio: '4:5' },
    icon: 'book',
    swatch: 'radial-gradient(80% 70% at 50% 40%, #8FB3E8 0%, #4E6FAF 55%, #263C6E 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/yearbook-90s.webp',
  },
];

export function getEdit(id: string | null | undefined): PhotoEdit | undefined {
  return id ? PHOTO_EDITS.find((e) => e.id === id) : undefined;
}

/** The prompt for an edit, with its blank filled in (the first option by default). */
export function editPrompt(edit: PhotoEdit, choice?: string): string {
  const pick = choice?.trim() || edit.choice?.options[0] || '';
  return edit.prompt.replace(/\{choice\}/g, pick);
}
