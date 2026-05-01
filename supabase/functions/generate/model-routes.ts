// Kie.ai model routing

export const KIE_BASE_URL = 'https://api.kie.ai/api/v1';
export const KIE_CREATE_TASK = `${KIE_BASE_URL}/jobs/createTask`;
export const KIE_VEO_GENERATE = `${KIE_BASE_URL}/veo/generate`;
export const KIE_GPT4O_GENERATE = `${KIE_BASE_URL}/gpt4o-image/generate`;
export const KIE_TASK_STATUS = `${KIE_BASE_URL}/jobs/recordInfo`;

export interface ModelRoute {
  endpoint: string;         // Which Kie.ai endpoint to call
  kieModel: string | null;  // Model name in payload (null = no model field)
  type: 'image' | 'video';
  persona: string;
  buildPayload: (prompt: string, controls: Record<string, unknown>, callbackUrl: string, imageUrls?: string[]) => Record<string, unknown>;
}

export const MODEL_ROUTES: Record<string, ModelRoute> = {
  // ─── Text-to-Image ──────────────────────────────────
  'nano-banana-pro': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'nano-banana-pro',
    type: 'image',
    persona: 'a photorealistic image model that excels at detailed textures, lighting, and cinematic composition',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'nano-banana-pro',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '1:1',
        resolution: controls.resolution || '1K',
        output_format: 'png',
      },
    }),
  },
  'seedream-4.5': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'seedream/4.5-text-to-image',
    type: 'image',
    persona: 'an image model with strong aesthetic sensibility, good for portraits and mood-driven scenes',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'seedream/4.5-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '1:1',
        quality: controls.quality || 'basic',
      },
    }),
  },
  'flux-flex': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'flux-2/flex-text-to-image',
    type: 'image',
    persona: 'a versatile image model good at artistic styles, conceptual art, and stylized renders',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'flux-2/flex-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '1:1',
        resolution: controls.resolution || '1K',
      },
    }),
  },
  'flux-flex-pro': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'flux-2/pro-text-to-image',
    type: 'image',
    persona: 'a high-quality image model with excellent detail and professional output',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'flux-2/pro-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '1:1',
        resolution: controls.resolution || '1K',
      },
    }),
  },
  'gpt-4o': {
    endpoint: KIE_GPT4O_GENERATE,
    kieModel: null, // GPT-4o uses a different endpoint, no model field
    type: 'image',
    persona: 'GPT-4o image generation with strong understanding of complex prompts and creative concepts',
    buildPayload: (prompt, controls, callbackUrl) => ({
      prompt,
      size: controls.size || '1:1',
      callBackUrl: callbackUrl,
      isEnhance: controls.isEnhance ?? false,
      enableFallback: false,
    }),
  },
  'z-image': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'z-image',
    type: 'image',
    persona: 'a fast image model optimized for quick iterations and experimentation',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'z-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '1:1',
      },
    }),
  },

  // ─── Text-to-Video ──────────────────────────────────
  'veo-3.1': {
    endpoint: KIE_VEO_GENERATE,
    kieModel: null, // Veo uses different endpoint, model in body
    type: 'video',
    persona: 'a video generation model that responds well to motion descriptions, camera movements, and scene dynamics',
    buildPayload: (prompt, controls, callbackUrl) => ({
      prompt,
      model: controls.variant || 'veo3_fast',
      watermark: '',
      callBackUrl: callbackUrl,
      aspect_ratio: controls.aspectRatio || '16:9',
      enableFallback: false,
      enableTranslation: true,
      generationType: 'TEXT_2_VIDEO',
    }),
  },
  'sora-2-pro': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'sora-2-pro-text-to-video',
    type: 'video',
    persona: 'a high-fidelity video model that benefits from precise physical descriptions and temporal flow cues',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'sora-2-pro-text-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || 'landscape',
        n_frames: String(controls.duration || 10),
        size: controls.quality || 'high',
        remove_watermark: controls.removeWatermark ?? true,
      },
    }),
  },
  'kling-2.6': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'kling-2.6/text-to-video',
    type: 'video',
    persona: 'an efficient video model with sound support, good for dynamic scenes and character motion',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'kling-2.6/text-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        sound: controls.sound ?? false,
        aspect_ratio: controls.aspectRatio || '1:1',
        duration: String(controls.duration || 5),
      },
    }),
  },
  'seedance-1.0': {
    endpoint: KIE_CREATE_TASK,
    kieModel: null,
    type: 'video',
    persona: 'a motion-focused video model great for dance, movement, and fluid animation sequences',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: `bytedance/v1-${controls.variant || 'pro'}-text-to-video`,
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '16:9',
        resolution: controls.resolution || '720p',
        duration: String(controls.duration || 5),
        camera_fixed: controls.cameraFixed ?? false,
      },
    }),
  },
  'grok-imagine': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'grok-imagine/text-to-video',
    type: 'video',
    persona: 'Grok-powered video generation with creative interpretation of prompts',
    buildPayload: (prompt, controls, callbackUrl) => ({
      model: 'grok-imagine/text-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        aspect_ratio: controls.aspectRatio || '16:9',
        mode: controls.mode || 'normal',
      },
    }),
  },

  // ─── Image-to-Image ──────────────────────────────────
  'nano-banana-pro-i2i': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'nano-banana-pro',
    type: 'image',
    persona: 'an image transformation model for high-quality edits preserving original composition',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'nano-banana-pro',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        input_image_input: imageUrls || [],
        aspect_ratio: controls.aspect_ratio || '1:1',
        resolution: controls.resolution || '1K',
        output_format: 'png',
      },
    }),
  },
  'seedream-4.5-edit': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'seedream/4.5-edit',
    type: 'image',
    persona: 'an image editing model with aesthetic sensibility for style transfer and refinement',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'seedream/4.5-edit',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        image_urls: imageUrls || [],
        aspect_ratio: controls.aspect_ratio || '1:1',
        quality: controls.quality || 'basic',
      },
    }),
  },
  'flux-flex-i2i': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'flux-2/flex-image-to-image',
    type: 'image',
    persona: 'a versatile image-to-image model for artistic transformation and style changes',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'flux-2/flex-image-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        input_urls: imageUrls || [],
        aspect_ratio: controls.aspect_ratio || '1:1',
        resolution: controls.resolution || '1K',
      },
    }),
  },
  'flux-pro-i2i': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'flux-2/pro-image-to-image',
    type: 'image',
    persona: 'a high-quality image transformation model for professional-grade edits',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'flux-2/pro-image-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        input_urls: imageUrls || [],
        aspect_ratio: controls.aspect_ratio || '1:1',
        resolution: controls.resolution || '1K',
      },
    }),
  },
  'qwen-image-edit': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'qwen/image-edit',
    type: 'image',
    persona: 'an advanced image editing model with strong instruction following for precise edits',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'qwen/image-edit',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        image_url: imageUrls || [],
        acceleration: 'none',
        image_size: 'landscape_4_3',
        num_inference_steps: 25,
        guidance_scale: controls.guidance_scale || 4,
        sync_mode: false,
        enable_safety_checker: true,
        output_format: 'png',
        negative_prompt: controls.negative_prompt || 'blurry, ugly',
      },
    }),
  },

  // ─── Image-to-Video ──────────────────────────────────
  'kling-2.6-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'kling-2.6/image-to-video',
    type: 'video',
    persona: 'Kling 2.6 image-to-video, animates static images with dynamic motion and sound support',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'kling-2.6/image-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        image_urls: imageUrls || [],
        sound: controls.sound ?? false,
        aspect_ratio: controls.aspectRatio || '1:1',
        duration: String(controls.duration || 5),
      },
    }),
  },
  'sora-2-pro-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'sora-2-pro-image-to-video',
    type: 'video',
    persona: 'Sora 2 Pro image-to-video, transforms images into high-fidelity cinematic motion',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'sora-2-pro-image-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        image_url: imageUrls?.[0] || '',
        aspect_ratio: controls.aspectRatio || 'landscape',
        n_frames: String(controls.duration || 10),
        size: controls.quality || 'high',
        remove_watermark: controls.removeWatermark ?? true,
      },
    }),
  },
  'veo-3.1-i2v': {
    endpoint: KIE_VEO_GENERATE,
    kieModel: null,
    type: 'video',
    persona: 'Veo 3.1 image-to-video, animates images with realistic motion and camera dynamics',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      prompt,
      model: controls.variant || 'veo3_fast',
      imageUrls: imageUrls || [],
      callBackUrl: callbackUrl,
      aspect_ratio: controls.aspectRatio || '16:9',
      enableFallback: false,
      enableTranslation: true,
      generationType: 'IMAGE_2_VIDEO',
    }),
  },
  'seedance-1.0-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'bytedance/v1-pro-image-to-video',
    type: 'video',
    persona: 'Seedance 1.0 image-to-video, motion-focused for animating images with fluid movement',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'bytedance/v1-pro-image-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt,
        image_url: imageUrls?.[0] || '',
        aspect_ratio: controls.aspectRatio || '16:9',
        resolution: controls.resolution || '720p',
        duration: String(controls.duration || 5),
        camera_fixed: controls.cameraFixed ?? false,
      },
    }),
  },
};

// No longer needed - buildPayload handles everything per-model
export function resolveKieModel(_model: string, _controls: Record<string, unknown>): string {
  return ''; // unused
}
