// =============================================================================
// PRICING CONFIGURATION
// Centralized pricing engine for OltaFlock Creative Studio
// =============================================================================

// Global conversion rate: 1000 credits = $5 USD
export const CREDITS_PER_DOLLAR = 200; // 1000 / 5
export const USD_PER_CREDIT = 0.005;   // 5 / 1000

export function creditsToUsd(credits: number): number {
  return credits * USD_PER_CREDIT;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCredits(credits: number): string {
  return credits % 1 === 0 ? String(credits) : credits.toFixed(1);
}

// =============================================================================
// PRICING RULES BY MODEL
// =============================================================================

interface PricingRule {
  baseCredits: number;
}

type ModelPricing = PricingRule | Record<string, PricingRule>;

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ==========================================================================
  // IMAGE MODELS - Text-to-Image
  // ==========================================================================
  
  // Google Nano Banana Pro: 1K/2K → 18 credits, 4K → 24 credits
  'nano-banana-pro': {
    '1K': { baseCredits: 18 },
    '2K': { baseCredits: 18 },
    '4K': { baseCredits: 24 },
  },
  
  // Seedream 4.5: Flat 6.5 credits
  'seedream-4.5': { baseCredits: 6.5 },
  
  // Black Forest Labs Flux 2 Flex: 1K → 14, 2K → 24
  'flux-flex': {
    '1K': { baseCredits: 14 },
    '2K': { baseCredits: 24 },
  },
  
  // Black Forest Labs Flux 2 Pro: 1K → 5, 2K → 7
  'flux-flex-pro': {
    '1K': { baseCredits: 5 },
    '2K': { baseCredits: 7 },
  },
  
  // Qwen Z-Image: 0.8 credits
  'z-image': { baseCredits: 0.8 },
  
  // GPT-4o Image: 10 credits per generation
  'gpt-4o': { baseCredits: 10 },
  
  // ==========================================================================
  // IMAGE MODELS - Image-to-Image
  // ==========================================================================
  
  // Nano Banana Pro I2I: Same as text-to-image
  'nano-banana-pro-i2i': {
    '1K': { baseCredits: 18 },
    '2K': { baseCredits: 18 },
    '4K': { baseCredits: 24 },
  },
  
  // Seedream 4.5 Edit: 6.5 credits
  'seedream-4.5-edit': { baseCredits: 6.5 },
  
  // Flux Flex I2I: 1K → 14, 2K → 24
  'flux-flex-i2i': {
    '1K': { baseCredits: 14 },
    '2K': { baseCredits: 24 },
  },
  
  // Flux Pro I2I: 1K → 5, 2K → 7
  'flux-pro-i2i': {
    '1K': { baseCredits: 5 },
    '2K': { baseCredits: 7 },
  },
  
  // Qwen Image Edit: 2 credits per edit
  'qwen-image-edit': { baseCredits: 2 },
  
  // ==========================================================================
  // VIDEO MODELS (3 models only)
  // ==========================================================================

  // Kling 3.0: mode (std/pro/4K) per generation
  'kling-3.0': {
    'std': { baseCredits: 60 },
    'pro': { baseCredits: 120 },
    '4K': { baseCredits: 280 },
  },

  // Seedance 2.0: flat per-generation
  'seedance-2.0': { baseCredits: 80 },

  // Grok Imagine: 30 credits per generation
  'grok-imagine': { baseCredits: 30 },

  // ==========================================================================
  // IMAGE-TO-VIDEO MODELS (mirror text-to-video pricing)
  // ==========================================================================
  'kling-3.0-i2v': {
    'std': { baseCredits: 60 },
    'pro': { baseCredits: 120 },
    '4K': { baseCredits: 280 },
  },
  'seedance-2.0-i2v': { baseCredits: 80 },
  'grok-imagine-i2v': { baseCredits: 30 },
};

// =============================================================================
// COST CALCULATOR
// =============================================================================

export function calculateCost(
  modelId: string,
  controls: Record<string, unknown>
): { credits: number; usd: number } {
  const pricing = MODEL_PRICING[modelId];
  
  if (!pricing) {
    return { credits: 0, usd: 0 };
  }
  
  let credits = 0;
  
  // Simple flat pricing (has baseCredits directly)
  if ('baseCredits' in pricing) {
    credits = (pricing as PricingRule).baseCredits;
  }
  // Resolution-based pricing (Nano Banana, Flux variants)
  else if (controls.resolution && typeof pricing === 'object') {
    const resKey = controls.resolution as string;
    const resPricing = (pricing as Record<string, PricingRule>)[resKey];
    credits = resPricing?.baseCredits || 0;
  }
  // Variant-based pricing (Veo 3.1)
  else if (controls.variant && typeof pricing === 'object') {
    const variantPricing = (pricing as Record<string, PricingRule>)[controls.variant as string];
    credits = variantPricing?.baseCredits || 0;
  }
  // Kling 3.0: variant-based mode pricing (t2v + i2v)
  else if (modelId === 'kling-3.0' || modelId === 'kling-3.0-i2v') {
    const variant = (controls.variant as string) || 'std';
    const tierPricing = (pricing as Record<string, PricingRule>)[variant];
    credits = tierPricing?.baseCredits || 0;
  }
  
  return {
    credits,
    usd: creditsToUsd(credits),
  };
}
