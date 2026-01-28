
# Fix Request History Persistence

## Overview
Ensure every generation request is stored persistently in Lovable Cloud database and that history remains visible after page refresh.

## Current State Analysis

The implementation is already well-structured with:
- `generations` table in Lovable Cloud with correct schema
- `useGenerations` hook for CRUD operations
- `RequestsPanel` reading from database
- `GenerateButton` creating and updating records

## Issues Identified

| Issue | Description | Impact |
|-------|-------------|--------|
| Status not cleared for empty outputs | Selecting a generation without output doesn't clear the display | Shows stale content |
| Database status values | Current: queued/running/done/error vs requested: queued/running/completed/failed | Terminology mismatch |
| Initial status | Creates with 'running' instead of 'queued' | Skips queued state |

## Implementation Plan

### 1. Verify Database Table Schema

The `generations` table already exists with correct fields:

| Field | Type | Status |
|-------|------|--------|
| id | uuid (PK) | Exists |
| request_id | text (unique) | Exists |
| type | text | Exists |
| model | text | Exists |
| user_prompt | text | Exists |
| final_prompt | text (nullable) | Exists |
| model_params | jsonb (nullable) | Exists |
| status | text (default 'queued') | Exists |
| output_url | text (nullable) | Exists |
| error_message | text (nullable) | Exists |
| created_at | timestamptz | Exists |

No database changes needed - schema is complete.

### 2. Update GenerateButton Logic

Modify `src/components/studio/GenerateButton.tsx`:

- Create record with `status: 'queued'` immediately on button click
- Update to `status: 'running'` when webhook request starts
- Update to `status: 'done'` with `output_url` on success
- Update to `status: 'error'` with `error_message` on failure

Flow:
```text
Click Generate → Insert (queued) → Start Request (running) → Complete (done/error)
```

### 3. Update RequestsPanel Selection

Modify `src/components/studio/RequestsPanel.tsx`:

- Always call `setCurrentOutput` when selecting a generation
- If no `output_url`, pass `null` to clear the display
- Ensures OutputDisplay shows correct state for each selection

### 4. Add Type for OutputDisplay

Modify `src/components/studio/OutputDisplay.tsx`:

- Track the generation type from the selected item
- Display correct icon (image vs video) based on stored type

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/studio/GenerateButton.tsx` | Insert with 'queued' status first, then update to 'running' |
| `src/components/studio/RequestsPanel.tsx` | Always call setCurrentOutput (including null for empty) |
| `src/hooks/useGenerations.tsx` | No changes needed - already correct |

## Data Flow After Fix

```text
1. User clicks Generate
   └─→ INSERT record with status='queued'
   
2. Webhook request starts
   └─→ UPDATE record with status='running'
   
3a. Success:
   └─→ UPDATE record with status='done', output_url=<url>, final_prompt=<prompt>
   
3b. Failure:
   └─→ UPDATE record with status='error', error_message=<message>
   
4. Page refresh
   └─→ RequestsPanel fetches all generations from DB
   └─→ User clicks on any item
   └─→ OutputDisplay shows stored output_url
```

## Technical Details

### GenerateButton.tsx Changes

```text
// Current flow (simplified):
1. setIsGenerating(true)
2. INSERT with status='running'
3. Call webhook
4. UPDATE with done/error

// New flow:
1. setIsGenerating(true)
2. INSERT with status='queued'
3. UPDATE with status='running'
4. Call webhook
5. UPDATE with done/error
```

### RequestsPanel.tsx Changes

```text
// Current:
if (generation.output_url) {
  setCurrentOutput({...});
}

// New:
setCurrentOutput(
  generation.output_url 
    ? { jobId, outputUrl, refinedPrompt } 
    : null
);
```

## Verification After Implementation

1. Click Generate button
2. Check database - new record with status='queued' should appear
3. Record should update to 'running' then 'done' with output_url
4. Refresh page
5. All generations should still be visible in Requests panel
6. Clicking any completed generation should display its image/video

## What Stays the Same

- Database schema (already correct)
- `useGenerations` hook (already reads from DB)
- `RequestDetailPanel` (already displays all fields)
- Webhook integration
- Model configurations

## Important Notes

1. RLS is disabled for this internal tool (as requested)
2. No authentication is being added
3. All data persists in Lovable Cloud database
4. History survives page refresh by reading from database
