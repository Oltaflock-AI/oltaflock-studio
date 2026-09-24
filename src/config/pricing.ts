// =============================================================================
// PRICING — credits per generation come from the shared model catalog
// (supabase/functions/_shared/catalog). 1 credit = 1 kie.ai credit.
// =============================================================================

import { getSpec } from '@catalog/index.ts';
import { specCreditRange, specCredits } from '@catalog/pricing.ts';

// Global conversion rate: 1000 credits = $5 USD
export const CREDITS_PER_DOLLAR = 200;
export const USD_PER_CREDIT = 0.005;

export function creditsToUsd(credits: number): number {
  return credits * USD_PER_CREDIT;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCredits(credits: number): string {
  return credits % 1 === 0 ? String(credits) : credits.toFixed(1);
}

export function calculateCost(
  modelId: string,
  controls: Record<string, unknown>,
): { credits: number; usd: number } {
  const spec = getSpec(modelId);
  const credits = spec ? specCredits(spec, controls) : 0;
  return { credits, usd: creditsToUsd(credits) };
}

/** Cheapest configuration of a model, and whether price varies with settings. */
export function creditRange(modelId: string): { credits: number; tiered: boolean } | null {
  const spec = getSpec(modelId);
  return spec ? specCreditRange(spec) : null;
}
