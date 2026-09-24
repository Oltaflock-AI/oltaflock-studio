import type { ModelSpec } from './types.ts';
import { fieldValue } from './adapters.ts';

/** Credits for one generation with the given controls. */
export function specCredits(spec: ModelSpec, controls: Record<string, unknown>): number {
  const p = spec.pricing;
  if ('credits' in p) return p.credits;

  const read = (key: string) => {
    const field = spec.fields.find((f) => f.key === key);
    return String(field ? fieldValue(field, controls) : controls[key]);
  };

  const key = (Array.isArray(p.by) ? p.by : [p.by]).map(read).join('|');
  const unit = p.table[key] ?? p.fallback ?? Math.min(...Object.values(p.table));
  if (!p.perSecond) return unit;
  const seconds = Number(read(p.perSecond)) || 0;
  return Math.round(unit * seconds * 10) / 10;
}

/** Cheapest configuration of a model, and whether price varies with settings. */
export function specCreditRange(spec: ModelSpec): { credits: number; tiered: boolean } {
  const p = spec.pricing;
  if ('credits' in p) return { credits: p.credits, tiered: false };
  if (p.perSecond) return { credits: specCredits(spec, {}), tiered: true };
  const values = Object.values(p.table);
  const min = Math.min(...values);
  return { credits: min, tiered: Math.max(...values) !== min };
}

/** Human-readable price for listings (assistant catalogue, tooltips). */
export function specPriceText(spec: ModelSpec): string {
  const p = spec.pricing;
  if ('credits' in p) return `${p.credits} credits`;
  const unit = p.perSecond ? ' credits/s' : ' credits';
  return Object.entries(p.table).map(([k, v]) => `${v}${unit} (${k.replace(/\|/g, ', ')})`).join('; ');
}
