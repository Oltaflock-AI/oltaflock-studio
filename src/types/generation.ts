// Generation Mode - Phase 1 only supports image
export type GenerationMode = 'image';

// Image Models - Phase 1 only
export type ImageModel = 'nano-banana-pro' | 'seedream-4.5';

// All Models
export type Model = ImageModel;

// Generation Types per Model
export type NanoBananaProGenerationType = 'text-to-image' | 'image-edit';
export type Seedream45GenerationType = 'text-to-image' | 'image-to-image';

export type GenerationType = 
  | NanoBananaProGenerationType 
  | Seedream45GenerationType;

// Model Configurations
export interface ModelConfig {
  id: Model;
  displayName: string;
  mode: GenerationMode;
  generationTypes: GenerationType[];
}

// Aspect Ratio Options
export type AspectRatio = 
  | 'auto' 
  | '1:1' 
  | '16:9' 
  | '9:16' 
  | '4:3' 
  | '2:3';

// Resolution Options
export type ImageResolution = '1K' | '2K' | '4K';
export type Quality = 'basic' | 'high';

// Output Format
export type OutputFormat = 'PNG' | 'JPG';

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

export type ModelControls = 
  | NanoBananaProControls 
  | Seedream45Controls;

// Job Status
export type JobStatus = 'processing' | 'success' | 'failed';

// Generation Request
export interface GenerationRequest {
  mode: GenerationMode;
  model: string;
  generationType: GenerationType;
  rawPrompt: string;
  controls: Record<string, unknown>;
  referenceFiles?: File[];
}

// Generation Response
export interface GenerationResponse {
  jobId: string;
  outputUrl: string;
  refinedPrompt: string;
}

// History Entry
export interface HistoryEntry {
  id: string;
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
  jobId: string;
  status: JobStatus;
  error?: string;
}

// Model Registry - Phase 1 Only
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

export const ALL_MODELS = [...IMAGE_MODELS];

// Generation Type Labels
export const TYPE_LABELS: Record<GenerationType, string> = {
  'text-to-image': 'Text to Image',
  'image-edit': 'Image Edit',
  'image-to-image': 'Image to Image (Edit)',
};
