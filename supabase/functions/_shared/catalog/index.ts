import type { ApiKind, Backend, ModelSpec, StudioMode } from './types.ts';
import { IMAGE_SPECS } from './models-image.ts';
import { IMAGE_EDIT_SPECS } from './models-image-edit.ts';
import { VIDEO_SPECS } from './models-video.ts';
import { VIDEO_CLASSIC_SPECS } from './models-video-classic.ts';
import { VIDEO_ADVANCED_SPECS } from './models-video-advanced.ts';
import { HIGGSFIELD_SPECS } from './models-higgsfield.ts';

/** Every model ever offered, retired ones included, so past generations still resolve (getSpec, history). */
export const ALL_SPECS: ModelSpec[] = [
  ...IMAGE_SPECS, ...IMAGE_EDIT_SPECS, ...VIDEO_SPECS, ...VIDEO_CLASSIC_SPECS, ...VIDEO_ADVANCED_SPECS,
  ...HIGGSFIELD_SPECS,
];

/**
 * Models we no longer offer: superseded versions and clutter. They stay in
 * ALL_SPECS for history, but are hidden from every picker and list and can't
 * start new generations (see activeSpec).
 */
export const RETIRED_MODELS = new Set<string>([
  // Superseded image models
  'nano-banana', 'nano-banana-pro', 'imagen-4-fast', 'gpt-image-1.5', 'gpt-4o', 'seedream-4.0',
  'seedream-3.0', 'flux-kontext', 'grok-imagine-image', 'qwen-image-2.1', 'qwen-image-2', 'qwen-image',
  // Superseded image edit models
  'nano-banana-pro-i2i', 'nano-banana-edit', 'gpt-image-1.5-edit', 'gpt-4o-edit', 'seedream-4-edit',
  'flux-kontext-edit', 'grok-imagine-image-edit', 'qwen-2.1-edit', 'qwen-2-edit', 'qwen-image-edit',
  'qwen-image-remix',
  // Older video models (kie.ai)
  'seedance-1.5-pro', 'seedance-1.5-pro-i2v', 'seedance-1.0-pro', 'seedance-1.0-lite',
  'seedance-1.0-pro-i2v', 'seedance-1.0-pro-fast-i2v', 'seedance-1.0-lite-i2v', 'kling-2.6', 'kling-2.6-i2v',
  'kling-2.5-turbo', 'kling-2.5-turbo-i2v', 'kling-2.1-master', 'kling-2.1-master-i2v', 'kling-2.1-pro-i2v',
  'kling-2.1-standard-i2v', 'kling-2.6-motion', 'hailuo-02-pro', 'hailuo-02-standard', 'hailuo-02-pro-i2v',
  'hailuo-02-standard-i2v', 'wan-2.6', 'wan-2.6-i2v', 'wan-2.6-flash-i2v', 'wan-2.5', 'wan-2.5-i2v',
  'wan-2.2-turbo', 'wan-2.2-turbo-i2v', 'wan-2.6-v2v', 'wan-2.6-flash-v2v', 'happyhorse-1.0',
  'happyhorse-1.0-i2v', 'happyhorse-ref', 'grok-imagine', 'grok-imagine-i2v', 'runway', 'runway-i2v',
  // Older Higgsfield models
  'hf:kling-video/v2.5-turbo/pro/image-to-video', 'hf:kling-video/v2.5-turbo/pro/text-to-video',
  'hf:kling-video/v2.5-turbo/standard/image-to-video', 'hf:kling-video/motion-control/pro',
  'hf:kling-video/motion-control/std', 'hf:kling-video/v2.6/pro/image-to-video',
  'hf:kling-video/v2.6/pro/text-to-video', 'hf:kling-video/omni/first-last-frame',
  'hf:kling-video/omni/image-reference', 'hf:kling-video/omni/video-edit',
  'hf:kling-video/omni/video-reference', 'hf:alibaba/happy-horse/image-to-video',
  'hf:alibaba/happy-horse/reference-to-video', 'hf:alibaba/happy-horse/text-to-video',
  'hf:wan/v2.6/image-to-video', 'hf:wan/v2.6/reference-to-video', 'hf:wan/v2.6/text-to-video',
  'hf:marketing-studio/image', 'hf:marketing-studio/image:edit',
]);

/** Every model on offer, on every backend. Use for pickers and lists; getSpec for lookups. */
export const MODEL_CATALOG: ModelSpec[] = ALL_SPECS.filter((m) => !RETIRED_MODELS.has(m.id));

export function specBackend(spec: Pick<ModelSpec, 'backend'>): Backend {
  return spec.backend ?? 'kie';
}

export function catalogFor(backend: Backend): ModelSpec[] {
  return MODEL_CATALOG.filter((m) => specBackend(m) === backend);
}

/** kie.ai models only — the long-standing default catalog. */
export const KIE_CATALOG: ModelSpec[] = catalogFor('kie');

const BY_ID = new Map(ALL_SPECS.map((m) => [m.id, m]));

/** Any model, retired or not. Use for reading past generations. */
export function getSpec(id: string): ModelSpec | undefined {
  return BY_ID.get(id);
}

/** A model that can still be used for a new generation (not retired). */
export function activeSpec(id: string): ModelSpec | undefined {
  return RETIRED_MODELS.has(id) ? undefined : BY_ID.get(id);
}

export function specsForMode(mode: StudioMode, backend: Backend = 'kie'): ModelSpec[] {
  return MODEL_CATALOG.filter((m) => m.mode === mode && specBackend(m) === backend);
}

/** First spec of each family (catalog order, so kie first), for family-level listings. */
export function familyLeads(backend?: Backend): ModelSpec[] {
  const seen = new Set<string>();
  const pool = backend ? catalogFor(backend) : MODEL_CATALOG;
  return pool.filter((m) => (seen.has(m.family) ? false : (seen.add(m.family), true)));
}

/** Which kie.ai API a generation row was created on (older rows only store the display name). */
export function apiForGeneration(row: { model: string; model_params: Record<string, unknown> | null }): ApiKind {
  const id = row.model_params?.model_id as string | undefined;
  const spec = (id && getSpec(id)) || ALL_SPECS.find((m) => m.name === row.model || m.id === row.model);
  return spec?.api ?? 'market';
}
