
# Two-Webhook Flow Implementation

## Problem Analysis

Currently, when clicking Generate:
1. Frontend sends request to n8n webhook
2. n8n returns a `taskId` immediately (no results yet)
3. Frontend incorrectly marks generation as "error" because there's no `output_url`
4. Second webhook with actual results comes later to `/functions/v1/generation-callback`

The frontend is treating the first webhook as the final response, when it should only be acknowledging that the job was accepted.

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLOW DIAGRAM                                                               │
│                                                                             │
│  1. User clicks Generate                                                    │
│     └─> Frontend creates record with request_id: "job_xxx"                  │
│     └─> Status: "queued"                                                    │
│                                                                             │
│  2. Frontend calls n8n webhook                                              │
│     └─> n8n returns: { taskId: "abc123" }                                   │
│     └─> Frontend stores taskId, updates status to "running"                 │
│     └─> NO ERROR - just wait for callback                                   │
│                                                                             │
│  3. n8n later sends POST to /generation-callback                            │
│     └─> Payload contains taskId: "abc123" + resultUrls                      │
│     └─> Callback matches taskId to stored external_task_id                  │
│     └─> Updates status to "done" + sets output_url                          │
│                                                                             │
│  4. Frontend polling detects update                                         │
│     └─> Dashboard shows completed generation                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Change

Add a new column to store the external `taskId` from n8n:

**Migration SQL:**
```sql
ALTER TABLE generations
ADD COLUMN external_task_id TEXT;

CREATE INDEX idx_generations_external_task_id 
ON generations(external_task_id);
```

This allows:
- `request_id` = our internal job ID (job_xxx_xxx)
- `external_task_id` = taskId from n8n/external system

---

## Changes Required

### 1. Database: Add `external_task_id` Column

Add a new column to store the external taskId that n8n provides, so we can match it when the callback arrives.

### 2. Frontend: `src/components/studio/GenerateButton.tsx`

**Current behavior (problematic):**
```typescript
// Lines 302-311
await updateGeneration({
  id: generationId,
  updates: {
    status: outputUrl ? 'done' : 'error',  // ❌ Marks as error if no outputUrl
    output_url: outputUrl || null,
    error_message: outputUrl ? null : 'No output URL in response',
  },
});
```

**New behavior:**
```typescript
// Parse response for taskId from n8n
const externalTaskId = data.taskId || data.data?.taskId || data.task_id;

if (externalTaskId) {
  // Store the external taskId and keep status as 'running'
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'running',
      progress: 50,  // Show progress is happening
      external_task_id: externalTaskId,  // Store for callback matching
    },
  });
  
  // Don't show error - wait for callback
  toast.info('Generation processing...');
} else if (outputUrl) {
  // Immediate result (some providers return results directly)
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'done',
      output_url: outputUrl,
      progress: 100,
    },
  });
  toast.success('Generation complete');
} else {
  // Only error if no taskId AND no outputUrl
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'error',
      error_message: 'No task ID or output in response',
    },
  });
}
```

### 3. Update useGenerations Hook

Add `external_task_id` to the TypeScript interfaces:

```typescript
export interface DbGeneration {
  // ... existing fields
  external_task_id: string | null;
}

export interface GenerationUpdate {
  // ... existing fields
  external_task_id?: string | null;
}
```

### 4. Edge Function: `generation-callback/index.ts`

Update to match by `external_task_id` (taskId from n8n) instead of `request_id`:

```typescript
// First try to find by external_task_id (n8n taskId)
let { data: generation, error: findError } = await supabase
  .from('generations')
  .select('id, status, request_id, external_task_id')
  .eq('external_task_id', taskId)
  .single();

// Fallback: try by request_id for backward compatibility
if (!generation) {
  const fallback = await supabase
    .from('generations')
    .select('id, status, request_id, external_task_id')
    .eq('request_id', taskId)
    .single();
  
  if (fallback.data) {
    generation = fallback.data;
  }
}
```

### 5. Retry Hook: `src/hooks/useRetryGeneration.tsx`

Apply the same two-webhook logic to regeneration/retry flows.

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Add `external_task_id` column via migration |
| `src/hooks/useGenerations.tsx` | Add `external_task_id` to interfaces |
| `src/components/studio/GenerateButton.tsx` | Handle taskId response, keep status as running |
| `src/hooks/useRetryGeneration.tsx` | Same logic for retry flow |
| `supabase/functions/generation-callback/index.ts` | Match by `external_task_id` |

---

## Detailed Code Changes

### GenerateButton.tsx - processGeneration function

Lines 260-340 need to be updated:

```typescript
const data = await response.json();
console.log('Webhook response:', data);

// Check for external taskId (n8n returns this for async processing)
const externalTaskId = data.taskId || data.data?.taskId || data.task_id;

// Check for immediate results (some models return directly)
let outputUrl = '';
let finalPrompt = '';

if (data.data?.resultJson) {
  try {
    const resultJson = typeof data.data.resultJson === 'string' 
      ? JSON.parse(data.data.resultJson) 
      : data.data.resultJson;
    
    if (resultJson.resultUrls && resultJson.resultUrls.length > 0) {
      outputUrl = resultJson.resultUrls[0];
    }
  } catch (e) {
    console.error('Failed to parse resultJson:', e);
  }
}

if (!outputUrl && data.output_url) {
  outputUrl = data.output_url;
}

finalPrompt = data.refined_prompt || data.data?.refined_prompt || '';

// Decision logic for how to handle the response
if (outputUrl) {
  // Got immediate result - mark as done
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'done',
      final_prompt: finalPrompt || null,
      output_url: outputUrl,
      progress: 100,
    },
  });
  toast.success('Generation complete');
  setPendingRating(true);
} else if (externalTaskId) {
  // Got taskId - async processing, wait for callback
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'running',
      progress: 50,
      external_task_id: externalTaskId,
      final_prompt: finalPrompt || null,
    },
  });
  // Don't show error, just info that it's processing
  toast.info('Generation submitted, waiting for results...');
  // Keep generation active - will be updated by callback
  return; // Don't remove from active set yet
} else {
  // No taskId and no output - this is an error
  await updateGeneration({
    id: generationId,
    updates: {
      status: 'error',
      error_message: 'No task ID or output URL in response',
    },
  });
  toast.error('Generation failed - no task assigned');
}
```

### generation-callback Edge Function

Update matching logic:

```typescript
// Find the generation by external_task_id first, then fallback to request_id
let generation = null;

// Try external_task_id first (taskId from n8n)
const { data: byExternal } = await supabase
  .from('generations')
  .select('id, status, request_id, external_task_id')
  .eq('external_task_id', taskId)
  .maybeSingle();

if (byExternal) {
  generation = byExternal;
} else {
  // Fallback to request_id for backward compatibility
  const { data: byRequest } = await supabase
    .from('generations')
    .select('id, status, request_id, external_task_id')
    .eq('request_id', taskId)
    .maybeSingle();
  
  generation = byRequest;
}

if (!generation) {
  console.error('Generation not found for taskId:', taskId);
  return new Response(
    JSON.stringify({ error: 'Generation not found', taskId }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Status Flow Diagram

```text
User clicks Generate
       │
       ▼
┌─────────────────┐
│ status: queued  │ ← Database record created
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ status: running │ ← Webhook request sent
│ progress: 25    │
└────────┬────────┘
         │
    Webhook returns
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────────┐
│ Has     │ │ Has taskId but   │
│ output? │ │ no output?       │
└────┬────┘ └────────┬─────────┘
     │               │
     ▼               ▼
┌─────────┐ ┌──────────────────┐
│ done    │ │ running          │
│ 100%    │ │ progress: 50     │
└─────────┘ │ external_task_id │
            └────────┬─────────┘
                     │
            Callback webhook arrives
                     │
                     ▼
            ┌─────────────────┐
            │ done            │
            │ progress: 100   │
            │ output_url set  │
            └─────────────────┘
```

---

## Benefits

1. **No false errors**: Generations won't show as failed while processing
2. **Proper tracking**: external_task_id links our record to n8n's task
3. **Backward compatible**: Still checks request_id as fallback
4. **Clear status flow**: Users see "running" with 50% until callback arrives
5. **Polling picks up**: useGenerations polls every 5s for running jobs

---

## Testing Checklist

After implementation:
- [ ] Click Generate → should show "running" status, not error
- [ ] Generation should stay at ~50% progress while waiting
- [ ] When callback arrives → status changes to "done"
- [ ] Output appears in dashboard
- [ ] History shows correct status throughout
- [ ] Retry functionality works with same flow
