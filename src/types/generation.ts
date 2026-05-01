// Generation Mode - includes 'image-to-image' and 'image-to-video'
export type GenerationMode = 'image' | 'video' | 'image-to-image' | 'image-to-video';

// Image Models - Split Flux into Flex and Flex Pro
export type ImageModel = 'nano-banana-pro' | 'seedream-4.5' | 'flux-flex' | 'flux-flex-pro' | 'gpt-4o' | 'z-image';

// Video Models (Veo 3 removed, only Veo 3.1)
export type VideoModel = 'veo-3.1' | 'sora-2-pro' | 'kling-2.6' | 'seedance-1.0' | 'grok-imagine';

// Image to Image Models
export type ImageToImageModel = 'nano-banana-pro-i2i' | 'seedream-4.5-edit' | 'flux-flex-i2i' | 'flux-pro-i2i' | 'qwen-image-edit';

// Image to Video Models
export type ImageToVideoModel = 'kling-2.6-i2v' | 'sora-2-pro-i2v' | 'veo-3.1-i2v' | 'seedance-1.0-i2v';

// All Models
export type Model = ImageModel | VideoModel | ImageToImageModel | ImageToVideoModel;

// Generation Types - now includes image-to-video
export type GenerationType = 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';

// Model API name mapping for webhook payload
export const MODEL_API_NAMES: Record<Model, string> = {
  // Text-to-Image models
  'nano-banana-pro': 'nano-banana/pro',
  'seedream-4.5': 'seedream/4.5',
  'flux-flex': 'flux-2/flex',
  'flux-flex-pro': 'flux-2/pro',
  'gpt-4o': 'gpt/4o',
  'z-image': 'z-image',
  // Text-to-Video models
  'veo-3.1': 'veo-3.1',
  'sora-2-pro': 'sora/2-pro',
  'kling-2.6': 'kling/2.6',
  'seedance-1.0': 'seedance/1.0',
  'grok-imagine': 'grok-imagine/text-to-video',
  // Image-to-Image models
  'nano-banana-pro-i2i': 'nano-banana-pro',
  'seedream-4.5-edit': 'seedream/4.5-edit',
  'flux-flex-i2i': 'flux-2/flex-image-to-image',
  'flux-pro-i2i': 'flux-2/pro-image-to-image',
  'qwen-image-edit': 'qwen/image-edit',
  // Image-to-Video models
  'kling-2.6-i2v': 'kling-2.6/image-to-video',
  'sora-2-pro-i2v': 'sora-2-pro-image-to-video',
  'veo-3.1-i2v': 'veo-3.1-i2v',
  'seedance-1.0-i2v': 'bytedance/v1-pro-image-to-video',
};

// Model Configurations
export interface ModelConfig {
  id: Model;
  displayName: string;
  mode: GenerationMode;
  generationTypes: GenerationType[];
  variants?: string[];
}

// Aspect Ratio Options
export type AspectRatio = 
  | 'auto' 
  | '1:1' 
  | '16:9' 
  | '9:16' 
  | '4:3' 
  | '3:4'
  | '2:3'
  | '3:2'
  | '21:9'
  | '4:5'
  | '5:4'
  | 'portrait'
  | 'landscape';

// Resolution Options
export type ImageResolution = '1K' | '2K' | '4K';
export type VideoResolution = '480p' | '720p' | '1080p';
export type Quality = 'basic' | 'high' | 'standard';

// Output Format
export type OutputFormat = 'PNG' | 'JPG' | 'png' | 'jpg';

// Duration Options
export type VideoDuration = 5 | 10 | 15;

// Model-specific Controls - Text-to-Image
export interface NanoBananaProControls {
  aspectRatio: 'auto' | '1:1' | '16:9' | '9:16';
  resolution: ImageResolution;
  outputFormat: OutputFormat;
}

export interface Seedream45Controls {
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9';
  quality: 'basic' | 'high';
}

// Flux Flex Controls - requires aspect ratio and resolution
export interface FluxFlexControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}

// Flux Flex Pro Controls - requires aspect ratio and resolution
export interface FluxFlexProControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}

export interface GPT4oControls {
  size: '1:1' | '3:2' | '2:3';
  isEnhance: boolean;
}

export interface ZImageControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

// Veo 3.1 Controls - uses veo3_fast and veo3_quality variants
export interface Veo31Controls {
  variant: 'veo3_fast' | 'veo3_quality';
  aspectRatio: 'auto' | '16:9' | '9:16';
  seed?: number;
}

export interface Sora2ProControls {
  aspectRatio: 'portrait' | 'landscape';
  duration: 10 | 15;
  quality: 'standard' | 'high';
  removeWatermark: boolean;
  characterIds?: string[];
}

export interface Kling26Controls {
  aspectRatio: '1:1' | '16:9' | '9:16';
  duration: 5 | 10;
  sound: boolean;
}

export interface Seedance10Controls {
  variant: 'lite' | 'pro';
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: VideoResolution;
  duration: 5 | 10;
  cameraFixed: boolean;
  seed: number;
}

export interface GrokImagineControls {
  aspectRatio: '2:3' | '3:2' | '1:1' | '9:16' | '16:9';
  mode: 'fun' | 'normal' | 'spicy';
}

// Image-to-Image Model Controls
export interface NanoBananaProI2IControls {
  aspect_ratio: 'Auto' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  resolution: '1K' | '2K' | '4K';
  output_format: 'PNG' | 'JPG';
}

export interface Seedream45EditControls {
  aspect_ratio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9';
  quality: 'basic' | 'high';
}

export interface FluxFlexI2IControls {
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}

export interface FluxProI2IControls {
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}

export interface QwenImageEditControls {
  acceleration?: string;
  image_size?: string;
  num_inference_steps?: number;
  seed?: number;
  guidance_scale?: number;
  sync_mode?: boolean;
  enable_safety_checker?: boolean;
  output_format?: 'png' | 'jpg';
  negative_prompt?: string;
}

export type ModelControls = 
  | NanoBananaProControls 
  | Seedream45Controls
  | FluxFlexControls
  | FluxFlexProControls
  | GPT4oControls
  | ZImageControls
  | Veo31Controls
  | Sora2ProControls
  | Kling26Controls
  | Seedance10Controls
  | GrokImagineControls
  | NanoBananaProI2IControls
  | Seedream45EditControls
  | FluxFlexI2IControls
  | FluxProI2IControls
  | QwenImageEditControls;

// Job Status - Extended for proper lifecycle (legacy)
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'deleted';

// Generation Status - matches generations table
export type GenerationStatus = 'queued' | 'running' | 'done' | 'error';

// Map generation status to display status
export const mapGenerationStatus = (status: GenerationStatus): JobStatus => {
  switch (status) {
    case 'queued': return 'queued';
    case 'running': return 'processing';
    case 'done': return 'completed';
    case 'error': return 'failed';
  }
};

// Generation Request
export interface GenerationRequest {
  job_id: string;
  mode: GenerationMode;
  model: string;
  generation_type: GenerationType;
  raw_prompt: string;
  controls: Record<string, unknown>;
  image_urls?: string[];
}

// Generation Response from webhook
export interface GenerationResponse {
  job_id: string;
  status: 'success' | 'failed';
  output_url?: string;
  refined_prompt?: string;
  error?: string;
}

// Job Entry (formerly HistoryEntry)
export interface JobEntry {
  id: string; // Internal frontend ID
  jobId: string; // Job ID sent to backend (job_<timestamp>_<random>)
  timestamp: Date;
  mode: GenerationMode;
  model: string;
  modelId: Model;
  generationType: GenerationType;
  rawPrompt: string;
  refinedPrompt: string;
  outputUrl: string;
  controls: Record<string, unknown>;
  rating?: 1 | 2 | 3 | 4 | 5;
  status: JobStatus;
  error?: string;
  referenceFiles?: string[]; // Store file names for display
  imageUrls?: string[]; // Public URLs of uploaded images for Image → Image
  deleted: boolean; // Soft delete flag
}

// Legacy alias for backward compatibility
export type HistoryEntry = JobEntry;

// Model Registry - Text-to-Image
export const IMAGE_MODELS: ModelConfig[] = [
  {
    id: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
  {
    id: 'seedream-4.5',
    displayName: 'Seedream 4.5',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
  {
    id: 'flux-flex',
    displayName: 'Flux Flex',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
  {
    id: 'flux-flex-pro',
    displayName: 'Flux Flex Pro',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o Image',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
  {
    id: 'z-image',
    displayName: 'Z Image',
    mode: 'image',
    generationTypes: ['text-to-image'],
  },
];

// Video Models - Only Veo 3.1 (no Veo 3)
export const VIDEO_MODELS: ModelConfig[] = [
  {
    id: 'veo-3.1',
    displayName: 'Veo 3.1',
    mode: 'video',
    generationTypes: ['text-to-video'],
    variants: ['Veo 3.1 Fast', 'Veo 3.1 Quality'],
  },
  {
    id: 'sora-2-pro',
    displayName: 'Sora 2 Pro',
    mode: 'video',
    generationTypes: ['text-to-video'],
  },
  {
    id: 'kling-2.6',
    displayName: 'Kling 2.6',
    mode: 'video',
    generationTypes: ['text-to-video'],
  },
  {
    id: 'seedance-1.0',
    displayName: 'Seedance 1.0',
    mode: 'video',
    generationTypes: ['text-to-video'],
    variants: ['V1 Lite Text-to-Video', 'V1 Pro Text-to-Video'],
  },
  {
    id: 'grok-imagine',
    displayName: 'Grok Imagine',
    mode: 'video',
    generationTypes: ['text-to-video'],
  },
];

// Image-to-Image Models
export const IMAGE_TO_IMAGE_MODELS: ModelConfig[] = [
  {
    id: 'nano-banana-pro-i2i',
    displayName: 'Nano Banana Pro',
    mode: 'image-to-image',
    generationTypes: ['image-to-image'],
  },
  {
    id: 'seedream-4.5-edit',
    displayName: 'Seedream 4.5 Edit',
    mode: 'image-to-image',
    generationTypes: ['image-to-image'],
  },
  {
    id: 'flux-flex-i2i',
    displayName: 'Flux Flex',
    mode: 'image-to-image',
    generationTypes: ['image-to-image'],
  },
  {
    id: 'flux-pro-i2i',
    displayName: 'Flux Pro',
    mode: 'image-to-image',
    generationTypes: ['image-to-image'],
  },
  {
    id: 'qwen-image-edit',
    displayName: 'Qwen Image Edit',
    mode: 'image-to-image',
    generationTypes: ['image-to-image'],
  },
];

// Image-to-Video Models
export const IMAGE_TO_VIDEO_MODELS: ModelConfig[] = [
  {
    id: 'kling-2.6-i2v',
    displayName: 'Kling 2.6',
    mode: 'image-to-video',
    generationTypes: ['image-to-video'],
  },
  {
    id: 'sora-2-pro-i2v',
    displayName: 'Sora 2 Pro',
    mode: 'image-to-video',
    generationTypes: ['image-to-video'],
  },
  {
    id: 'veo-3.1-i2v',
    displayName: 'Veo 3.1',
    mode: 'image-to-video',
    generationTypes: ['image-to-video'],
    variants: ['veo3_fast', 'veo3_quality'],
  },
  {
    id: 'seedance-1.0-i2v',
    displayName: 'Seedance 1.0',
    mode: 'image-to-video',
    generationTypes: ['image-to-video'],
  },
];

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS, ...IMAGE_TO_IMAGE_MODELS, ...IMAGE_TO_VIDEO_MODELS];

// Generation Type Labels
export const TYPE_LABELS: Record<GenerationType, string> = {
  'text-to-image': 'Text to Image',
  'text-to-video': 'Text to Video',
  'image-to-image': 'Image to Image',
  'image-to-video': 'Image to Video',
};

// Status Labels
export const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  deleted: 'Deleted',
};

// Generate unique job ID
export function generateJobId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `job_${timestamp}_${random}`;
}
