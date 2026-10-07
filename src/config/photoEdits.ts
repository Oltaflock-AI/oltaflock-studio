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

export type EditCategory = 'tools' | 'fixes' | 'retouch' | 'portraits' | 'game' | 'product' | 'nostalgia';

export const EDIT_CATEGORIES: Array<{ id: EditCategory; label: string; blurb: string }> = [
  { id: 'tools', label: 'Quick tools', blurb: 'Upscale, sharpen and cut out. No prompt needed.' },
  { id: 'fixes', label: 'Photo fixes', blurb: 'Restore, relight and clean up a photo.' },
  { id: 'retouch', label: 'Portrait & retouch', blurb: 'Same person, better photo.' },
  { id: 'portraits', label: 'Portraits & posters', blurb: 'Profile photos, covers and posters.' },
  { id: 'game', label: 'Games & cartoons', blurb: 'Step into a game, a cartoon, an anime or a toy box.' },
  { id: 'product', label: 'Product shots', blurb: 'For a product photo: packshots and ad scenes.' },
  { id: 'nostalgia', label: 'Nostalgia', blurb: 'Send the person back a few decades.' },
];

/** Identity-preserving edit models, best first. The first one in the catalog wins. */
export const EDIT_MODELS = ['nano-banana-2.1-edit', 'nano-banana-2-edit', 'seedream-5-pro-edit', 'gpt-image-2-edit'];

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
  icon:
    | 'upscale' | 'sharpen' | 'cutout' | 'portrait' | 'sparkle' | 'smile' | 'pose' | 'scene' | 'shirt'
    | 'gamepad' | 'pickaxe' | 'box' | 'film' | 'vhs' | 'book'
    | 'restore' | 'sun' | 'eraser' | 'expand' | 'glasses'
    | 'id' | 'briefcase' | 'magazine' | 'poster' | 'camera'
    | 'crosshair' | 'tv' | 'anime' | 'cloud' | 'pixel' | 'comic'
    | 'package' | 'home' | 'splash' | 'billboard' | 'palette';
  swatch: string;
  texture: SwatchTexture;
  ink: 'light' | 'dark';
  cover?: string;
  isNew?: boolean;
}

/** Kept in every person edit so faces don't drift. */
const KEEP_IDENTITY =
  'Keep the person exactly recognisable: same face, facial structure, skin tone, eye colour, hairstyle and body proportions.';

/** Kept in every product edit so the product itself never changes. */
const KEEP_PRODUCT =
  'Keep the product exactly as it is: same shape, proportions, colours, materials, label text and logos, with no redesign.';

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

  // ─── Photo fixes ──────────────────────────────────────────────────────────
  {
    id: 'restore-colorize',
    name: 'Restore & Colourise',
    category: 'fixes',
    tagline: 'Repair an old photo and bring back its colour',
    notes: ['Scratches', 'Faded prints', 'Natural colour'],
    prompt:
      'Restore this old photograph. Repair scratches, tears, dust, creases, stains and faded areas, and recover lost detail in faces, hair and clothing without inventing new features. ' +
      'Keep every person exactly recognisable, with the same faces, expressions and poses, and keep the original composition and framing. ' +
      'Colourise it naturally with believable, period-appropriate colours: realistic skin tones, fabric colours and background. ' +
      'The result should look like a well-preserved colour photograph from the same era, sharp but not over-processed, with gentle film grain and no plastic smoothing.',
    icon: 'restore',
    swatch: 'linear-gradient(135deg, #B9A88C 0%, #8F7B5E 45%, #E3B26B 75%, #6FA8C9 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/restore-colorize.webp',
    isNew: true,
  },
  {
    id: 'relight',
    name: 'Relight',
    category: 'fixes',
    tagline: 'Change the light without reshooting',
    notes: ['Golden hour', 'Studio', 'Same scene'],
    prompt:
      'Relight this photo with {choice}. Keep everything else exactly the same: people, faces, expressions, poses, clothing, objects, background and framing. ' +
      'Change only the lighting: its direction, colour, softness, shadows, highlights and reflections, so they are physically consistent across the whole scene. ' +
      'Photorealistic, natural skin, no added objects.',
    choice: {
      label: 'Light',
      options: ['warm golden hour sunlight from the side', 'soft professional studio lighting', 'moody low-key light with deep shadows', 'cool blue-hour twilight with warm practical lights', 'bright, even overcast daylight', 'colourful neon light in pink and teal'],
    },
    icon: 'sun',
    swatch: 'radial-gradient(110% 90% at 80% 15%, #FFE3A1 0%, #F7B267 35%, #6B5E8E 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/edits/relight.webp',
    isNew: true,
  },
  {
    id: 'remove-objects',
    name: 'Remove Objects',
    category: 'fixes',
    tagline: 'Erase what shouldn\'t be there',
    notes: ['Photobombers', 'Clutter', 'Clean fill'],
    prompt:
      'Remove {choice} from this photo. Fill the removed areas with background that continues naturally, matching perspective, texture, lighting, shadows and grain so no trace or smudge is left. ' +
      'Keep everything else exactly the same: the main subject, their face, pose and clothing, the framing and the colours.',
    choice: {
      label: 'Remove',
      options: ['the people in the background', 'the cars and traffic', 'text, signs and logos', 'power lines and wires', 'litter and clutter', 'the photobomber next to the main subject'],
    },
    icon: 'eraser',
    swatch: 'linear-gradient(150deg, #F2F2F4 0%, #D9DCE3 50%, #A9B2C3 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/remove-objects.webp',
    isNew: true,
  },
  {
    id: 'extend-canvas',
    name: 'Extend the Frame',
    category: 'fixes',
    tagline: 'Widen a photo by imagining what\'s around it',
    notes: ['Outpaint', '16:9', 'Seamless'],
    prompt:
      'Extend this photo outwards to a wider frame. Keep the original image content exactly as it is, unchanged and at the same scale, in the middle of the new frame. ' +
      'Continue the scene naturally on every side, matching the perspective, horizon, lighting, colours, lens, depth of field and grain so there is no visible seam. ' +
      'Add only believable surroundings that fit the location; no new people or text.',
    controls: { aspect_ratio: '16:9' },
    icon: 'expand',
    swatch: 'linear-gradient(90deg, #C8D6E5 0%, #8FA9C8 30%, #3E5F8A 50%, #8FA9C8 70%, #C8D6E5 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/extend-canvas.webp',
    isNew: true,
  },
  {
    id: 'glasses',
    name: 'Glasses On/Off',
    category: 'fixes',
    tagline: 'Add or remove glasses, naturally',
    notes: ['Remove glare', 'Add frames', 'Same eyes'],
    prompt:
      'Edit this photo: {choice}. ' + KEEP_IDENTITY +
      ' Keep the eyes, eyebrows, expression, skin, lighting, clothing, background and framing the same. Make the eye area look natural, with correct reflections, shadows and contact with the nose and ears.',
    choice: {
      label: 'Change',
      options: ['remove their glasses completely and show their natural eyes', 'add thin round gold-rimmed glasses', 'add bold black rectangular glasses', 'add classic black sunglasses', 'remove the glare from their glasses'],
    },
    icon: 'glasses',
    swatch: 'linear-gradient(150deg, #E9E4DA 0%, #BFB6A6 50%, #3C3A36 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/glasses.webp',
    isNew: true,
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

  // ─── Portraits & posters ──────────────────────────────────────────────────
  {
    id: 'passport-photo',
    name: 'Passport Photo',
    category: 'portraits',
    tagline: 'An ID-ready photo from any picture',
    notes: ['White background', 'Front-facing', 'Even light'],
    prompt:
      'Turn this into an official passport / ID photo of the person. ' + KEEP_IDENTITY +
      ' Head and top of shoulders, facing the camera straight on, head centred and level, eyes open looking directly into the lens, neutral expression with mouth closed. ' +
      'Plain, evenly lit off-white background with no shadows or texture. Soft, even front lighting with no shadows on the face or background and no glare. ' +
      'Plain everyday clothing, no hats, no sunglasses, hair away from the eyes. True-to-life skin tone and colour, sharp focus, no retouching or beautifying.',
    controls: { aspect_ratio: '4:5' },
    icon: 'id',
    swatch: 'linear-gradient(180deg, #FFFFFF 0%, #EEF1F5 60%, #C9D3DF 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/passport-photo.webp',
    isNew: true,
  },
  {
    id: 'linkedin-banner',
    name: 'Profile Banner',
    category: 'portraits',
    tagline: 'A wide LinkedIn-style header with you in it',
    notes: ['LinkedIn', 'Wide', 'Professional'],
    prompt:
      'Create a wide professional profile banner featuring the person from this photo. ' + KEEP_IDENTITY +
      ' Place them on the right third of the frame, chest-up, smartly dressed in their own style, with a confident, approachable expression. ' +
      'The rest of the banner is a clean, modern backdrop that suits {choice}, softly out of focus and uncluttered, leaving calm empty space on the left. ' +
      'Soft natural light, polished corporate photography, no text, no logos.',
    choice: {
      label: 'Field',
      options: ['technology and startups', 'finance and consulting', 'design and creative work', 'healthcare', 'education and coaching', 'real estate'],
    },
    controls: { aspect_ratio: '21:9' },
    icon: 'briefcase',
    swatch: 'linear-gradient(90deg, #0A66C2 0%, #3C86D3 45%, #D9E7F5 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/linkedin-banner.webp',
    isNew: true,
  },
  {
    id: 'magazine-cover',
    name: 'Magazine Cover',
    category: 'portraits',
    tagline: 'The person as this month\'s cover star',
    notes: ['Masthead', 'Headlines', 'Editorial'],
    prompt:
      'Create a glossy {choice} cover starring the person from this photo. ' + KEEP_IDENTITY +
      ' Styled and photographed for the cover with professional editorial lighting, confident pose and wardrobe that suits the magazine. ' +
      'Add a bold invented masthead at the top, an issue date and price, and three or four short cover lines in clean magazine typography arranged around the person without covering their face. ' +
      'All text spelled correctly and legible. Printed magazine look with a subtle paper sheen.',
    choice: {
      label: 'Magazine',
      options: ['high-fashion magazine', 'business magazine', 'fitness magazine', 'music magazine', 'travel magazine', 'tech magazine'],
    },
    controls: { aspect_ratio: '3:4' },
    icon: 'magazine',
    swatch: 'linear-gradient(160deg, #E8327B 0%, #F6F1EB 45%, #1A1A1A 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/magazine-cover.webp',
    isNew: true,
  },
  {
    id: 'movie-poster',
    name: 'Movie Poster',
    category: 'portraits',
    tagline: 'Star in your own film one-sheet',
    notes: ['Title', 'Credits block', 'Key art'],
    prompt:
      'Design a theatrical {choice} movie poster starring the person from this photo as the lead. ' + KEEP_IDENTITY +
      ' Dramatic key art that fits the genre: cinematic lighting, strong composition and an atmospheric background scene. ' +
      'Add an invented film title in bold genre-appropriate lettering, a short tagline, a release date and a small billing block of credits at the bottom. ' +
      'All text spelled correctly. Looks like a real printed one-sheet.',
    choice: {
      label: 'Genre',
      options: ['action thriller', 'sci-fi', 'romantic comedy', 'horror', 'heist', 'fantasy adventure'],
    },
    controls: { aspect_ratio: '2:3' },
    icon: 'poster',
    swatch: 'linear-gradient(180deg, #0B0B12 0%, #3A1020 50%, #C4773B 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/movie-poster.webp',
    isNew: true,
  },
  {
    id: 'younger-self',
    name: 'With Your Younger Self',
    category: 'portraits',
    tagline: 'A Polaroid of you hugging the kid you were',
    notes: ['Polaroid', 'Two ages', 'Heartfelt'],
    prompt:
      'Create an instant Polaroid photo of the person from this photo today, hugging a young child version of themselves at about seven years old. ' +
      'Both are clearly the same person: the child has the same face shape, eyes, skin tone and hair, at a younger age. ' +
      'They stand side by side in front of a plain white curtain, warm and affectionate, slightly blurred as if taken with a flash in a dim room. ' +
      'Classic white Polaroid frame, soft flash, gentle film grain and slightly faded colours.',
    controls: { aspect_ratio: '4:5' },
    icon: 'camera',
    swatch: 'linear-gradient(180deg, #FAF7F0 0%, #F1E7D3 70%, #D9C7A3 100%)',
    texture: 'flash',
    ink: 'dark',
    cover: '/presets/edits/younger-self.webp',
    isNew: true,
  },

  // ─── Games & cartoons ─────────────────────────────────────────────────────
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

  {
    id: 'battle-royale-3d',
    name: 'Battle Royale Hero',
    category: 'game',
    tagline: 'A stylised 3D game skin, Fortnite-style',
    notes: ['Fortnite-style', '3D skin', 'Lobby pose'],
    prompt:
      'Turn the person in this photo into a playable character skin in a colourful stylised 3D battle-royale game, in the style of Fortnite. ' +
      'Keep them recognisable: same face shape, hairstyle, skin tone and outfit colours, translated into chunky, clean, slightly exaggerated cartoon-3D proportions with smooth shading. ' +
      'Show them in a heroic lobby pose on a bright game-menu backdrop with soft rim lighting, crisp edges and saturated colours. No real logos or UI text.',
    model: 'gpt-image-2-edit',
    icon: 'crosshair',
    swatch: 'linear-gradient(150deg, #6A5CFF 0%, #2FC6F6 50%, #FFD84D 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/battle-royale-3d.webp',
    isNew: true,
  },
  {
    id: 'yellow-cartoon',
    name: 'Yellow Sitcom Cartoon',
    category: 'game',
    tagline: 'As a character in a classic yellow-skinned TV cartoon',
    notes: ['Simpsons-style', '2D', 'Flat colour'],
    prompt:
      'Redraw the person in this photo as a character in the style of The Simpsons: yellow skin, big round eyes, overbite, four-fingered hands, thick clean black outlines and flat bright colours. ' +
      'Keep them recognisable through their hairstyle, facial hair, outfit and colours. ' +
      'Redraw the background as a matching flat 2D cartoon version of the same place. Looks like a frame from the TV show.',
    model: 'gpt-image-2-edit',
    icon: 'tv',
    swatch: 'linear-gradient(160deg, #FFD90F 0%, #FFE97A 45%, #70D1FE 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/yellow-cartoon.webp',
    isNew: true,
  },
  {
    id: 'anime-screenshot',
    name: 'Anime Screenshot',
    category: 'game',
    tagline: 'A frame from a modern TV anime',
    notes: ['Cel-shaded', 'Detailed BG', 'Key frame'],
    prompt:
      'Redraw this photo as a still frame from a modern high-budget TV anime. Keep the person recognisable: same hairstyle, hair colour, face shape, outfit and pose, in anime proportions with expressive eyes. ' +
      'Clean line art, cel shading with soft gradients, a detailed painted background of the same place, cinematic lighting and atmosphere. ' +
      'Looks like a real anime screenshot, 16:9 frame, no subtitles.',
    controls: { aspect_ratio: '16:9' },
    icon: 'anime',
    swatch: 'linear-gradient(170deg, #FF9EC7 0%, #B8A6FF 45%, #6EC6FF 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/anime-screenshot.webp',
    isNew: true,
  },
  {
    id: 'storybook-anime',
    name: 'Storybook Anime',
    category: 'game',
    tagline: 'Hand-painted, Ghibli-style gentle world',
    notes: ['Ghibli-style', 'Watercolour', 'Warm'],
    prompt:
      'Recreate this photo as a hand-painted frame in the style of a Studio Ghibli film. Keep the person recognisable: same hairstyle, face shape, outfit and pose, drawn with soft simple features. ' +
      'Lush watercolour-and-gouache background of the same place, with fluffy clouds, gentle sunlight, rich greens and warm nostalgic colour. ' +
      'Soft clean line art, painterly textures and a calm, whimsical feeling.',
    controls: { aspect_ratio: '16:9' },
    icon: 'cloud',
    swatch: 'linear-gradient(180deg, #8ED1F2 0%, #CDEBC0 55%, #7FB069 100%)',
    texture: 'haze',
    ink: 'dark',
    cover: '/presets/edits/storybook-anime.webp',
    isNew: true,
  },
  {
    id: 'pixel-sprite',
    name: 'Pixel Art',
    category: 'game',
    tagline: 'A 16-bit game sprite and scene',
    notes: ['16-bit', 'Retro game', 'Limited palette'],
    prompt:
      'Turn this photo into 16-bit retro video game pixel art. The person becomes a pixel sprite with recognisable hairstyle, skin tone and outfit colours, standing in a pixel-art version of the same place. ' +
      'Crisp square pixels on a visible grid, a limited palette, simple dithering for shading, no anti-aliasing or blur. Looks like a screenshot from a classic side-scrolling game, no UI text.',
    model: 'gpt-image-2-edit',
    icon: 'pixel',
    swatch: 'repeating-linear-gradient(90deg, #3B3B98 0 12px, #4E4EB8 12px 24px), #3B3B98',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/pixel-sprite.webp',
    isNew: true,
  },
  {
    id: 'comic-panel',
    name: 'Comic Panel',
    category: 'game',
    tagline: 'A comic-book panel with a speech bubble',
    notes: ['Ink & halftone', 'Speech bubble', 'Bold colour'],
    prompt:
      'Redraw this photo as a single comic-book panel. Keep the person recognisable: same face, hairstyle, outfit and pose, in bold inked comic style with halftone dot shading and punchy flat colours. ' +
      'Dynamic framing and a dramatic comic background of the same place. Add one speech bubble from the person that says "{choice}", lettered cleanly in comic font and spelled exactly.',
    choice: {
      label: 'Speech bubble',
      options: ['Let\'s do this!', 'Not today.', 'Did someone order coffee?', 'I knew it!', 'Wait for it…'],
    },
    model: 'gpt-image-2-edit',
    icon: 'comic',
    swatch: 'radial-gradient(rgba(0,0,0,0.25) 1.5px, transparent 2px) 0 0 / 9px 9px, linear-gradient(150deg, #FFE14D 0%, #FF5A5F 60%, #2B59C3 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/comic-panel.webp',
    isNew: true,
  },

  // ─── Product shots ────────────────────────────────────────────────────────
  {
    id: 'packshot-white',
    name: 'Packshot on White',
    category: 'product',
    tagline: 'A clean e-commerce photo of the product',
    notes: ['Pure white', 'Soft shadow', 'Marketplace-ready'],
    prompt:
      'Turn this into a professional e-commerce packshot of the product. ' + KEEP_PRODUCT +
      ' Isolate it on a pure white seamless background, centred and filling about 80% of the frame, shown from its most flattering angle. ' +
      'Soft, even studio lighting with gentle highlights that show the material, a subtle natural contact shadow beneath, no reflections of the room. Crisp focus edge to edge, accurate colour. No hands, props or text.',
    controls: { aspect_ratio: '1:1' },
    icon: 'package',
    swatch: 'radial-gradient(70% 60% at 50% 45%, #FFFFFF 0%, #F4F4F6 60%, #DADBE0 100%)',
    texture: 'none',
    ink: 'dark',
    cover: '/presets/edits/packshot-white.webp',
    isNew: true,
  },
  {
    id: 'lifestyle-scene',
    name: 'Lifestyle Scene',
    category: 'product',
    tagline: 'The product placed in a real-life setting',
    notes: ['In context', 'Natural light', 'Ad-ready'],
    prompt:
      'Place the product from this photo in this setting: {choice}. ' + KEEP_PRODUCT +
      ' It is the clear hero of the shot, at a believable real-world size, sitting naturally with correct contact shadows and reflections. ' +
      'Styled lifestyle advertising photography: natural light, tasteful props that suit it without hiding it, shallow depth of field, warm inviting colour.',
    choice: {
      label: 'Setting',
      options: ['a bright, minimal kitchen counter', 'a cosy living room side table', 'a marble bathroom shelf', 'an outdoor café table', 'a stylish home office desk', 'a picnic blanket in the park'],
    },
    controls: { aspect_ratio: '4:5' },
    icon: 'home',
    swatch: 'linear-gradient(150deg, #F3E9DC 0%, #D9C1A3 50%, #8C6E54 100%)',
    texture: 'grain',
    ink: 'dark',
    cover: '/presets/edits/lifestyle-scene.webp',
    isNew: true,
  },
  {
    id: 'floating-splash',
    name: 'Floating Splash',
    category: 'product',
    tagline: 'Product mid-air with a dramatic splash',
    notes: ['Levitating', 'Splash', 'High-speed'],
    prompt:
      'Show the product from this photo floating in mid-air at a slight dynamic angle, surrounded by a dramatic frozen splash of {choice}. ' + KEEP_PRODUCT +
      ' High-speed commercial photography: crisp droplets and particles, strong rim light, glossy highlights, a clean gradient background in colours that complement the product. Premium advert look.',
    choice: {
      label: 'Splash',
      options: ['water', 'milk', 'fresh fruit pieces', 'coloured powder', 'ice cubes and mist', 'flower petals'],
    },
    controls: { aspect_ratio: '4:5' },
    icon: 'splash',
    swatch: 'radial-gradient(60% 50% at 50% 50%, #CFF4FF 0%, #5BC0EB 50%, #0B4F8A 100%)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/floating-splash.webp',
    isNew: true,
  },
  {
    id: 'billboard-mockup',
    name: 'Billboard Mockup',
    category: 'product',
    tagline: 'See the image on a real billboard',
    notes: ['Outdoor ad', 'Perspective', 'City'],
    prompt:
      'Show this exact image, unchanged, as the artwork on {choice}. The artwork is mapped onto the board with correct perspective, scale and the slight texture of the printed or LED surface. ' +
      'Realistic surroundings and lighting, with the scene\'s light and reflections falling naturally on the board. Photographed from street level like a real advertising mockup.',
    choice: {
      label: 'Where',
      options: ['a large roadside billboard at golden hour', 'a huge LED screen in a busy city square at night', 'a bus shelter poster on a city street', 'a subway platform poster', 'the side of a building as a giant mural ad'],
    },
    controls: { aspect_ratio: '16:9' },
    icon: 'billboard',
    swatch: 'linear-gradient(180deg, #F2A65A 0%, #7A6C8E 55%, #232331 100%)',
    texture: 'grain',
    ink: 'light',
    cover: '/presets/edits/billboard-mockup.webp',
    isNew: true,
  },
  {
    id: 'colour-variants',
    name: 'Colour Variants',
    category: 'product',
    tagline: 'The same product in four colourways',
    notes: ['2×2 grid', 'Colourways', 'Same shot'],
    prompt:
      'Create a 2×2 grid showing the product from this photo in four colour variants: {choice}. ' +
      'In every tile the product has exactly the same shape, angle, lighting, background, label layout and text; only its main colour changes. Clean, consistent studio product photography with thin even gaps between tiles.',
    choice: {
      label: 'Colours',
      options: ['black, white, navy and sage green', 'pastel pink, mint, lilac and butter yellow', 'red, cobalt blue, emerald and mustard', 'matte black, silver, gold and rose gold'],
    },
    controls: { aspect_ratio: '1:1' },
    icon: 'palette',
    swatch: 'conic-gradient(from 90deg, #2B2B2B 0 25%, #F4F4F4 0 50%, #2E4A7D 0 75%, #9CB59A 0)',
    texture: 'none',
    ink: 'light',
    cover: '/presets/edits/colour-variants.webp',
    isNew: true,
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
