import type { ApiKind, ModelSpec, StudioMode } from './types.ts';
import { IMAGE_SPECS } from './models-image.ts';
import { IMAGE_EDIT_SPECS } from './models-image-edit.ts';
import { VIDEO_SPECS } from './models-video.ts';
import { VIDEO_CLASSIC_SPECS } from './models-video-classic.ts';
import { VIDEO_ADVANCED_SPECS } from './models-video-advanced.ts';

export const MODEL_CATALOG: ModelSpec[] = [...IMAGE_SPECS, ...IMAGE_EDIT_SPECS, ...VIDEO_SPECS, ...VIDEO_CLASSIC_SPECS, ...VIDEO_ADVANCED_SPECS];

const BY_ID = new Map(MODEL_CATALOG.map((m) => [m.id, m]));

export function getSpec(id: string): ModelSpec | undefined {
  return BY_ID.get(id);
}

export function specsForMode(mode: StudioMode): ModelSpec[] {
  return MODEL_CATALOG.filter((m) => m.mode === mode);
}

/** First spec of each family (catalog order), for family-level listings. */
export function familyLeads(): ModelSpec[] {
  const seen = new Set<string>();
  return MODEL_CATALOG.filter((m) => (seen.has(m.family) ? false : (seen.add(m.family), true)));
}

/** Which kie.ai API a generation row was created on (older rows only store the display name). */
export function apiForGeneration(row: { model: string; model_params: Record<string, unknown> | null }): ApiKind {
  const id = row.model_params?.model_id as string | undefined;
  const spec = (id && getSpec(id)) || MODEL_CATALOG.find((m) => m.name === row.model || m.id === row.model);
  return spec?.api ?? 'market';
}
