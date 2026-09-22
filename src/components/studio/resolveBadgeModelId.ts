import { ALL_MODELS } from '@/types/generation';

// Model ids whose family key in MODEL_FAMILIES doesn't follow the plain
// "-i2i / -i2v suffix" rule that getModelIdentity() strips.
const FAMILY_ALIASES: Record<string, string> = {
  'flux-pro-i2i': 'flux-flex-pro',
  'seedream-4.5-edit': 'seedream-4.5',
};

/**
 * Generations store the model's display name (e.g. "Kling 3.0"), while the
 * store and ModelBadge work with model ids. Accepts either and returns an id
 * ModelBadge can resolve to the right family colour.
 */
export function resolveBadgeModelId(model: string): string {
  const config = ALL_MODELS.find((m) => m.id === model || m.displayName === model);
  const id = config?.id ?? model;
  return FAMILY_ALIASES[id] ?? id;
}
