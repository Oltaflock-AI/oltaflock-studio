// Declarative model catalog types — shared by the web app (via the @catalog
// alias) and the Deno edge functions. Keep this file dependency-free.

export type StudioMode =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video';

/** Which kie.ai API family a model lives on — decides endpoints + response parsing. */
export type ApiKind =
  | 'market'   // POST /jobs/createTask  → GET /jobs/recordInfo
  | 'veo'      // POST /veo/generate     → GET /veo/record-info
  | 'veo-extend'
  | 'gpt4o'    // POST /gpt4o-image/generate → GET /gpt4o-image/record-info
  | 'kontext'  // POST /flux/kontext/generate → GET /flux/kontext/record-info
  | 'runway'   // POST /runway/generate  → GET /runway/record-detail
  | 'aleph';   // POST /aleph/generate   → GET /aleph/record-info

export interface FieldOption {
  value: string | number | boolean;
  label?: string;
}

export interface FieldSpec {
  /** Key in the studio controls store. */
  key: string;
  /** Param name in the API input. Defaults to `key`. */
  api?: string;
  label: string;
  type: 'enum' | 'number' | 'boolean' | 'text' | 'textarea' | 'seed';
  options?: FieldOption[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  /** Rendered inside the collapsed "Advanced" section. */
  advanced?: boolean;
  /** Cast the value before sending (some APIs want "5" instead of 5). */
  cast?: 'string' | 'number';
  /** Only show / send when another control has one of these values. */
  when?: { key: string; in: Array<string | number | boolean> };
  /** Don't send when the value equals this (e.g. empty negative prompt). */
  omitIf?: string | number | boolean;
}

export interface MediaSlot {
  key: string;
  /** Param name in the API input. */
  api: string;
  kind: 'image' | 'video' | 'audio';
  label: string;
  min?: number;
  max: number;
  /** API expects a single URL string instead of an array. */
  single?: boolean;
  help?: string;
  when?: { key: string; in: Array<string | number | boolean> };
}

/**
 * Credits per generation (1 credit = 1 kie.ai credit).
 * - `{ credits }` flat price.
 * - `{ by, table }` price looked up by one control value, or several joined
 *   with "|" (e.g. by: ['resolution', 'duration'] → key "720p|5").
 *   `fallback` is used when the key is missing from the table.
 * - Add `perSecond: '<duration control key>'` when table values are per second.
 */
export type Pricing =
  | { credits: number }
  | { by: string | string[]; table: Record<string, number>; fallback?: number; perSecond?: string };

export interface ModelSpec {
  id: string;
  /** Groups variants (t2v / i2v / edit) under one visual identity + brain profile. */
  family: string;
  name: string;
  provider: string;
  mode: StudioMode;
  /** One-line "best use case" shown in the model picker. */
  bestFor: string;
  tags?: string[];
  api: ApiKind;
  /** `model` field for market / variant for other APIs. */
  kieModel?: string;
  output: 'image' | 'video';
  promptRequired?: boolean;
  /** Model takes no prompt at all (upscalers, background removal, lip-sync). */
  noPrompt?: boolean;
  promptMax?: number;
  /** Param name of the prompt in the API input (default "prompt"). */
  promptKey?: string;
  fields: FieldSpec[];
  media: MediaSlot[];
  pricing: Pricing;
  /** Model has native audio generation. */
  audio?: boolean;
  /** Special UI editors rendered in addition to fields. */
  editors?: Array<'kling-multishot' | 'kling-elements'>;
  /** Static params merged into input. */
  fixed?: Record<string, unknown>;
  featured?: boolean;
  isNew?: boolean;
}

export const MODE_LABELS: Record<StudioMode, string> = {
  'text-to-image': 'Text → Image',
  'image-to-image': 'Image Edit',
  'text-to-video': 'Text → Video',
  'image-to-video': 'Image → Video',
  'video-to-video': 'Video → Video',
};
