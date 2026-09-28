import type { ApiKind, Backend, ModelSpec, StudioMode } from './types.ts';
import { IMAGE_SPECS } from './models-image.ts';
import { IMAGE_EDIT_SPECS } from './models-image-edit.ts';
import { VIDEO_SPECS } from './models-video.ts';
import { VIDEO_CLASSIC_SPECS } from './models-video-classic.ts';
import { VIDEO_ADVANCED_SPECS } from './models-video-advanced.ts';
import { HIGGSFIELD_SPECS } from './models-higgsfield.ts';

/** Every model on every backend — use for lookups (history rows, getSpec). */
export const MODEL_CATALOG: ModelSpec[] = [
  ...IMAGE_SPECS, ...IMAGE_EDIT_SPECS, ...VIDEO_SPECS, ...VIDEO_CLASSIC_SPECS, ...VIDEO_ADVANCED_SPECS,
  ...HIGGSFIELD_SPECS,
];

export function specBackend(spec: Pick<ModelSpec, 'backend'>): Backend {
  return spec.backend ?? 'kie';
}

export function catalogFor(backend: Backend): ModelSpec[] {
  return MODEL_CATALOG.filter((m) => specBackend(m) === backend);
}

/** kie.ai models only — the long-standing default catalog. */
export const KIE_CATALOG: ModelSpec[] = catalogFor('kie');

const BY_ID = new Map(MODEL_CATALOG.map((m) => [m.id, m]));

export function getSpec(id: string): ModelSpec | undefined {
  return BY_ID.get(id);
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
  const spec = (id && getSpec(id)) || MODEL_CATALOG.find((m) => m.name === row.model || m.id === row.model);
  return spec?.api ?? 'market';
}
