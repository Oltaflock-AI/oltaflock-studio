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

// ─── Server-side pricing ──────────────────────────────────────────────────────
// The `generate` edge function charges with these, never with a cost the caller
// sends. The browser shows the same numbers through specCredits above.

/** 1 Studio credit = 1 kie.ai credit = $0.005. */
export const USD_PER_CREDIT = 0.005;

/** Studio credits for a USD amount, rounded up to 0.1 so a job is never under-charged. */
export function usdToCredits(usd: number): number {
  return Math.ceil((usd / USD_PER_CREDIT) * 10 - 1e-6) / 10;
}

/** Keys of the controls that decide the price of a model. */
function pricedKeys(spec: ModelSpec): string[] {
  const p = spec.pricing;
  if ('credits' in p) return [];
  return [...(Array.isArray(p.by) ? p.by : [p.by]), ...(p.perSecond ? [p.perSecond] : [])];
}

/**
 * Authoritative credits for one generation, for the server. Same maths as
 * specCredits, but it refuses values that could dodge the price table (an enum
 * value outside the options, a non-numeric or out-of-range duration) and, if a
 * combination is missing from the table, charges the most expensive tier
 * instead of the cheapest.
 */
export function serverCredits(spec: ModelSpec, controls: Record<string, unknown>): { credits: number } | { error: string } {
  for (const key of pricedKeys(spec)) {
    const field = spec.fields.find((f) => f.key === key);
    if (!field) continue;
    const v = fieldValue(field, controls);
    if (field.type === 'enum' && field.options?.length) {
      if (!field.options.some((o) => String(o.value) === String(v))) {
        return { error: `${field.label}: "${String(v)}" is not a valid option for ${spec.name}` };
      }
    } else if (field.type === 'number') {
      const n = Number(v);
      if (v === undefined || v === null || typeof v === 'boolean' || !Number.isFinite(n) || n <= 0) {
        return { error: `${field.label} must be a positive number` };
      }
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        return { error: `${field.label} must be between ${field.min ?? 0} and ${field.max ?? n}` };
      }
    } else if (field.type === 'boolean') {
      if (!(typeof v === 'boolean' || v === 'true' || v === 'false')) {
        return { error: `${field.label} must be true or false` };
      }
    }
  }

  const p = spec.pricing;
  let credits: number;
  if ('credits' in p) {
    credits = p.credits;
  } else {
    const read = (key: string) => {
      const field = spec.fields.find((f) => f.key === key);
      return String(field ? fieldValue(field, controls) : controls[key]);
    };
    const key = (Array.isArray(p.by) ? p.by : [p.by]).map(read).join('|');
    const unit = p.table[key] ?? p.fallback ?? Math.max(...Object.values(p.table));
    credits = p.perSecond ? Math.round(unit * Number(read(p.perSecond)) * 10) / 10 : unit;
  }
  if (!Number.isFinite(credits) || credits < 0) return { error: `Could not price ${spec.name}` };
  return { credits };
}
