

# Multiple Concurrent Generations with Per-Job Progress Indicators

## Overview

This plan adds support for **multiple parallel generation requests** and **per-job progress indicators** to the OltaFlock Creative Studio. Currently, the UI blocks further generations while one is in progress due to a global `isGenerating` state. This will be replaced with per-job state management.

---

## Current Architecture Analysis

### Blocking Issues Identified

| Component | Current Behavior | Problem |
|-----------|-----------------|---------|
| `generationStore.ts` | Uses global `isGenerating` boolean | Blocks all Generate clicks while any job runs |
| `GenerateButton.tsx` | Checks `!isGenerating` in `canGenerate` | Disables button during any active generation |
| `OutputDisplay.tsx` | Uses global `isGenerating` for loading state | Shows single "generating" state for all jobs |
| Database | No `progress` column | Cannot store/track progress per job |

### What Works Well

- Each generation already creates a unique `request_id`
- The `generations` table already has per-row status (`queued`, `running`, `done`, `error`)
- History panel already shows individual job status dots
- Polling mechanism already exists to detect status changes

---

## Implementation Plan

### Part 1: Remove Global Generation Lock

**File: `src/store/generationStore.ts`**

Changes:
- Remove global `isGenerating` state
- Add a Set to track `activeGenerationIds` (jobs currently in progress)
- Add helper functions: `addActiveGeneration(id)`, `removeActiveGeneration(id)`, `isAnyGenerating()`

```typescript
// Replace:
isGenerating: boolean;
setIsGenerating: (generating: boolean) => void;

// With:
activeGenerationIds: Set<string>;
addActiveGeneration: (id: string) => void;
removeActiveGeneration: (id: string) => void;
isAnyGenerating: () => boolean;
```

**File: `src/components/studio/GenerateButton.tsx`**

Changes:
- Remove dependency on global `isGenerating`
- Allow Generate button to remain enabled while other jobs run
- Track individual job state via database polling
- Only disable button while validating/submitting (brief moment)

```typescript
// New canGenerate logic:
const canGenerate = selectedModel && generationType && rawPrompt.trim() && hasRequiredImages;
// Note: isGenerating removed from this check
```

---

### Part 2: Add Progress Field to Database

**Database Migration**

Add a `progress` column to the `generations` table to store progress percentage (0-100).

```sql
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
```

This enables:
- Per-job progress tracking
- Persistence across page refreshes
- Backend can update progress via callback

**File: `src/hooks/useGenerations.tsx`**

Update types to include progress:

```typescript
export interface DbGeneration {
  // ... existing fields
  progress: number; // 0-100
}

export interface GenerationUpdate {
  // ... existing fields
  progress?: number;
}
```

---

### Part 3: Implement Simulated Progress Logic

Since the n8n webhook doesn't provide real-time progress callbacks, we'll implement **simulated progress** based on lifecycle stages.

**New File: `src/hooks/useGenerationProgress.tsx`**

Creates a custom hook that:
1. Watches active generations via polling
2. Simulates smooth progress increases based on elapsed time
3. Maps lifecycle stages to progress ranges

```typescript
// Progress stages:
// 0%  - Generation created
// 10% - Request sent to webhook
// 25% - Status changed to 'running'
// 25-80% - Time-based simulation while running (increments every 2s)
// 85% - Output URL received
// 100% - Fully rendered

function useGenerationProgress(generationId: string): number {
  // Returns current progress (0-100) for the given generation
  // Uses useEffect with interval to smoothly animate progress
}
```

**Progress Simulation Rules:**
- Never decrease progress
- Cap at 90% until confirmed done
- Jump to 100% only when `status === 'done'` and `output_url` exists
- Failed jobs freeze at current progress and show error state

---

### Part 4: Update GenerateButton for Parallel Operations

**File: `src/components/studio/GenerateButton.tsx`**

Key changes:
1. Remove global lock - button stays enabled
2. Add brief `isSubmitting` local state (only while creating DB record)
3. Don't wait for webhook response in UI thread - fire and forget
4. Each click starts independent flow

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleGenerate = async () => {
  if (!canGenerate || isSubmitting) return;
  
  setIsSubmitting(true); // Brief lock while creating record
  
  try {
    // 1. Create generation in DB with 'queued' status
    const dbGeneration = await createGeneration({...});
    
    // 2. Immediately select the new job
    setSelectedJobId(dbGeneration.id);
    
    // 3. Start webhook call (don't await final result in UI)
    triggerWebhook(dbGeneration.id, webhookPayload);
    
    toast.success('Generation started');
  } catch (error) {
    toast.error('Failed to start generation');
  } finally {
    setIsSubmitting(false); // Unlock immediately
  }
};
```

---

### Part 5: Update OutputDisplay for Per-Job Progress

**File: `src/components/studio/OutputDisplay.tsx`**

Changes:
1. Remove dependency on global `isGenerating`
2. Show progress bar when viewing a job that's `queued` or `running`
3. Use the new `useGenerationProgress` hook
4. Progress bar with percentage label

```typescript
function OutputDisplay() {
  const { selectedJobId } = useGenerationStore();
  const { generations } = useGenerations();
  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  
  // Get simulated progress for selected generation
  const progress = useGenerationProgress(selectedJobId);
  
  if (selectedGeneration?.status === 'queued' || selectedGeneration?.status === 'running') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Progress value={progress} className="w-48 h-2 mb-4" />
        <p className="text-sm font-medium">{progress}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          {progress < 25 ? 'Queuing...' : progress < 80 ? 'Generating...' : 'Finalizing...'}
        </p>
      </div>
    );
  }
  
  // ... rest of component (done/error/empty states)
}
```

---

### Part 6: Update RequestsPanel for Progress Display

**File: `src/components/studio/RequestsPanel.tsx`**

Changes:
1. Show mini progress bar for active jobs
2. Update status dot to show animated state for running jobs
3. Allow clicking any job regardless of active status

```typescript
// For each generation item, show progress if running:
{generation.status === 'running' && (
  <Progress value={progress} className="h-1 mt-1" />
)}
```

---

### Part 7: Create Progress Simulation Hook

**New File: `src/hooks/useGenerationProgress.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { useGenerations } from './useGenerations';

export function useGenerationProgress(generationId: string | null): number {
  const { generations } = useGenerations();
  const generation = generations.find(g => g.id === generationId);
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    if (!generation) {
      setSimulatedProgress(0);
      return;
    }

    // Map status to base progress
    const statusProgress: Record<string, number> = {
      'queued': 10,
      'running': 25,
      'done': 100,
      'error': simulatedProgress, // Freeze on error
    };

    const baseProgress = statusProgress[generation.status] || 0;

    // If done, jump to 100
    if (generation.status === 'done') {
      setSimulatedProgress(100);
      return;
    }

    // If error, freeze
    if (generation.status === 'error') {
      return;
    }

    // Start from base progress
    setSimulatedProgress(prev => Math.max(prev, baseProgress));

    // Simulate progress while running
    if (generation.status === 'running') {
      const interval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev >= 85) return prev; // Cap at 85% until confirmed
          return prev + Math.random() * 3 + 1; // Add 1-4% each tick
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [generation?.status, generationId]);

  return Math.min(Math.round(simulatedProgress), 100);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/new` | Add `progress` column to `generations` table |
| `src/store/generationStore.ts` | Replace `isGenerating` with `activeGenerationIds` Set |
| `src/hooks/useGenerations.tsx` | Add `progress` field to types |
| `src/hooks/useGenerationProgress.tsx` | **NEW** - Progress simulation hook |
| `src/components/studio/GenerateButton.tsx` | Remove global lock, use local `isSubmitting` |
| `src/components/studio/OutputDisplay.tsx` | Add progress bar for active jobs |
| `src/components/studio/RequestsPanel.tsx` | Add mini progress indicators |

---

## Technical Architecture

```text
+-------------------+     +-------------------+     +-------------------+
|   GenerateButton  |     |   RequestsPanel   |     |   OutputDisplay   |
+-------------------+     +-------------------+     +-------------------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------+
|              useGenerationProgress (simulated progress)          |
+------------------------------------------------------------------+
                                  |
                                  v
+------------------------------------------------------------------+
|                        useGenerations                            |
|   - Polls database every 5s while any job is queued/running      |
|   - Returns all user's generations with status + progress        |
+------------------------------------------------------------------+
                                  |
                                  v
+------------------------------------------------------------------+
|                     Supabase Database                            |
|   - generations table with status, progress, output_url          |
|   - Updated by n8n webhook callbacks                             |
+------------------------------------------------------------------+
```

---

## User Experience Flow

1. **User clicks Generate**
   - Button briefly shows "Starting..." (0.5s)
   - New job appears in history with 10% progress
   - Button re-enables immediately

2. **User clicks Generate again**
   - Another job starts independently
   - Both jobs show in history with their own progress
   - User can switch between them

3. **Progress updates**
   - History shows mini progress bars for running jobs
   - Selected job shows large progress bar in output canvas
   - Progress smoothly increases (simulated)

4. **Job completes**
   - Progress jumps to 100%
   - Output image/video appears
   - History item updates with green "done" dot

5. **Job fails**
   - Progress freezes
   - Error message displays
   - History item shows red "error" dot
   - Other running jobs continue unaffected

---

## Acceptance Criteria

| Requirement | Implementation |
|-------------|----------------|
| Multiple Generate clicks work instantly | Local `isSubmitting` (brief), no global lock |
| Multiple jobs run in parallel | Each job has independent DB record and webhook call |
| Outputs never overwrite each other | Each output tied to specific `request_id` |
| History is accurate and isolated | Each click = one history item immediately |
| Progress shows per job | `useGenerationProgress` hook with simulation |
| Progress 0-100% with smooth animation | Interval-based increment while status is 'running' |
| Failed jobs don't affect running jobs | Errors isolated per generation ID |
| UI remains responsive | No blocking async operations in UI thread |

---

## Testing Checklist

After implementation:

- [ ] Click Generate 3 times rapidly - all 3 jobs should start
- [ ] Each job shows independent progress in history
- [ ] Clicking a running job shows its progress bar in output canvas
- [ ] Clicking a completed job shows its output
- [ ] Failed job shows error without affecting other jobs
- [ ] Page refresh preserves job states and progress
- [ ] Switching models between clicks works correctly
- [ ] Progress never exceeds 90% until output confirmed
- [ ] Progress jumps to 100% when output URL arrives

