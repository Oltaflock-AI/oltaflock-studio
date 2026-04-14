// Kie.ai model routing configuration
// All models use POST https://api.kie.ai/api/v1/jobs/createTask
// Status: GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}

export const KIE_BASE_URL = 'https://api.kie.ai/api/v1';
export const KIE_CREATE_TASK = `${KIE_BASE_URL}/jobs/createTask`;
export const KIE_TASK_STATUS = `${KIE_BASE_URL}/jobs/recordInfo`;
export const KIE_CREDITS = `${KIE_BASE_URL}/chat/credit`;

export interface ModelRoute {
  kieModel: string;        // Kie.ai model identifier
  type: 'image' | 'video'; // For DB type field
  persona: string;         // For prompt brain
  buildInput: (prompt: string, controls: Record<string, unknown>, imageUrls?: string[]) => Record<string, unknown>;
}

export const MODEL_ROUTES: Record<string, ModelRoute> = {
  // ─── Text-to-Image ──────────────────────────────────
  'nano-banana-pro': {
    kieModel: 'google/nano-banana-pro',
    type: 'image',
    persona: 'a photorealistic image model that excels at detailed textures, lighting, and cinematic composition',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
      resolution: controls.resolution || '1K',
      output_format: controls.outputFormat || 'PNG',
    }),
  },
  'seedream-4.5': {
    kieModel: 'seedream/4.5-text-to-image',
    type: 'image',
    persona: 'an image model with strong aesthetic sensibility, good for portraits and mood-driven scenes',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
      quality: controls.quality || 'basic',
    }),
  },
  'flux-flex': {
    kieModel: 'flux-2/flex-text-to-image',
    type: 'image',
    persona: 'a versatile image model good at artistic styles, conceptual art, and stylized renders',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
      resolution: controls.resolution || '1K',
    }),
  },
  'flux-flex-pro': {
    kieModel: 'flux-2/pro-text-to-image',
    type: 'image',
    persona: 'a high-quality image model with excellent detail and professional output',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
      resolution: controls.resolution || '1K',
    }),
  },
  'gpt-4o': {
    kieModel: 'gpt-image/1.5-text-to-image',
    type: 'image',
    persona: 'GPT-4o image generation with strong understanding of complex prompts and creative concepts',
    buildInput: (prompt, controls) => ({
      prompt,
      size: controls.size || '1:1',
    }),
  },
  'z-image': {
    kieModel: 'z-image/z-image',
    type: 'image',
    persona: 'a fast image model optimized for quick iterations and experimentation',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
    }),
  },

  // ─── Text-to-Video ──────────────────────────────────
  'veo-3.1': {
    kieModel: 'veo-3.1',
    type: 'video',
    persona: 'a video generation model that responds well to motion descriptions, camera movements, and scene dynamics',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '16:9',
      model_version: controls.variant || 'veo3_fast',
    }),
  },
  'sora-2-pro': {
    kieModel: 'sora-2-pro-text-to-video',
    type: 'video',
    persona: 'a high-fidelity video model that benefits from precise physical descriptions and temporal flow cues',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || 'landscape',
      duration: String(controls.duration || 10),
      quality: controls.quality || 'standard',
    }),
  },
  'kling-2.6': {
    kieModel: 'kling-2.6/text-to-video',
    type: 'video',
    persona: 'an efficient video model with sound support, good for dynamic scenes and character motion',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '1:1',
      duration: String(controls.duration || 5),
      sound: controls.sound ?? false,
    }),
  },
  'seedance-1.0': {
    kieModel: `bytedance/v1-${'{variant}'}-text-to-video`,
    type: 'video',
    persona: 'a motion-focused video model great for dance, movement, and fluid animation sequences',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '16:9',
      resolution: controls.resolution || '720p',
      duration: String(controls.duration || 5),
    }),
  },
  'grok-imagine': {
    kieModel: 'grok-imagine/text-to-video',
    type: 'video',
    persona: 'Grok-powered video generation with creative interpretation of prompts',
    buildInput: (prompt, controls) => ({
      prompt,
      aspect_ratio: controls.aspectRatio || '16:9',
      mode: controls.mode || 'normal',
    }),
  },

  // ─── Image-to-Image ──────────────────────────────────
  'nano-banana-pro-i2i': {
    kieModel: 'google/nano-banana-pro-image-to-image',
    type: 'image',
    persona: 'an image transformation model for high-quality edits preserving original composition',
    buildInput: (prompt, controls, imageUrls) => ({
      prompt,
      image_url: imageUrls?.[0],
      aspect_ratio: controls.aspect_ratio || '1:1',
      resolution: controls.resolution || '1K',
      output_format: controls.output_format || 'PNG',
    }),
  },
  'seedream-4.5-edit': {
    kieModel: 'seedream/4.5-edit',
    type: 'image',
    persona: 'an image editing model with aesthetic sensibility for style transfer and refinement',
    buildInput: (prompt, controls, imageUrls) => ({
      prompt,
      image_url: imageUrls?.[0],
      aspect_ratio: controls.aspect_ratio || '1:1',
      quality: controls.quality || 'basic',
    }),
  },
  'flux-flex-i2i': {
    kieModel: 'flux-2/flex-image-to-image',
    type: 'image',
    persona: 'a versatile image-to-image model for artistic transformation and style changes',
    buildInput: (prompt, controls, imageUrls) => ({
      prompt,
      image_url: imageUrls?.[0],
      aspect_ratio: controls.aspect_ratio || '1:1',
      resolution: controls.resolution || '1K',
    }),
  },
  'flux-pro-i2i': {
    kieModel: 'flux-2/pro-image-to-image',
    type: 'image',
    persona: 'a high-quality image transformation model for professional-grade edits',
    buildInput: (prompt, controls, imageUrls) => ({
      prompt,
      image_url: imageUrls?.[0],
      aspect_ratio: controls.aspect_ratio || '1:1',
      resolution: controls.resolution || '1K',
    }),
  },
  'qwen-image-edit': {
    kieModel: 'qwen/image-edit',
    type: 'image',
    persona: 'an advanced image editing model with strong instruction following for precise edits',
    buildInput: (prompt, controls, imageUrls) => ({
      prompt,
      image_url: imageUrls?.[0],
      ...(controls.negative_prompt ? { negative_prompt: controls.negative_prompt } : {}),
      ...(controls.guidance_scale ? { guidance_scale: controls.guidance_scale } : {}),
    }),
  },
};

// Get the actual Kie.ai model name, resolving dynamic variants
export function resolveKieModel(modelId: string, controls: Record<string, unknown>): string {
  const route = MODEL_ROUTES[modelId];
  if (!route) return modelId;

  // Handle seedance variant substitution
  if (modelId === 'seedance-1.0') {
    const variant = (controls.variant as string) || 'lite';
    return `bytedance/v1-${variant}-text-to-video`;
  }

  return route.kieModel;
}
