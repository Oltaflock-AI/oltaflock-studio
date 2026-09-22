import { getModelIdentity } from '@/config/models';

/** Display name for a model id: the shared family label, or the raw id for unknown models. */
export function modelDisplayName(modelId: string): string {
  const identity = getModelIdentity(modelId);
  return identity.initials === '?' ? modelId : identity.label;
}
