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

  // ─── Text-to-Video (3 models) ──────────────────────
  'kling-3.0': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'kling-3.0/video',
    type: 'video',
    persona: 'Kling 3.0 with multi-shot capabilities, element references, and 4K output support',
    buildPayload: (prompt, controls, callbackUrl) => {
      const multiShots = (controls.multi_shots as boolean) || false;
      const multiPrompt = (controls.multi_prompt as Array<{ prompt: string; duration: number }>) || [];
      const klingElements = (controls.kling_elements as Array<{
        name: string;
        description: string;
        element_input_urls: string[];
      }>) || [];

      const input: Record<string, unknown> = {
        sound: controls.sound ?? false,
        aspect_ratio: controls.aspectRatio || '16:9',
        duration: String(controls.duration || 5),
        mode: (controls.variant as string) || 'std',
      };

      if (multiShots && multiPrompt.length > 0) {
        input.multi_shots = true;
        input.multi_prompt = multiPrompt
          .filter(s => s && s.prompt && s.prompt.trim().length > 0)
          .slice(0, 5)
          .map(s => ({ prompt: s.prompt, duration: Number(s.duration) || 3 }));
      } else {
        input.prompt = prompt;
      }

      if (klingElements.length > 0) {
        input.kling_elements = klingElements
          .filter(el => el.name && el.element_input_urls && el.element_input_urls.length >= 2)
          .slice(0, 3)
          .map(el => ({
            name: el.name,
            description: el.description || '',
            element_input_urls: el.element_input_urls.slice(0, 4),
          }));
      }

      return {
        model: 'kling-3.0/video',
        callBackUrl: callbackUrl,
        input,
      };
    },
  },
  'seedance-2.0': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'bytedance/seedance-2',
    type: 'video',
    persona: 'Seedance 2.0 latest gen with audio support, 1080p output, and adaptive aspect ratios',
    buildPayload: (prompt, controls, callbackUrl) => {
      const input: Record<string, unknown> = {
        prompt,
        aspect_ratio: controls.aspectRatio || '16:9',
        resolution: controls.resolution || '720p',
        duration: Number(controls.duration) || 5,
        generate_audio: controls.generate_audio !== false,
      };
      if (controls.web_search === true) input.web_search = true;
      if (controls.nsfw_checker === true) input.nsfw_checker = true;
      return {
        model: 'bytedance/seedance-2',
        callBackUrl: callbackUrl,
        input,
      };
    },
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
    'kling-3.0-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'kling-3.0/video',
    type: 'video',
    persona: 'Kling 3.0 image-to-video, animates images with multi-shot capabilities and 4K output',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => {
      const multiShots = (controls.multi_shots as boolean) || false;
      const multiPrompt = (controls.multi_prompt as Array<{ prompt: string; duration: number }>) || [];
      const klingElements = (controls.kling_elements as Array<{
        name: string;
        description: string;
        element_input_urls: string[];
      }>) || [];

      const input: Record<string, unknown> = {
        sound: controls.sound ?? false,
        duration: String(controls.duration || 5),
        mode: (controls.variant as string) || 'std',
      };
      // For i2v: start frame from imageUrls[0]; end frame from controls.last_frame_url (single-shot only)
      const startFrame = imageUrls?.[0];
      const endFrame = (controls.last_frame_url as string) || '';
      if (multiShots) {
        input.image_urls = startFrame ? [startFrame] : [];
      } else {
        input.image_urls = [startFrame, endFrame].filter(Boolean);
      }

      if (multiShots && multiPrompt.length > 0) {
        input.multi_shots = true;
        input.multi_prompt = multiPrompt
          .filter(s => s && s.prompt && s.prompt.trim().length > 0)
          .slice(0, 5)
          .map(s => ({ prompt: s.prompt, duration: Number(s.duration) || 3 }));
      } else {
        input.prompt = prompt;
        input.aspect_ratio = controls.aspectRatio || '16:9';
      }

      if (klingElements.length > 0) {
        input.kling_elements = klingElements
          .filter(el => el.name && el.element_input_urls && el.element_input_urls.length >= 2)
          .slice(0, 3)
          .map(el => ({
            name: el.name,
            description: el.description || '',
            element_input_urls: el.element_input_urls.slice(0, 4),
          }));
      }

      return {
        model: 'kling-3.0/video',
        callBackUrl: callbackUrl,
        input,
      };
    },
  },
  'grok-imagine-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'grok-imagine/image-to-video',
    type: 'video',
    persona: 'Grok image-to-video, animates images with motion modes (fun/normal/spicy)',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => ({
      model: 'grok-imagine/image-to-video',
      callBackUrl: callbackUrl,
      input: {
        prompt: prompt || '',
        image_urls: (imageUrls || []).slice(0, 7),
        mode: (controls.mode as string) || 'normal',
        duration: String(controls.duration || 6),
        resolution: (controls.resolution as string) || '480p',
        aspect_ratio: (controls.aspectRatio as string) || '16:9',
      },
    }),
  },
  'seedance-2.0-i2v': {
    endpoint: KIE_CREATE_TASK,
    kieModel: 'bytedance/seedance-2',
    type: 'video',
    persona: 'Seedance 2.0 image-to-video, latest gen with audio + 1080p output, supports first/last frame and multi-modal refs',
    buildPayload: (prompt, controls, callbackUrl, imageUrls) => {
      const input: Record<string, unknown> = {
        prompt,
        aspect_ratio: controls.aspectRatio || '16:9',
        resolution: controls.resolution || '720p',
        duration: Number(controls.duration) || 5,
        generate_audio: controls.generate_audio !== false,
      };

      // First frame from uploaded image
      if (imageUrls && imageUrls[0]) {
        input.first_frame_url = imageUrls[0];
      }

      // Last frame from explicit control upload
      const lastFrame = (controls.last_frame_url as string) || '';
      if (lastFrame) input.last_frame_url = lastFrame;

      // Reference images from explicit control upload
      const refImages = ((controls.reference_image_urls as string[]) || []).slice(0, 9);
      if (refImages.length > 0) input.reference_image_urls = refImages;

      const refVideos = (controls.reference_video_urls as string[]) || [];
      if (refVideos.length > 0) input.reference_video_urls = refVideos.slice(0, 3);

      const refAudios = (controls.reference_audio_urls as string[]) || [];
      if (refAudios.length > 0) input.reference_audio_urls = refAudios.slice(0, 3);

      if (controls.web_search === true) input.web_search = true;
      if (controls.nsfw_checker === true) input.nsfw_checker = true;

      return {
        model: 'bytedance/seedance-2',
        callBackUrl: callbackUrl,
        input,
      };
    },
  },
};

// No longer needed - buildPayload handles everything per-model
export function resolveKieModel(_model: string, _controls: Record<string, unknown>): string {
  return ''; // unused
}
