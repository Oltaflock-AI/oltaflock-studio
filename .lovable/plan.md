

# Update Callback Endpoint for New Payload Format

## Problem

The current edge function expects this structure:
```json
{
  "body": {
    "code": 200,
    "data": {
      "taskId": "...",
      "state": "success",
      "resultJson": { "resultUrls": ["..."] }
    }
  }
}
```

But your n8n workflow is sending this format:
```json
{
  "taskId": "abc123",
  "status": "success",
  "outputs": [
    { "type": "image", "url": "https://..." }
  ],
  "metadata": {
    "model": "seedream/4.5-text-to-image",
    "generation_time_ms": 66,
    "completed_at": "2026-02-02T07:25:03.000Z"
  }
}
```

---

## Solution

Update the edge function to accept BOTH formats for flexibility:

1. Try to parse the new flat format first (your n8n payload)
2. Fall back to the old nested format for backward compatibility

---

## New Payload Interface

```typescript
// New format from n8n
interface NewCallbackPayload {
  taskId: string;
  status: string;  // "success" or "error"
  outputs?: Array<{
    type: string;
    url: string;
  }>;
  metadata?: {
    model?: string;
    generation_time_ms?: number;
    completed_at?: string;
  };
}

// Old format (kept for backward compatibility)
interface LegacyCallbackPayload {
  body: {
    code: number;
    data: {
      taskId: string;
      state: string;
      resultJson?: { resultUrls?: string[] };
    };
    msg?: string;
  };
}
```

---

## Updated Parsing Logic

```typescript
// Parse the payload - support both formats
let taskId: string;
let status: string;
let outputUrl: string | null = null;

// Try new flat format first
if (payload.taskId) {
  taskId = payload.taskId;
  status = payload.status;
  outputUrl = payload.outputs?.[0]?.url || null;
}
// Fall back to legacy nested format
else if (payload.body?.data?.taskId) {
  taskId = payload.body.data.taskId;
  status = payload.body.data.state;
  outputUrl = payload.body.data.resultJson?.resultUrls?.[0] || null;
}
else {
  // Neither format matched
  return error response
}
```

---

## Field Mapping

| Your Payload Field | Database Field | Notes |
|-------------------|----------------|-------|
| `taskId` | Match against `external_task_id` | Primary lookup key |
| `status` | `status` | "success" → "done", else "error" |
| `outputs[0].url` | `output_url` | The generated image/video URL |
| `metadata.model` | (logged) | For debugging |
| `metadata.generation_time_ms` | (logged) | Could store in model_params |

---

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/generation-callback/index.ts` | Update to accept flat payload format |

---

## Updated Edge Function Logic

```typescript
Deno.serve(async (req) => {
  // ... CORS handling ...

  try {
    const payload = await req.json();
    console.log('Received callback payload:', JSON.stringify(payload, null, 2));

    // Parse payload - support both new flat format and legacy nested format
    let taskId: string;
    let status: string;
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    if (payload.taskId) {
      // New flat format from n8n
      taskId = payload.taskId;
      status = payload.status;
      outputUrl = payload.outputs?.[0]?.url || null;
      console.log('Parsed new format - taskId:', taskId, 'status:', status);
    } else if (payload.body?.data?.taskId) {
      // Legacy nested format
      taskId = payload.body.data.taskId;
      status = payload.body.data.state;
      outputUrl = payload.body.data.resultJson?.resultUrls?.[0] || null;
      errorMessage = payload.body.msg || null;
      console.log('Parsed legacy format - taskId:', taskId, 'status:', status);
    } else {
      console.error('Invalid payload format - no taskId found');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ... rest of matching and update logic ...
    
    const isSuccess = status === 'success';
    const updateData = {
      status: isSuccess && outputUrl ? 'done' : 'error',
      progress: isSuccess && outputUrl ? 100 : 0,
      output_url: outputUrl,
      error_message: isSuccess ? null : (errorMessage || `Generation failed: ${status}`),
    };
    
    // Update generation record...
  }
});
```

---

## Testing

After deployment, you can test with:

```bash
curl -X POST https://uqlzysrcsqcxxaxchufb.supabase.co/functions/v1/generation-callback \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test123",
    "status": "success",
    "outputs": [{"type": "image", "url": "https://example.com/image.jpg"}],
    "metadata": {"model": "test", "generation_time_ms": 100}
  }'
```

---

## Benefits

1. **Matches your n8n workflow** - Accepts the exact payload format you're sending
2. **Backward compatible** - Still accepts the old nested format if needed
3. **Clear logging** - Logs which format was detected for debugging
4. **Flexible** - Easy to add more fields from metadata if needed later

