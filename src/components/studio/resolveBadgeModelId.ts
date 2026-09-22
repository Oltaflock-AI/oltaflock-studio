/**
 * ModelBadge now resolves display names and id aliases itself (see
 * getModelIdentity in src/config/models.ts), so this is a pass-through kept
 * for existing call sites.
 */
export function resolveBadgeModelId(model: string): string {
  return model;
}
