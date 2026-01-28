
# Fix Balance, Download, Rating & UI Reset Issues

## Overview
This plan addresses four issues:
1. Check balance webhook connection (verify and fix)
2. Download button CORS failure
3. Add star rating prompt after generation
4. Reset UI to blank screen when starting new generation

---

## Issue 1: Balance Button Webhook Connection

### Current State
The `BalanceButton.tsx` already has the correct webhook URL (`https://directive-ai.app.n8n.cloud/webhook/remainder-credits`) and makes a POST request. The code looks correct.

### Potential Issue
The webhook may be returning an unexpected response format, or there might be a network error being swallowed.

### Fix
Add better error logging and response parsing in `BalanceButton.tsx`:
- Log the full response for debugging
- Handle more response formats
- Show the raw response if balance extraction fails

---

## Issue 2: Download Button Fails (CORS)

### Problem
The current download implementation uses `fetch()` to download the image, which fails due to CORS restrictions when the image is hosted on a different domain.

### Current Code (OutputDisplay.tsx line 19-36)
```text
const handleDownload = async () => {
  const response = await fetch(selectedGeneration.output_url);  // FAILS: CORS
  const blob = await response.blob();
  ...
}
```

### Fix
Use a direct link download approach instead of fetch:
- Create an anchor element with `download` attribute
- Set `href` directly to the `output_url`
- For cross-origin images, open in new tab as fallback

---

## Issue 3: Star Rating After Generation

### Current State
- `RatingPanel.tsx` exists but depends on `currentOutput` and `pendingRating`
- `pendingRating` is never set to `true` after generation completes
- Rating data stored in Zustand `jobs` array but NOT in the database
- Database `generations` table has NO `rating` column

### Required Changes

#### A. Add `rating` column to database
Create migration to add:
```sql
ALTER TABLE generations ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
```

#### B. Update `useGenerations` hook
- Add `rating` to `DbGeneration` interface
- Add `rating` to `GenerationUpdate` interface
- Add `updateRating` mutation

#### C. Update `GenerateButton.tsx`
After successful generation with output:
- Set `pendingRating: true` to show the rating panel

#### D. Update `RatingPanel.tsx`
- Read from database instead of Zustand store
- Use `useGenerations` hook to update rating in database
- Show when generation is `done` status AND has no rating yet

---

## Issue 4: UI Not Resetting for New Generation

### Problem
When user clicks Generate for a new image:
- `selectedJobId` still points to the previous completed generation
- OutputDisplay shows the previous image instead of blank/generating state

### Current Flow
1. User clicks Generate
2. `setIsGenerating(true)` is called
3. New DB record created with `queued` status
4. `setSelectedJobId(newId)` selects the NEW job
5. OutputDisplay should show blank/loading for new job

### Actual Issue
Looking at `GenerateButton.tsx` line 139: `setCurrentOutput(null)` is called but `setSelectedJobId` is set to the new job which has no output yet.

The problem is in `OutputDisplay.tsx`:
- It finds `selectedGeneration` from database
- If the new job exists but has no `output_url`, it shows the empty state

This should already work. Let me check if the issue is that `selectedJobId` is not being cleared.

### Fix
In `GenerateButton.tsx`, when starting a new generation:
1. First clear `selectedJobId` to show blank state immediately
2. After creating the DB record, set `selectedJobId` to the new job

This ensures the UI immediately shows blank, then shows the new job's progress.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/studio/BalanceButton.tsx` | Add better error handling and logging |
| `src/components/studio/OutputDisplay.tsx` | Fix download to use direct link instead of fetch |
| `src/components/studio/RatingPanel.tsx` | Read from database, update rating in database |
| `src/components/studio/GenerateButton.tsx` | Set `pendingRating: true` after success, clear selectedJobId first |
| `src/hooks/useGenerations.tsx` | Add rating to interfaces and update mutation |
| Database migration | Add `rating` column to `generations` table |

---

## Detailed Changes

### 1. Database Migration

```sql
-- Add rating column to generations table
ALTER TABLE generations 
ADD COLUMN rating integer 
CHECK (rating >= 1 AND rating <= 5);
```

### 2. useGenerations.tsx Updates

Add to `DbGeneration` interface:
```text
rating: number | null;
```

Add to `GenerationUpdate` interface:
```text
rating?: number | null;
```

### 3. OutputDisplay.tsx - Fix Download

```text
const handleDownload = () => {
  if (!selectedGeneration?.output_url) return;
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = selectedGeneration.output_url;
  link.download = `output-${selectedGeneration.request_id}.${mediaType === 'image' ? 'png' : 'mp4'}`;
  link.target = '_blank'; // Fallback for cross-origin
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('Download started');
};
```

### 4. RatingPanel.tsx - Database-Driven

```text
- Import useGenerations hook
- Get selectedJobId from store
- Find generation from database by selectedJobId
- Show panel when generation.status === 'done' && !generation.rating
- On rating click: call updateGeneration with rating value
- Hide panel after rating is saved
```

### 5. GenerateButton.tsx - UI Reset & Rating

At start of `handleGenerate`:
```text
setSelectedJobId(null);  // Clear to show blank immediately
setCurrentOutput(null);
setIsGenerating(true);
```

After successful generation:
```text
setPendingRating(true);  // Show rating panel
```

### 6. BalanceButton.tsx - Better Error Handling

Add console.log for debugging:
```text
console.log('Balance webhook response:', data);
```

Show raw response if balance extraction fails:
```text
const balance = data.balance || data.remaining || data.credits || 
                data.data?.balance || JSON.stringify(data);
```

---

## Data Flow After Fix

### New Generation Flow
```text
1. User clicks Generate
   └─→ setSelectedJobId(null) - UI shows blank
   └─→ setIsGenerating(true) - UI shows "Generating..."
   
2. Create DB record (queued)
   └─→ setSelectedJobId(newId) - UI shows new job (still generating)
   
3. Generation completes
   └─→ Update DB: status='done', output_url=<url>
   └─→ setPendingRating(true)
   └─→ UI shows image + RatingPanel
   
4. User rates generation
   └─→ Update DB: rating=<1-5>
   └─→ RatingPanel hides (rating now set)
```

### Download Flow
```text
1. User clicks Download
   └─→ Create <a> element with href=output_url
   └─→ Set download attribute
   └─→ Click link programmatically
   └─→ Browser handles download (bypasses CORS)
```

---

## Verification Checklist

After implementation:

1. Click "Check Balance" - should show balance from webhook
2. Generate an image - should complete successfully
3. After generation, 5-star rating prompt should appear
4. Click a rating - should save to database and hide prompt
5. Click Download - should download the image without error
6. Click Generate again - UI should show blank/generating, not old image
7. After page refresh, ratings should persist (stored in DB)
