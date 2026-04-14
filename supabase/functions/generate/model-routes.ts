// Model routing configuration for Kie.ai API
// TODO: Fill in actual Kie.ai endpoints when API docs are provided

export interface ModelRoute {
  endpoint: string;
  type: 'sync' | 'async';
  apiModelName: string;
  persona: string;
}

export const MODEL_ROUTES: Record<string, ModelRoute> = {
  // Text-to-Image
  'nano-banana-pro': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'nano-banana/pro',
    persona: 'a photorealistic image model that excels at detailed textures, lighting, and cinematic composition',
  },
  'seedream-4.5': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'seedream/4.5',
    persona: 'an image model with strong aesthetic sensibility, good for portraits and mood-driven scenes',
  },
  'flux-flex': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'flux-2/flex',
    persona: 'a versatile image model good at artistic styles, conceptual art, and stylized renders',
  },
  'flux-flex-pro': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'flux-2/pro',
    persona: 'a high-quality image model with excellent detail and professional output',
  },
  'gpt-4o': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'gpt/4o',
    persona: 'GPT-4o image generation with strong understanding of complex prompts and creative concepts',
  },
  'z-image': {
    endpoint: '/v1/images/generate',
    type: 'sync',
    apiModelName: 'z-image',
    persona: 'a fast image model optimized for quick iterations and experimentation',
  },

  // Text-to-Video
  'veo-3.1': {
    endpoint: '/v1/videos/generate',
    type: 'async',
    apiModelName: 'veo-3.1',
    persona: 'a video generation model that responds well to motion descriptions, camera movements, and scene dynamics',
  },
  'sora-2-pro': {
    endpoint: '/v1/videos/generate',
    type: 'async',
    apiModelName: 'sora/2-pro',
    persona: 'a high-fidelity video model that benefits from precise physical descriptions and temporal flow cues',
  },
  'kling-2.6': {
    endpoint: '/v1/videos/generate',
    type: 'async',
    apiModelName: 'kling/2.6',
    persona: 'an efficient video model with sound support, good for dynamic scenes and character motion',
  },
  'seedance-1.0': {
    endpoint: '/v1/videos/generate',
    type: 'async',
    apiModelName: 'seedance/1.0',
    persona: 'a motion-focused video model great for dance, movement, and fluid animation sequences',
  },
  'grok-imagine': {
    endpoint: '/v1/videos/generate',
    type: 'async',
    apiModelName: 'grok-imagine/text-to-video',
    persona: 'Grok-powered video generation with creative interpretation of prompts',
  },

  // Image-to-Image
  'nano-banana-pro-i2i': {
    endpoint: '/v1/images/edit',
    type: 'sync',
    apiModelName: 'nano-banana-pro',
    persona: 'an image transformation model for high-quality edits preserving original composition',
  },
  'seedream-4.5-edit': {
    endpoint: '/v1/images/edit',
    type: 'sync',
    apiModelName: 'seedream/4.5-edit',
    persona: 'an image editing model with aesthetic sensibility for style transfer and refinement',
  },
  'flux-flex-i2i': {
    endpoint: '/v1/images/edit',
    type: 'sync',
    apiModelName: 'flux-2/flex-image-to-image',
    persona: 'a versatile image-to-image model for artistic transformation and style changes',
  },
  'flux-pro-i2i': {
    endpoint: '/v1/images/edit',
    type: 'sync',
    apiModelName: 'flux-2/pro-image-to-image',
    persona: 'a high-quality image transformation model for professional-grade edits',
  },
  'qwen-image-edit': {
    endpoint: '/v1/images/edit',
    type: 'sync',
    apiModelName: 'qwen/image-edit',
    persona: 'an advanced image editing model with strong instruction following for precise edits',
  },
};
