import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallbackPayload {
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

Deno.serve(async (req) => {
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

  try {
    const payload: CallbackPayload = await req.json();
    
    console.log('Received callback payload:', JSON.stringify(payload, null, 2));

    // Validate payload structure
    if (!payload.body?.data?.taskId) {
      console.error('Missing taskId in payload');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, state, resultJson, model } = payload.body.data;
    const message = payload.body.msg;

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
    const isSuccess = state === 'success' && payload.body.code === 200;
    const outputUrl = resultJson?.resultUrls?.[0] || null;
    
    const updateData: Record<string, unknown> = {
      status: isSuccess && outputUrl ? 'done' : 'error',
      progress: isSuccess && outputUrl ? 100 : 0,
      output_url: outputUrl,
      error_message: isSuccess ? null : (message || `Generation failed with state: ${state}`),
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
