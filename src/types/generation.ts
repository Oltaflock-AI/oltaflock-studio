import { MODEL_CATALOG } from '@catalog/index.ts';
import type { StudioMode } from '@catalog/types.ts';

// Store-level mode. 'image'/'video' are the text-to-* modes (legacy names kept
// because they're persisted in presets and library items).
export type GenerationMode = 'image' | 'video' | 'image-to-image' | 'image-to-video' | 'video-to-video';

// Model ids come from the shared catalog (supabase/functions/_shared/catalog).
export type Model = string;
export type ImageModel = Model;
export type VideoModel = Model;
export type ImageToImageModel = Model;
export type ImageToVideoModel = Model;

export type GenerationType = 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video' | 'video-to-video';

export function toStudioMode(mode: GenerationMode): StudioMode {
  if (mode === 'image') return 'text-to-image';
  if (mode === 'video') return 'text-to-video';
  return mode;
}

export function fromStudioMode(mode: StudioMode): GenerationMode {
  if (mode === 'text-to-image') return 'image';
  if (mode === 'text-to-video') return 'video';
  return mode;
}

export const MODEL_API_NAMES: Record<string, string> = Object.fromEntries(
  MODEL_CATALOG.map((m) => [m.id, m.kieModel ?? m.api]),
);

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

// Model registry, derived from the catalog.
const toConfig = (m: (typeof MODEL_CATALOG)[number]): ModelConfig => ({
  id: m.id,
  displayName: m.name,
  mode: fromStudioMode(m.mode),
  generationTypes: [m.mode],
});

export const ALL_MODELS: ModelConfig[] = MODEL_CATALOG.map(toConfig);
export const IMAGE_MODELS = ALL_MODELS.filter((m) => m.mode === 'image');
export const VIDEO_MODELS = ALL_MODELS.filter((m) => m.mode === 'video');
export const IMAGE_TO_IMAGE_MODELS = ALL_MODELS.filter((m) => m.mode === 'image-to-image');
export const IMAGE_TO_VIDEO_MODELS = ALL_MODELS.filter((m) => m.mode === 'image-to-video');
export const VIDEO_TO_VIDEO_MODELS = ALL_MODELS.filter((m) => m.mode === 'video-to-video');

/** Resolves a generation row's model: prefers the stored id, falls back to display name. */
export function findModelConfig(model: string, modelParams?: Record<string, unknown> | null, type?: GenerationType) {
  const id = modelParams?.model_id as string | undefined;
  return (
    (id && ALL_MODELS.find((m) => m.id === id)) ||
    ALL_MODELS.find((m) => m.id === model) ||
    (type && ALL_MODELS.find((m) => m.displayName === model && m.generationTypes.includes(type))) ||
    ALL_MODELS.find((m) => m.displayName === model)
  );
}

// Generation Type Labels
export const TYPE_LABELS: Record<GenerationType, string> = {
  'text-to-image': 'Text to Image',
  'text-to-video': 'Text to Video',
  'image-to-image': 'Image to Image',
  'image-to-video': 'Image to Video',
  'video-to-video': 'Video Edit',
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
