import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://directive-ai.app.n8n.cloud',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  };
}

// New flat format from n8n
interface NewCallbackPayload {
  taskId: string;
  status: string;
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

// Legacy nested format (kept for backward compatibility)
interface LegacyCallbackPayload {
  body: {
    code: number;
    data: {
      taskId: string;
      state: string;
      completeTime?: number;
      createTime?: number;
      costTime?: number;
      model?: string;
      resultJson?: {
        resultUrls?: string[];
      };
    };
    msg?: string;
  };
}

type CallbackPayload = NewCallbackPayload | LegacyCallbackPayload;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate webhook secret
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (webhookSecret) {
    const providedSecret = req.headers.get('x-webhook-secret');
    if (providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const payload = await req.json() as CallbackPayload;
    
    console.log('Received callback payload:', JSON.stringify(payload, null, 2));

    // Parse payload - support both new flat format and legacy nested format
    let taskId: string;
    let status: string;
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    // Check for new flat format first (from n8n)
    if ('taskId' in payload && payload.taskId) {
      const newPayload = payload as NewCallbackPayload;
      taskId = newPayload.taskId;
      status = newPayload.status;
      outputUrl = newPayload.outputs?.[0]?.url || null;
      console.log('Parsed new format - taskId:', taskId, 'status:', status, 'outputUrl:', outputUrl);
    }
    // Fall back to legacy nested format
    else if ('body' in payload && payload.body?.data?.taskId) {
      const legacyPayload = payload as LegacyCallbackPayload;
      taskId = legacyPayload.body.data.taskId;
      status = legacyPayload.body.data.state;
      outputUrl = legacyPayload.body.data.resultJson?.resultUrls?.[0] || null;
      errorMessage = legacyPayload.body.msg || null;
      console.log('Parsed legacy format - taskId:', taskId, 'status:', status);
    }
    // Neither format matched
    else {
      console.error('Invalid payload format - no taskId found');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status value
    const validStatuses = ['success', 'error', 'fail', 'failed', 'completed', 'running', 'queued'];
    if (!validStatuses.includes(status)) {
      console.error('Invalid status value:', status);
      return new Response(
        JSON.stringify({ error: `Invalid status: ${status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean outputUrl - treat empty strings as null
    if (outputUrl && outputUrl.trim() === '') {
      outputUrl = null;
    }
    if (outputUrl) {
      try {
        new URL(outputUrl);
      } catch {
        console.error('Invalid output URL, ignoring:', outputUrl);
        outputUrl = null;
      }
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      console.log('Found generation by external_task_id:', generation.id);
    } else {
      // Fallback to request_id for backward compatibility
      const { data: byRequest } = await supabase
        .from('generations')
        .select('id, status, request_id, external_task_id')
        .eq('request_id', taskId)
        .maybeSingle();
      
      if (byRequest) {
        generation = byRequest;
        console.log('Found generation by request_id (fallback):', generation.id);
      }
    }

    if (!generation) {
      console.error('Generation not found for taskId:', taskId);
      return new Response(
        JSON.stringify({ 
          error: 'Generation not found', 
          taskId,
          searchedBy: ['external_task_id', 'request_id']
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found generation:', generation.id, 'current status:', generation.status);

    // Determine new status and output URL
    const isSuccess = status === 'success' || status === 'completed';
    
    const updateData: Record<string, unknown> = {
      status: isSuccess && outputUrl ? 'done' : 'error',
      progress: isSuccess && outputUrl ? 100 : 0,
      output_url: outputUrl,
      error_message: isSuccess ? null : (errorMessage || `Generation failed with status: ${status}`),
    };

    // Update the generation record
    const { data: updated, error: updateError } = await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generation.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update generation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update generation', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated generation:', updated.id, 'to status:', updated.status);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generationId: updated.id,
        status: updated.status,
        outputUrl: updated.output_url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Callback processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
