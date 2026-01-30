

# Fix OltaFlock Creative Studio: Webhook Routing, Models & UI

## Overview
This plan fixes critical issues with webhook routing, model configuration, payload structure, and ensures all generations/balance checks properly trigger webhooks and persist to database.

**Important**: Veo 3 will NOT be added. Only Veo 3.1 exists in the system.

---

## Issue Analysis

| Issue | Current State | Required State |
|-------|--------------|----------------|
| Check Balance | Empty payload `{}` | Must include `action`, `timestamp` |
| GPT-4o Image | Uses separate KIE API | Must use same webhook as all models |
| Veo 3.1 variant | Sends `fast`/`quality` | Must send `veo3_fast`/`veo3_quality` |
| Flux models | Single "Flux 2" | Must split into "Flux Flex" and "Flux Flex Pro" |
| Z Image | API name `z-image` | Correct - verify controls include aspect_ratio |
| Payload structure | Missing timestamp, request_id | Must include all required fields |

---

## Part 1: Fix Check Balance Webhook

**File: `src/components/studio/BalanceButton.tsx`**

Current payload:
```javascript
body: JSON.stringify({})
```

New payload:
```javascript
body: JSON.stringify({
  action: 'check_balance',
  timestamp: new Date().toISOString()
})
```

---

## Part 2: Fix Generation Webhook Routing

### Remove GPT-4o Separate API Path

**File: `src/components/studio/GenerateButton.tsx`**

Required changes:
- Delete `handleGPT4oGenerate` function
- Delete `GPT4O_API_URL` and `N8N_CALLBACK_URL` constants
- Make GPT-4o use `handleStandardGenerate` like all other models
- All models must call `https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT`

### Update Webhook Payload Structure

Current payload:
```javascript
{
  job_id: requestId,
  mode,
  model: apiModelName,
  generation_type: generationType,
  raw_prompt: rawPrompt,
  controls: modelParams,
}
```

Required payload:
```javascript
{
  request_id: requestId,
  timestamp: new Date().toISOString(),
  model: apiModelName,
  generation_type: generationType === 'text-to-image' ? 'TEXT_2_IMAGE' : 'TEXT_2_VIDEO',
  raw_prompt: rawPrompt,
  controls: modelParams,
}
```

---

## Part 3: Fix Veo 3.1 Variants (No Veo 3)

### Update Types

**File: `src/types/generation.ts`**

Update Veo31Controls interface - change variant values:
```typescript
export interface Veo31Controls {
  variant: 'veo3_fast' | 'veo3_quality';
  aspectRatio: 'auto' | '16:9' | '9:16';
  seed?: number;
}
```

### Update Veo31Controls Component

**File: `src/components/studio/controls/Veo31Controls.tsx`**

Change variant SelectItem values:
```typescript
<SelectItem value="veo3_fast">Veo 3.1 Fast</SelectItem>
<SelectItem value="veo3_quality">Veo 3.1 Quality</SelectItem>
```

Make aspect_ratio required (not optional):
- Change label from "Aspect Ratio" to "Aspect Ratio *"
- Add validation that aspect_ratio is set

---

## Part 4: Split Flux into Two Models

### Update Types

**File: `src/types/generation.ts`**

Update ImageModel:
```typescript
export type ImageModel = 'nano-banana-pro' | 'seedream-4.5' | 'flux-flex' | 'flux-flex-pro' | 'gpt-4o' | 'z-image';
```

Update MODEL_API_NAMES - remove old flux-2, add new entries:
```typescript
'flux-flex': 'flux-2/flex',
'flux-flex-pro': 'flux-2/pro',
```

Update IMAGE_MODELS array - replace Flux 2 with two entries:
```typescript
{
  id: 'flux-flex',
  displayName: 'Flux Flex',
  mode: 'image',
  generationTypes: ['text-to-image'],
},
{
  id: 'flux-flex-pro',
  displayName: 'Flux Flex Pro',
  mode: 'image',
  generationTypes: ['text-to-image'],
},
```

Add new interfaces:
```typescript
export interface FluxFlexControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}

export interface FluxFlexProControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K';
}
```

### Create Flux Control Components

**New File: `src/components/studio/controls/FluxFlexControls.tsx`**

Controls:
- Aspect ratio selector (required): 1:1, 16:9, 9:16, 4:3, 3:4
- Resolution selector (required): 1K, 2K

**New File: `src/components/studio/controls/FluxFlexProControls.tsx`**

Same controls as FluxFlexControls.

### Update ModelControls

**File: `src/components/studio/ModelControls.tsx`**

Remove:
```typescript
'flux-2': Flux2Controls,
```

Add:
```typescript
'flux-flex': FluxFlexControls,
'flux-flex-pro': FluxFlexProControls,
```

### Update ModelSelector

**File: `src/components/studio/ModelSelector.tsx`**

Remove:
```typescript
'flux-2': 'Advanced diffusion-based image generation',
```

Add:
```typescript
'flux-flex': 'Flux Flex fast image generation',
'flux-flex-pro': 'Flux Flex Pro high-quality generation',
```

### Delete Old Flux2Controls

**Delete File: `src/components/studio/controls/Flux2Controls.tsx`**

---

## Part 5: Fix GPT-4o to Use Standard Webhook

**File: `src/components/studio/GenerateButton.tsx`**

Remove:
- `GPT4O_API_URL` constant
- `N8N_CALLBACK_URL` constant  
- `handleGPT4oGenerate` function
- GPT-4o routing logic that calls the separate handler

GPT-4o will use `handleStandardGenerate` and the same webhook as all other models.

---

## Part 6: Add Validation for Required Fields

**File: `src/components/studio/GenerateButton.tsx`**

Add validation before sending request:

```typescript
// Validate Veo 3.1 has required fields
if (selectedModel === 'veo-3.1') {
  if (!controls.variant) {
    toast.error('Variant is required for Veo 3.1');
    setIsGenerating(false);
    return;
  }
  if (!controls.aspectRatio) {
    modelParams.aspectRatio = 'auto';
  }
}

// Validate Z Image has aspect_ratio
if (selectedModel === 'z-image' && !controls.aspectRatio) {
  toast.error('Aspect ratio is required for Z Image');
  setIsGenerating(false);
  return;
}

// Validate Flux models have required controls
if ((selectedModel === 'flux-flex' || selectedModel === 'flux-flex-pro') && 
    (!controls.aspectRatio || !controls.resolution)) {
  toast.error('Aspect ratio and resolution are required for Flux');
  setIsGenerating(false);
  return;
}
```

---

## Files Summary

### Files to Create (2)
1. `src/components/studio/controls/FluxFlexControls.tsx`
2. `src/components/studio/controls/FluxFlexProControls.tsx`

### Files to Modify (6)
1. `src/components/studio/BalanceButton.tsx` - Add action and timestamp to payload
2. `src/components/studio/GenerateButton.tsx` - Remove GPT-4o special path, fix payload structure, add validation
3. `src/types/generation.ts` - Split Flux, fix Veo 3.1 variants, update model lists
4. `src/components/studio/controls/Veo31Controls.tsx` - Fix variant values to veo3_fast/veo3_quality
5. `src/components/studio/ModelControls.tsx` - Update model mappings for Flux
6. `src/components/studio/ModelSelector.tsx` - Update model descriptions for Flux

### Files to Delete (1)
1. `src/components/studio/controls/Flux2Controls.tsx`

---

## Webhook Payload Specifications

### Check Balance Webhook
```text
POST https://directive-ai.app.n8n.cloud/webhook/remainder-credits

{
  "action": "check_balance",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

### Generation Webhook (All Models)
```text
POST https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT

{
  "request_id": "job_1738249200000_abc12",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "model": "flux-2/flex-text-to-image",
  "generation_type": "TEXT_2_IMAGE",
  "raw_prompt": "A beautiful sunset over mountains",
  "controls": {
    "aspectRatio": "16:9",
    "resolution": "2K"
  }
}
```

---

## Model API Names (Final)

| Model ID | API Model Name Sent |
|----------|---------------------|
| nano-banana-pro | nano-banana/pro-text-to-image |
| seedream-4.5 | seedream/4.5-text-to-image |
| flux-flex | flux-2/flex-text-to-image |
| flux-flex-pro | flux-2/pro-text-to-image |
| gpt-4o | gpt/4o-text-to-image |
| z-image | z-image-text-to-image |
| veo-3.1 | veo-3.1-text-to-video |
| sora-2-pro | sora/2-pro-text-to-video |
| kling-2.6 | kling/2.6-text-to-video |
| seedance-1.0 | seedance/1.0-text-to-video |
| grok-imagine | grok-imagine/text-to-video |

---

## Validation Checklist

After implementation:

1. Check Balance button sends `action` and `timestamp` in payload
2. All image models use same webhook: `https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT`
3. All video models use same webhook
4. GPT-4o does NOT use separate KIE API
5. Flux appears as two options: "Flux Flex" and "Flux Flex Pro"
6. Veo 3 does NOT appear anywhere (only Veo 3.1)
7. Veo 3.1 sends `veo3_fast` or `veo3_quality` as variant
8. Veo 3.1 requires aspect_ratio (defaults to auto)
9. Z Image requires aspect_ratio in controls
10. All payloads include `request_id`, `timestamp`, `model`, `generation_type`, `raw_prompt`, `controls`
11. generation_type is `TEXT_2_IMAGE` or `TEXT_2_VIDEO` (uppercase)
12. Download button works after generation completes
13. UI resets when starting new generation
14. All generations persist to database

