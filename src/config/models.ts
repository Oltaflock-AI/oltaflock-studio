// Shared visual identity for each AI model family, used anywhere a model
// needs a quick-glance badge: the Presets grid, the Assistant cheat sheet,
// the model picker, and generation cards.
//
// These are original marks (a color + initials), not the providers'
// real logos — the providers' actual trademarks aren't ours to reproduce.

import { MODEL_CATALOG, familyLeads } from '@catalog/index.ts';
import { ALL_MODELS } from '@/types/generation';

export interface ModelIdentity {
  label: string;
  initials: string;
  badgeBg: string;
  badgeText: string;
}

const LIGHT = '#F5F5F2';
const DARK = '#141417';

/** Hand-picked colors per family; anything missing gets a stable hashed hue. */
const FAMILY_COLORS: Record<string, { bg: string; text?: string; initials?: string }> = {
  kling: { bg: '#5B3FA6', initials: 'K' },
  seedance: { bg: '#1F8F7A', initials: 'SD' },
  seedream: { bg: '#4A5FC4', initials: 'SM' },
  grok: { bg: '#2B2B30', initials: 'GK' },
  'nano-banana': { bg: '#E8B93A', text: DARK, initials: 'NB' },
  flux: { bg: '#C1552C', initials: 'FX' },
  gpt: { bg: '#0F7A6C', initials: 'GPT' },
  'z-image': { bg: '#7A5C2E', initials: 'Z' },
  qwen: { bg: '#8B3A62', initials: 'QW' },
  veo: { bg: '#1A73E8', initials: 'VEO' },
  sora: { bg: '#111111', initials: 'SO' },
  wan: { bg: '#6E3BD8', initials: 'WN' },
  hailuo: { bg: '#E0457B', initials: 'HL' },
  runway: { bg: '#3A3A3A', initials: 'RW' },
  imagen: { bg: '#34A853', initials: 'IM' },
  ideogram: { bg: '#2F2F8F', initials: 'ID' },
  topaz: { bg: '#0B5CAD', initials: 'TP' },
  recraft: { bg: '#E24C2B', initials: 'RC' },
  infinitalk: { bg: '#B24BD1', initials: 'IT' },
  'gemini-omni': { bg: '#4285F4', initials: 'GO' },
  happyhorse: { bg: '#D9822B', initials: 'HH' },
  pixverse: { bg: '#7B2FF7', initials: 'PV' },
  omnihuman: { bg: '#0E9F8E', initials: 'OH' },
  volcengine: { bg: '#E0301E', initials: 'VL' },
  aleph: { bg: '#3A3A3A', initials: 'AL' },
  'flux-kontext': { bg: '#A8441F', initials: 'FK' },
  'wan-image': { bg: '#6E3BD8', initials: 'WN' },
};

function hashHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function familyColor(family: string) {
  if (FAMILY_COLORS[family]) return FAMILY_COLORS[family];
  const key = Object.keys(FAMILY_COLORS)
    .filter((k) => family.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? FAMILY_COLORS[key] : undefined;
}

function familyLabel(family: string): string {
  const lead = familyLeads().find((s) => s.family === family);
  return lead ? lead.name.replace(/\s+(Edit|Image to Video|Text to Video|I2V|T2V)$/i, '') : family;
}

function buildIdentity(family: string): ModelIdentity {
  const label = familyLabel(family);
  const c = familyColor(family);
  const initials =
    c?.initials ?? label.split(/[\s-]+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return {
    label,
    initials,
    badgeBg: c?.bg ?? `hsl(${hashHue(family)} 45% 38%)`,
    badgeText: c?.text ?? LIGHT,
  };
}

export const MODEL_FAMILIES: Record<string, ModelIdentity> = Object.fromEntries(
  [...new Set(MODEL_CATALOG.map((m) => m.family))].map((f) => [f, buildIdentity(f)]),
);

const FALLBACK: ModelIdentity = { label: 'Model', initials: '?', badgeBg: '#3A3A40', badgeText: LIGHT };

/**
 * Looks up a model's shared visual identity. Accepts a model id
 * ('kling-3.0-i2v') or the display name that generation rows store
 * ('Kling 3.0'), since both appear in real data.
 */
export function getModelIdentity(model: string): ModelIdentity {
  const id = ALL_MODELS.find((m) => m.id === model || m.displayName === model)?.id ?? model;
  const spec = MODEL_CATALOG.find((m) => m.id === id);
  if (spec) return MODEL_FAMILIES[spec.family] ?? FALLBACK;
  return MODEL_FAMILIES[id] ?? FALLBACK;
}
