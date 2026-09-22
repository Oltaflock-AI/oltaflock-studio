// Shared visual identity for each AI model family, used anywhere a model
// needs a quick-glance badge: the Presets grid, the Assistant cheat sheet,
// the model selector, and generation cards.
//
// These are original marks (a color + initials), not the providers'
// real logos — Kling/ByteDance/xAI/Black Forest Labs' actual trademarks
// aren't ours to reproduce.

export interface ModelIdentity {
  label: string;
  initials: string;
  badgeBg: string;
  badgeText: string;
}

// Keyed by "family" — the part of a model id before any -i2i/-i2v suffix,
// so 'kling-3.0' and 'kling-3.0-i2v' share one identity.
export const MODEL_FAMILIES: Record<string, ModelIdentity> = {
  'kling-3.0': { label: 'Kling 3.0', initials: 'K', badgeBg: '#5B3FA6', badgeText: '#F5F5F2' },
  'seedance-2.0': { label: 'Seedance 2.0', initials: 'SD', badgeBg: '#1F8F7A', badgeText: '#F5F5F2' },
  'grok-imagine': { label: 'Grok', initials: 'GK', badgeBg: '#2B2B30', badgeText: '#F5F5F2' },
  'nano-banana-pro': { label: 'Nano Banana Pro', initials: 'NB', badgeBg: '#E8B93A', badgeText: '#141417' },
  'flux-flex-pro': { label: 'Flux Pro', initials: 'FX', badgeBg: '#C1552C', badgeText: '#F5F5F2' },
  'flux-flex': { label: 'Flux Flex', initials: 'FX', badgeBg: '#C1552C', badgeText: '#F5F5F2' },
  'seedream-4.5': { label: 'Seedream 4.5', initials: 'SM', badgeBg: '#4A5FC4', badgeText: '#F5F5F2' },
  'gpt-4o': { label: 'GPT-4o', initials: 'GPT', badgeBg: '#0F7A6C', badgeText: '#F5F5F2' },
  'z-image': { label: 'Z Image', initials: 'Z', badgeBg: '#7A5C2E', badgeText: '#F5F5F2' },
  'qwen-image-edit': { label: 'Qwen', initials: 'QW', badgeBg: '#8B3A62', badgeText: '#F5F5F2' },
};

const FALLBACK: ModelIdentity = { label: 'Model', initials: '?', badgeBg: '#3A3A40', badgeText: '#F5F5F2' };

/** Strips a -i2i/-i2v suffix and looks up that model's shared visual identity. */
export function getModelIdentity(modelId: string): ModelIdentity {
  const family = modelId.replace(/-i2i$|-i2v$/, '');
  return MODEL_FAMILIES[family] ?? FALLBACK;
}
