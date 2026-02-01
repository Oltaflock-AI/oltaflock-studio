
# Pricing & Cost-Visibility System

## Overview

Build a centralized pricing engine that calculates and displays generation costs in credits and USD throughout the OltaFlock Creative Studio. The system will provide real-time cost estimates before generation and persist cost data with each generation for historical tracking.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PRICING CONFIGURATION                        │
│  src/config/pricing.ts                                          │
│  - Credit conversion rate (1000 credits = $5)                   │
│  - Model pricing map keyed by model + controls                  │
│  - Helper functions for cost calculation                        │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   usePricing    │  │  BalanceButton  │  │  Database       │
│   Hook          │  │  USD Display    │  │  Storage        │
│                 │  │                 │  │                 │
│ - Calculate     │  │ - Show credits  │  │ - credits_used  │
│   costs from    │  │   + USD value   │  │ - usd_cost      │
│   current       │  │ - Live update   │  │   (in model_    │
│   controls      │  │                 │  │    params)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI INTEGRATION                             │
│  - CostPreview component (before Generate button)               │
│  - RequestsPanel (cost in history items)                        │
│  - RequestDetailPanel (cost in metadata section)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pricing Configuration

**New File: `src/config/pricing.ts`**

### Global Constants

```typescript
// Conversion rate: 1000 credits = $5 USD
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
```

### Pricing Map Structure

```typescript
interface PricingRule {
  baseCredits: number;
  // Optional modifiers for variants
  resolutionMultipliers?: Record<string, number>;
  durationMultipliers?: Record<number, number>;
  qualityMultipliers?: Record<string, number>;
  audioMultiplier?: number;
}

export const MODEL_PRICING: Record<string, PricingRule | Record<string, PricingRule>> = {
  // Image Models
  'nano-banana-pro': {
    '1K': { baseCredits: 18 },
    '2K': { baseCredits: 18 },
    '4K': { baseCredits: 24 },
  },
  'seedream-4.5': { baseCredits: 6.5 },
  'flux-flex': {
    '1K': { baseCredits: 14 },
    '2K': { baseCredits: 24 },
  },
  'flux-flex-pro': {
    '1K': { baseCredits: 5 },
    '2K': { baseCredits: 7 },
  },
  'z-image': { baseCredits: 0.8 },
  'gpt-4o': { baseCredits: 10 }, // Placeholder - need actual pricing
  
  // Image-to-Image
  'nano-banana-pro-i2i': {
    '1K': { baseCredits: 18 },
    '2K': { baseCredits: 18 },
    '4K': { baseCredits: 24 },
  },
  'seedream-4.5-edit': { baseCredits: 6.5 },
  'flux-flex-i2i': {
    '1K': { baseCredits: 14 },
    '2K': { baseCredits: 24 },
  },
  'flux-pro-i2i': {
    '1K': { baseCredits: 5 },
    '2K': { baseCredits: 7 },
  },
  'qwen-image-edit': { baseCredits: 2 }, // Placeholder
  
  // Video Models
  'veo-3.1': {
    'veo3_fast': { baseCredits: 60 },
    'veo3_quality': { baseCredits: 250 },
  },
  'sora-2-pro': {
    'standard-10': { baseCredits: 150 },
    'standard-15': { baseCredits: 270 },
    'high-10': { baseCredits: 330 },
    'high-15': { baseCredits: 630 },
  },
  'kling-2.6': {
    base: { 
      baseCredits: 55,
      durationMultipliers: { 5: 1, 10: 2 },
      audioMultiplier: 2,
    },
  },
  'seedance-1.0': {
    'lite': { baseCredits: 25 },
    'pro': { baseCredits: 50 },
  },
  'grok-imagine': { baseCredits: 30 }, // Placeholder
};
```

### Cost Calculator Function

```typescript
export function calculateCost(
  modelId: string,
  controls: Record<string, unknown>
): { credits: number; usd: number } {
  const pricing = MODEL_PRICING[modelId];
  
  if (!pricing) {
    return { credits: 0, usd: 0 };
  }
  
  let credits = 0;
  
  // Handle resolution-based pricing
  if (typeof pricing === 'object' && controls.resolution) {
    const resKey = controls.resolution as string;
    const resPricing = pricing[resKey];
    credits = resPricing?.baseCredits || 0;
  }
  // Handle variant-based pricing (Veo 3.1)
  else if (typeof pricing === 'object' && controls.variant) {
    const variantPricing = pricing[controls.variant as string];
    credits = variantPricing?.baseCredits || 0;
  }
  // Handle quality + duration (Sora 2 Pro)
  else if (modelId === 'sora-2-pro') {
    const quality = controls.quality || 'standard';
    const duration = controls.duration || 10;
    const key = `${quality}-${duration}`;
    credits = (pricing as any)[key]?.baseCredits || 0;
  }
  // Handle Kling with sound multiplier
  else if (modelId === 'kling-2.6') {
    const base = (pricing as any).base;
    const duration = (controls.duration as number) || 5;
    const hasSound = controls.sound === true;
    credits = base.baseCredits * (duration === 10 ? 2 : 1) * (hasSound ? 2 : 1);
  }
  // Simple flat pricing
  else if (typeof pricing === 'object' && 'baseCredits' in pricing) {
    credits = (pricing as PricingRule).baseCredits;
  }
  
  return {
    credits,
    usd: creditsToUsd(credits),
  };
}
```

---

## Custom Hook

**New File: `src/hooks/usePricing.ts`**

```typescript
import { useMemo } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { calculateCost, creditsToUsd, formatCredits, formatUsd } from '@/config/pricing';

export function usePricing() {
  const { selectedModel, controls } = useGenerationStore();
  
  const cost = useMemo(() => {
    if (!selectedModel) {
      return { credits: 0, usd: 0 };
    }
    return calculateCost(selectedModel, controls);
  }, [selectedModel, controls]);
  
  return {
    credits: cost.credits,
    usd: cost.usd,
    formattedCredits: formatCredits(cost.credits),
    formattedUsd: formatUsd(cost.usd),
    hasPrice: cost.credits > 0,
  };
}
```

---

## UI Components

### 1. Cost Preview Component

**New File: `src/components/studio/CostPreview.tsx`**

Display estimated cost above the Generate button:

```typescript
import { usePricing } from '@/hooks/usePricing';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CostPreview() {
  const { hasPrice, formattedCredits, formattedUsd } = usePricing();
  
  if (!hasPrice) return null;
  
  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3 rounded-lg",
      "bg-muted/30 border border-border/50"
    )}>
      <div className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Estimated Cost
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formattedCredits}
        </span>
        <span className="text-xs text-muted-foreground">credits</span>
        <span className="text-xs text-muted-foreground/60">•</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formattedUsd}
        </span>
      </div>
    </div>
  );
}
```

### 2. Enhanced Balance Display

**File: `src/components/studio/BalanceButton.tsx`**

Update to show USD equivalent:

```typescript
// After parsing balance value, also calculate USD
const numericBalance = parseFloat(balanceValue.replace(/,/g, ''));
const usdValue = creditsToUsd(numericBalance);

// Display:
<div className="text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/10">
  <span className="tabular-nums">{balanceValue}</span>
  <span className="text-primary/70 ml-1">credits</span>
  <span className="text-primary/50 mx-1.5">•</span>
  <span className="tabular-nums text-primary/70">${usdValue.toFixed(2)}</span>
</div>
```

### 3. History Item Cost

**File: `src/components/studio/RequestsPanel.tsx`**

Add cost display to each history item:

```typescript
// In the footer section, after model name:
{generation.model_params?.cost_credits && (
  <span className="text-[9px] text-muted-foreground tabular-nums">
    {formatCredits(generation.model_params.cost_credits as number)} cr
  </span>
)}
```

### 4. Request Detail Panel Cost Section

**File: `src/components/studio/RequestDetailPanel.tsx`**

Add a dedicated cost section:

```typescript
{/* Cost Section - after Model */}
{modelParams?.cost_credits && (
  <DetailSection icon={Coins} label="Cost">
    <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
      <div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCredits(modelParams.cost_credits as number)}
        </span>
        <span className="text-xs text-muted-foreground ml-1">credits</span>
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">
        {formatUsd(modelParams.cost_usd as number)}
      </div>
    </div>
  </DetailSection>
)}
```

---

## Data Persistence

### Store Cost with Generation

**File: `src/components/studio/GenerateButton.tsx`**

When creating a generation, include cost in model_params:

```typescript
import { calculateCost } from '@/config/pricing';

// Before createGeneration:
const cost = calculateCost(selectedModel, modelParams);

// Add to model_params:
model_params: {
  ...modelParams,
  image_urls: mode === 'image-to-image' ? uploadedImageUrls : undefined,
  cost_credits: cost.credits,
  cost_usd: cost.usd,
},
```

---

## Complete Pricing Table

| Model | Configuration | Credits | USD |
|-------|---------------|---------|-----|
| **Nano Banana Pro** | 1K / 2K | 18 | $0.09 |
| | 4K | 24 | $0.12 |
| **Seedream 4.5** | All | 6.5 | $0.032 |
| **Flux Flex** | 1K | 14 | $0.07 |
| | 2K | 24 | $0.12 |
| **Flux Pro** | 1K | 5 | $0.025 |
| | 2K | 7 | $0.035 |
| **Z-Image** | All | 0.8 | $0.004 |
| **Veo 3.1** | Fast | 60 | $0.30 |
| | Quality | 250 | $1.25 |
| **Sora 2 Pro** | Standard 10s | 150 | $0.75 |
| | Standard 15s | 270 | $1.35 |
| | High 10s | 330 | $1.65 |
| | High 15s | 630 | $3.15 |
| **Kling 2.6** | 5s | 55 | $0.275 |
| | 10s | 110 | $0.55 |
| | + Audio | ×2 | ×2 |
| **Seedance 1.0** | Lite | 25 | $0.125 |
| | Pro | 50 | $0.25 |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/config/pricing.ts` | Centralized pricing configuration and calculator |
| `src/hooks/usePricing.ts` | React hook for reactive cost calculation |
| `src/components/studio/CostPreview.tsx` | Cost estimate display component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add CostPreview above GenerateButton |
| `src/components/studio/GenerateButton.tsx` | Store cost with generation |
| `src/components/studio/BalanceButton.tsx` | Show USD alongside credits |
| `src/components/studio/RequestsPanel.tsx` | Show cost on history items |
| `src/components/studio/RequestDetailPanel.tsx` | Add cost section to details |

---

## Visual Mockups

### Cost Preview (before Generate)

```text
┌──────────────────────────────────────────┐
│ 💰 ESTIMATED COST                        │
│                    18 credits  •  $0.09  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│           [ Generate ]                   │
└──────────────────────────────────────────┘
```

### Enhanced Balance Display

```text
┌────────────────────────────────────┐
│  2,340 credits  •  $11.70   [↻]   │
└────────────────────────────────────┘
```

### History Item with Cost

```text
┌─────────────────────────────────┐
│ ● 🖼️                     14:32 │
│ A futuristic cityscape...       │
│ Nano Banana Pro        18 cr    │
└─────────────────────────────────┘
```

---

## Benefits

1. **Transparency**: Users see exact costs before generating
2. **Trust**: No hidden fees or surprises
3. **Budgeting**: USD conversion helps track spend
4. **Historical data**: All costs stored with generations
5. **Maintainability**: Single config file for all pricing
6. **Extensibility**: Easy to add new models or tiers
