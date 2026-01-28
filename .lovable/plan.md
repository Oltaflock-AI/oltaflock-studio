
# Complete Update: OltaFlock Creative Studio

## Overview
This plan implements all requested changes including:
1. Global app renaming to "OltaFlock Creative Studio"
2. New image models (Flux 2, GPT-4o Image, Z Image)
3. New video model (Grok Imagine)
4. Remove Veo 3 entirely
5. Update Seedream 4.5 aspect ratios and Seedance 1.0 variants
6. GPT-4o Image with dedicated API endpoint and callback handling
7. Check Remaining Balance feature with database persistence
8. Password reset functionality

---

## Part 1: Global App Settings

### Rename to "OltaFlock Creative Studio"

| File | Current | New |
|------|---------|-----|
| `index.html` | "Oltaflock AI Studio" | "OltaFlock Creative Studio" |
| `src/pages/Index.tsx` | "Oltaflock AI Studio" | "OltaFlock Creative Studio" |
| `src/pages/Auth.tsx` | "Oltaflock AI Studio" | "OltaFlock Creative Studio" |

---

## Part 2: Image Models Configuration

### Update `src/types/generation.ts`

**ImageModel type:**
```text
Before: 'nano-banana-pro' | 'seedream-4.5'
After:  'nano-banana-pro' | 'seedream-4.5' | 'flux-2' | 'gpt-4o' | 'z-image'
```

**VideoModel type (remove Veo 3):**
```text
Before: 'veo-3' | 'veo-3.1' | 'sora-2-pro' | 'kling-2.6' | 'seedance-1.0'
After:  'veo-3.1' | 'sora-2-pro' | 'kling-2.6' | 'seedance-1.0' | 'grok-imagine'
```

**MODEL_API_NAMES updates:**

| Model ID | API Name |
|----------|----------|
| flux-2 | flux/2 |
| gpt-4o | gpt/4o |
| z-image | z-image |
| grok-imagine | grok-imagine/text-to-video |
| (remove) veo-3 | - |

**New control interfaces:**
```text
interface Flux2Controls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface GPT4oControls {
  size: '1:1' | '3:2' | '2:3';
  isEnhance: boolean;
}

interface ZImageControls {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface GrokImagineControls {
  aspectRatio: '2:3' | '3:2' | '1:1' | '9:16' | '16:9';
  mode: 'fun' | 'normal' | 'spicy';
}
```

**Update Seedream45Controls interface:**
```text
Before: aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '2:3'
After:  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9'
```

**Update Seedance10Controls interface:**
```text
Before: variant: 'lite' | 'pro' | 'pro-fast'
After:  variant: 'lite' | 'pro'
```

**Update IMAGE_MODELS array - add:**
- Flux 2 (id: 'flux-2', displayName: 'Flux 2')
- GPT-4o Image (id: 'gpt-4o', displayName: 'GPT-4o Image')
- Z Image (id: 'z-image', displayName: 'Z Image')

**Update VIDEO_MODELS array:**
- Remove: veo-3 entry
- Add: grok-imagine (id: 'grok-imagine', displayName: 'Grok Imagine')

---

## Part 3: GPT-4o Image Integration (Dedicated API)

GPT-4o Image uses a **different API endpoint** than other models.

### GenerateButton.tsx Updates

Add special handling for GPT-4o:

```text
// When model is 'gpt-4o', use dedicated API:
// POST https://api.kie.ai/api/v1/gpt4o-image/generate
// Headers:
//   Authorization: Bearer <API_KEY>
//   Content-Type: application/json
// Body:
//   {
//     "prompt": "<user prompt>",
//     "size": "1:1" | "3:2" | "2:3",
//     "callBackUrl": "<n8n callback url>",
//     "isEnhance": boolean
//   }

// For all other models, continue using the existing n8n webhook
```

### Required: Add API Key Secret

The GPT-4o Image API requires a `KIE_API_KEY` secret for authentication.

### GPT-4o Image Control Component

Create `src/components/studio/controls/GPT4oControls.tsx`:
- Size selector: 1:1, 3:2, 2:3
- Prompt enhancement toggle (isEnhance)

---

## Part 4: Check Remaining Balance Feature

### Database Table: `credit_logs`

Create new table with schema:

| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | Auto-generated |
| balance | text | Balance value from webhook |
| raw_response | jsonb | Full webhook response for debugging |
| checked_at | timestamptz | Auto timestamp |

### New Hook: `useCreditLogs.tsx`

```text
- Query latest credit log for display
- Mutation to create new log entry
- No polling needed (manual trigger only)
```

### New Component: `BalanceButton.tsx`

Location: Header area (next to UserMenu)

Functionality:
- Button labeled "Check Remaining Balance"
- On click: POST to https://directive-ai.app.n8n.cloud/webhook/remainder-credits
- Show loading state during request
- Insert result into credit_logs table
- Display balance in UI
- Handle errors gracefully

### UI Display

- Show most recent balance from database
- Persist after page refresh
- Update immediately after new check

---

## Part 5: UI Control Components

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/studio/controls/Flux2Controls.tsx` | Aspect ratio selector |
| `src/components/studio/controls/GPT4oControls.tsx` | Size + isEnhance toggle |
| `src/components/studio/controls/ZImageControls.tsx` | Aspect ratio selector |
| `src/components/studio/controls/GrokImagineControls.tsx` | Aspect ratio + mode |
| `src/components/studio/BalanceButton.tsx` | Check balance feature |
| `src/hooks/useCreditLogs.tsx` | Credit logs data hook |

### Files to Update

| File | Changes |
|------|---------|
| `src/components/studio/controls/Seedream45Controls.tsx` | Update aspect ratios to 8 options |
| `src/components/studio/controls/Seedance10Controls.tsx` | Remove "pro-fast" variant |
| `src/components/studio/ModelControls.tsx` | Add new model mappings, remove veo-3 |
| `src/components/studio/ModelSelector.tsx` | Add descriptions for new models, remove veo-3 |
| `src/components/studio/GenerateButton.tsx` | Add GPT-4o dedicated API handling |
| `src/pages/Index.tsx` | Add BalanceButton to header |

### Files to Delete

- `src/components/studio/controls/Veo3Controls.tsx`

---

## Part 6: Auth Improvements

### Password Reset

**`src/hooks/useAuth.tsx`** - Add:
```text
resetPassword: (email: string) => Promise<{ error: Error | null }>
// Uses supabase.auth.resetPasswordForEmail()
```

**`src/pages/Auth.tsx`** - Add:
- "Forgot Password?" link below password field
- Password reset form with email input
- Success message when reset email sent

---

## Part 7: Files Summary

### Create (8 files)

1. `src/components/studio/controls/Flux2Controls.tsx`
2. `src/components/studio/controls/GPT4oControls.tsx`
3. `src/components/studio/controls/ZImageControls.tsx`
4. `src/components/studio/controls/GrokImagineControls.tsx`
5. `src/components/studio/BalanceButton.tsx`
6. `src/hooks/useCreditLogs.tsx`
7. Database migration for `credit_logs` table

### Modify (11 files)

1. `index.html` - App name
2. `src/types/generation.ts` - Types, models, API names
3. `src/pages/Index.tsx` - Header name + BalanceButton
4. `src/pages/Auth.tsx` - Header name + password reset
5. `src/hooks/useAuth.tsx` - Add resetPassword
6. `src/components/studio/ModelSelector.tsx` - Descriptions
7. `src/components/studio/ModelControls.tsx` - Mappings
8. `src/components/studio/controls/Seedream45Controls.tsx` - Aspect ratios
9. `src/components/studio/controls/Seedance10Controls.tsx` - Remove variant
10. `src/components/studio/GenerateButton.tsx` - GPT-4o API handling
11. `src/components/studio/UserMenu.tsx` - (optional) add balance display

### Delete (1 file)

- `src/components/studio/controls/Veo3Controls.tsx`

---

## Technical Details

### Model ID to API Name Mapping (Final)

| Model ID | Display Name | API Name |
|----------|--------------|----------|
| nano-banana-pro | Nano Banana Pro | nano-banana/pro-text-to-image |
| seedream-4.5 | Seedream 4.5 | seedream/4.5-text-to-image |
| flux-2 | Flux 2 | flux/2-text-to-image |
| gpt-4o | GPT-4o Image | gpt/4o-text-to-image |
| z-image | Z Image | z-image-text-to-image |
| veo-3.1 | Veo 3.1 | veo/3.1-text-to-video |
| sora-2-pro | Sora 2 Pro | sora/2-pro-text-to-video |
| kling-2.6 | Kling 2.6 | kling/2.6-text-to-video |
| seedance-1.0 | Seedance 1.0 | seedance/1.0-text-to-video |
| grok-imagine | Grok Imagine | grok-imagine/text-to-video |

### GPT-4o Image Special Handling

```text
When selectedModel === 'gpt-4o':
  1. Do NOT use the n8n webhook
  2. POST to: https://api.kie.ai/api/v1/gpt4o-image/generate
  3. Headers:
     - Authorization: Bearer <KIE_API_KEY>
     - Content-Type: application/json
  4. Body:
     - prompt: rawPrompt
     - size: controls.size (1:1, 3:2, 2:3)
     - callBackUrl: <n8n callback URL>
     - isEnhance: controls.isEnhance

All other models continue using the existing n8n webhook flow.
```

### Check Balance Flow

```text
1. User clicks "Check Remaining Balance"
2. Show loading spinner
3. POST to https://directive-ai.app.n8n.cloud/webhook/remainder-credits
4. Parse response for balance value
5. INSERT into credit_logs:
   - balance: <parsed value>
   - raw_response: <full response>
   - checked_at: now()
6. React Query invalidates credit_logs cache
7. UI displays new balance
8. On page refresh: fetch latest from credit_logs table
```

### Seedream 4.5 Aspect Ratios (Final)

- 1:1
- 4:3
- 3:4
- 16:9
- 9:16
- 2:3
- 3:2
- 21:9

### Seedance 1.0 Variants (Final)

- V1 Lite Text-to-Video (value: "lite")
- V1 Pro Text-to-Video (value: "pro")

### Grok Imagine Controls

- Aspect ratio: 2:3, 3:2, 1:1, 9:16, 16:9
- Mode: fun, normal, spicy

---

## Verification Checklist

After implementation, verify:

1. App displays "OltaFlock Creative Studio" everywhere
2. Image models: Nano Banana Pro, Seedream 4.5, Flux 2, GPT-4o Image, Z Image
3. Veo 3 is NOT visible anywhere
4. Video models: Veo 3.1, Sora 2 Pro, Kling 2.6, Seedance 1.0, Grok Imagine
5. Seedream 4.5 shows 8 aspect ratio options
6. Seedance 1.0 shows only 2 variants (Lite and Pro)
7. GPT-4o Image shows size and isEnhance controls
8. GPT-4o Image uses dedicated KIE API endpoint
9. Z Image sends model as exactly "z-image"
10. Grok Imagine shows aspect ratio and mode controls
11. "Check Remaining Balance" button visible in header
12. Balance persists after page refresh
13. Password reset functionality works
14. All generations persist in database
15. History survives page refresh
16. Download button works after refresh
