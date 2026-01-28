
# Fix Generation Completion, Callbacks & UI State

## Overview
Fix the app to use the database as the single source of truth for generation results, enable seamless new generations without page refresh, and ensure Download button works reliably from persisted data.

## Issues Analysis

| Issue | Root Cause | Impact |
|-------|------------|--------|
| Results depend on webhook response | `currentOutput` set from API response, not database | Data lost on refresh |
| Download broken after refresh | Uses ephemeral `currentOutput` from Zustand | Button doesn't work |
| Can't generate without refresh | `pendingRating` blocks Generate button | Poor UX |
| History selection incomplete | OutputDisplay reads from store, not DB | Stale data shown |

## Implementation Plan

### Part 1: Database as Single Source of Truth

**File: `src/components/studio/OutputDisplay.tsx`**

Refactor to read from selected generation in database instead of `currentOutput` store:

```text
Current: Uses currentOutput from Zustand store (ephemeral)
New: Uses selectedJobId to find generation from useGenerations hook

Changes:
- Import useGenerations hook
- Find selected generation by selectedJobId
- Read output_url, final_prompt directly from database record
- Remove dependency on currentOutput store state
- Handle loading and empty states properly
```

### Part 2: Fix Download Button

**File: `src/components/studio/OutputDisplay.tsx`**

The Download button will automatically work once OutputDisplay reads from database:

```text
Current: handleDownload uses currentOutput?.outputUrl
New: handleDownload uses selectedGeneration?.output_url

Benefits:
- Works after page refresh (reads from DB)
- Works when selecting history items
- No dependency on webhook response
```

### Part 3: Fix UI State Reset (Generate Without Refresh)

**File: `src/components/studio/GenerateButton.tsx`**

Remove `pendingRating` from generation blocking logic:

```text
Current canGenerate check (line 33-39):
- selectedModel && generationType && rawPrompt.trim() 
- && hasRequiredFiles && !isGenerating && !pendingRating

New canGenerate check:
- selectedModel && generationType && rawPrompt.trim() 
- && hasRequiredFiles && !isGenerating
- (Remove !pendingRating condition)

Also:
- Remove setPendingRating(true) after successful generation
- Keep pendingRating for RatingPanel only, not blocking generation
```

**File: `src/components/studio/RatingPanel.tsx`**

Keep RatingPanel functional but don't let it block new generations.

### Part 4: History Behavior

Already mostly working with current implementation. The fixes in Part 1 will complete this:

```text
- RequestsPanel reads from database ✓
- Selection updates selectedJobId ✓  
- Selection syncs currentOutput (will remove this dependency)
- OutputDisplay will read directly from DB via selectedJobId
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/studio/OutputDisplay.tsx` | Read from DB via selectedJobId, not currentOutput |
| `src/components/studio/GenerateButton.tsx` | Remove pendingRating from canGenerate check |
| `src/components/studio/RequestsPanel.tsx` | Remove setCurrentOutput call (no longer needed) |

## Detailed Changes

### OutputDisplay.tsx (Complete Rewrite Logic)

```text
Before:
  const { mode, currentOutput, isGenerating } = useGenerationStore();
  
  if (!currentOutput) { show empty state }
  
  handleDownload() { uses currentOutput.outputUrl }

After:
  const { selectedJobId, isGenerating, mode } = useGenerationStore();
  const { generations, isLoading } = useGenerations();
  
  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  
  if (isLoading) { show loading }
  if (!selectedGeneration || !selectedGeneration.output_url) { show empty state }
  
  handleDownload() { uses selectedGeneration.output_url }
  
  // Determine media type from database record
  const mediaType = selectedGeneration.type; // 'image' or 'video'
```

### GenerateButton.tsx (Remove pendingRating Block)

```text
Line 33-39 change:
  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    hasRequiredFiles &&
    !isGenerating;
    // Remove: && !pendingRating

Line 154-156 change:
  // Remove: setPendingRating(true);
```

### RequestsPanel.tsx (Simplify Selection)

```text
Current handleSelectGeneration:
  setSelectedJobId(generation.id);
  setCurrentOutput(...);

New handleSelectGeneration:
  setSelectedJobId(generation.id);
  // Remove setCurrentOutput - OutputDisplay reads from DB directly
```

## Data Flow After Fix

```text
Generate Button Click
  └─→ INSERT record (status='queued')
  └─→ UPDATE record (status='running')
  └─→ Send webhook request
  └─→ Process response
  └─→ UPDATE record (status='done', output_url=url)
  └─→ React Query invalidates cache
  └─→ OutputDisplay re-renders from DB

Page Refresh
  └─→ useGenerations fetches all records
  └─→ RequestsPanel shows all history
  └─→ User clicks any item
  └─→ selectedJobId updated
  └─→ OutputDisplay shows that generation's output

n8n Callback (async)
  └─→ n8n updates database directly
  └─→ (Optional) Polling or realtime to detect changes
```

## Optional Enhancement: Auto-Refresh for Async Callbacks

If n8n updates the database asynchronously after the initial webhook response returns, add polling:

```text
// In useGenerations hook
const generationsQuery = useQuery({
  queryKey: ['generations'],
  queryFn: async () => { ... },
  refetchInterval: (data) => {
    // Poll every 5s if any record is still 'running'
    const hasRunning = data?.some(g => g.status === 'running');
    return hasRunning ? 5000 : false;
  },
});
```

This ensures UI updates when n8n writes back to the database.

## Verification Steps

1. Click Generate → Record appears with 'queued' then 'running' status
2. Generation completes → Output shows, Download works
3. Refresh page → Same output visible when selecting from history
4. Click on old history item → Its output displays, Download works
5. Start new generation immediately after previous one completes
6. Multiple generations can be created in sequence without refresh
