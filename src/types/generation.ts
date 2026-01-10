// Generation Mode
export type GenerationMode = 'image' | 'video';

// Image Models
export type ImageModel = 'nano-banana-pro' | 'seedream-4.5';

// Video Models
export type VideoModel = 'veo-3' | 'veo-3.1' | 'sora-2-pro' | 'kling-2.6' | 'seedance-1.0';

// All Models
export type Model = ImageModel | VideoModel;

// Generation Types per Model
export type NanoBananaProGenerationType = 'text-to-image' | 'image-edit';
export type Seedream45GenerationType = 'text-to-image' | 'image-to-image';
export type Veo3GenerationType = 'text-to-video' | 'image-to-video' | 'reference-to-video';
export type Veo31GenerationType = 'text-to-video' | 'image-to-video' | 'reference-to-video';
export type Sora2ProGenerationType = 'text-to-video' | 'image-to-video' | 'storyboard';
export type Kling26GenerationType = 'text-to-video' | 'image-to-video';
export type Seedance10GenerationType = 'text-to-video' | 'image-to-video';

export type GenerationType = 
  | NanoBananaProGenerationType 
  | Seedream45GenerationType
  | Veo3GenerationType
  | Veo31GenerationType
  | Sora2ProGenerationType
  | Kling26GenerationType
  | Seedance10GenerationType;

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
  | '2:3'
  | 'portrait'
  | 'landscape';

// Resolution Options
export type ImageResolution = '1K' | '2K' | '4K';
export type VideoResolution = '480p' | '720p' | '1080p';
export type Quality = 'basic' | 'high' | 'standard';

// Output Format
export type OutputFormat = 'PNG' | 'JPG';

// Duration Options
export type VideoDuration = 5 | 10 | 15;

// Model-specific Controls
export interface NanoBananaProControls {
  aspectRatio: 'auto' | '1:1' | '16:9' | '9:16';
  resolution: ImageResolution;
  outputFormat: OutputFormat;
}

export interface Seedream45Controls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '2:3';
  quality: 'basic' | 'high';
}

export interface Veo3Controls {
  variant: 'fast' | 'quality';
  aspectRatio: 'auto' | '16:9' | '9:16';
  seed?: number;
}

export interface Veo31Controls {
  variant: 'fast' | 'quality';
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
  variant: 'lite' | 'pro' | 'pro-fast';
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: VideoResolution;
  duration: 5 | 10;
  cameraFixed: boolean;
  seed: number;
}

export type ModelControls = 
  | NanoBananaProControls 
  | Seedream45Controls
  | Veo3Controls
  | Veo31Controls
  | Sora2ProControls
  | Kling26Controls
  | Seedance10Controls;

// Job Status - Extended for proper lifecycle
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'deleted';

// Generation Request
export interface GenerationRequest {
  job_id: string;
  mode: GenerationMode;
  model: string;
  generation_type: GenerationType;
  raw_prompt: string;
  controls: Record<string, unknown>;
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
  deleted: boolean; // Soft delete flag
}

// Legacy alias for backward compatibility
export type HistoryEntry = JobEntry;

// Model Registry
export const IMAGE_MODELS: ModelConfig[] = [
  {
    id: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    mode: 'image',
    generationTypes: ['text-to-image', 'image-edit'],
  },
  {
    id: 'seedream-4.5',
    displayName: 'Seedream 4.5',
    mode: 'image',
    generationTypes: ['text-to-image', 'image-to-image'],
  },
];

export const VIDEO_MODELS: ModelConfig[] = [
  {
    id: 'veo-3',
    displayName: 'Veo 3',
    mode: 'video',
    generationTypes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    variants: ['Veo 3 Fast', 'Veo 3 Quality'],
  },
  {
    id: 'veo-3.1',
    displayName: 'Veo 3.1',
    mode: 'video',
    generationTypes: ['text-to-video', 'image-to-video', 'reference-to-video'],
    variants: ['Veo 3.1 Fast', 'Veo 3.1 Quality'],
  },
  {
    id: 'sora-2-pro',
    displayName: 'Sora 2 Pro',
    mode: 'video',
    generationTypes: ['text-to-video', 'image-to-video', 'storyboard'],
  },
  {
    id: 'kling-2.6',
    displayName: 'Kling 2.6',
    mode: 'video',
    generationTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'seedance-1.0',
    displayName: 'Seedance 1.0',
    mode: 'video',
    generationTypes: ['text-to-video', 'image-to-video'],
    variants: ['V1 Lite', 'V1 Pro', 'V1 Pro Fast'],
  },
];

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS];

// Generation Type Labels
export const TYPE_LABELS: Record<GenerationType, string> = {
  'text-to-image': 'Text to Image',
  'image-edit': 'Image Edit',
  'image-to-image': 'Image to Image (Edit)',
  'text-to-video': 'Text to Video',
  'image-to-video': 'Image to Video',
  'reference-to-video': 'Reference to Video',
  'storyboard': 'Storyboard',
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
