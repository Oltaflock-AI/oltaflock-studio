// Prompt Brain "what are you making?" profiles. The label/hint list is shared
// with the UI; the detailed guidance lives server-side in _shared/brain.

export interface UseCase {
  id: string;
  label: string;
  output: 'image' | 'video' | 'both';
  hint: string;
}

export const USE_CASES: UseCase[] = [
  { id: 'auto', label: 'Auto-detect', output: 'both', hint: 'Brain infers the format from your idea' },

  // Video
  { id: 'product-ad', label: 'Product ad', output: 'video', hint: 'Hero reveal, macro detail, premium lighting, end on the product' },
  { id: 'ugc', label: 'UGC / talking head', output: 'video', hint: 'Handheld selfie, natural light, direct-to-camera dialogue' },
  { id: 'cinematic', label: 'Cinematic scene', output: 'video', hint: 'Film language: lens, blocking, motivated light, one clear beat' },
  { id: 'social-hook', label: 'Social hook (vertical)', output: 'video', hint: '9:16, instant pattern-interrupt in the first second, fast pace' },
  { id: 'music-video', label: 'Music video', output: 'video', hint: 'Rhythmic cuts, stylized light, performance + mood' },
  { id: 'action-vfx', label: 'Action / VFX', output: 'video', hint: 'Clear physics, one hero move, tracked camera, impact moments' },
  { id: 'anime', label: 'Anime / stylized', output: 'both', hint: 'Named art style, line + palette cues, expressive motion' },
  { id: 'food-bev', label: 'Food & beverage', output: 'both', hint: 'Macro texture, steam/pour/condensation, appetizing warm light' },
  { id: 'fashion', label: 'Fashion / lookbook', output: 'both', hint: 'Fabric movement, runway/editorial framing, styled light' },
  { id: 'real-estate', label: 'Architecture / real estate', output: 'both', hint: 'Slow gimbal glides, wide lenses, balanced daylight' },
  { id: 'nature-doc', label: 'Nature / documentary', output: 'video', hint: 'Telephoto wildlife, natural behavior, ambient soundscape' },
  { id: 'explainer', label: 'Explainer / motion graphics', output: 'video', hint: 'Clean shapes, readable text, step-by-step motion' },
  { id: 'horror', label: 'Horror / thriller', output: 'video', hint: 'Low-key light, slow creeping camera, withheld reveals' },
  { id: 'sports', label: 'Sports / fitness', output: 'video', hint: 'High shutter, speed ramps, sweat and impact detail' },

  // Image
  { id: 'product-photo', label: 'Product photo', output: 'image', hint: 'Studio setup, surface, reflections, e-commerce or hero' },
  { id: 'portrait', label: 'Portrait / headshot', output: 'image', hint: 'Lens, light pattern, skin texture, expression' },
  { id: 'poster-text', label: 'Poster / typography', output: 'image', hint: 'Exact text in quotes, hierarchy, layout, font style' },
  { id: 'thumbnail', label: 'Thumbnail', output: 'image', hint: 'One bold focal subject, high contrast, space for text' },
  { id: 'concept-art', label: 'Concept art / illustration', output: 'image', hint: 'Medium, artist-agnostic style cues, world-building detail' },
  { id: 'interior', label: 'Interior design', output: 'image', hint: 'Materials, furniture, daylight direction, lens height' },
  { id: 'infographic', label: 'Infographic / diagram', output: 'image', hint: 'Structured layout, labels, legible text, flat palette' },
];

export function casesForOutput(output: 'image' | 'video'): UseCase[] {
  return USE_CASES.filter((u) => u.output === output || u.output === 'both');
}
