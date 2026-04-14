// Fetch remaining credits from Kie.ai API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!KIE_AI_API_KEY) {
      return Response.json(
        { error: 'KIE_AI_API_KEY not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      headers: { 'Authorization': `Bearer ${KIE_AI_API_KEY}` },
    });

    const data = await res.json();

    if (data.code !== 200) {
      return Response.json(
        { error: data.msg || 'Failed to fetch credits' },
        { status: 502, headers: corsHeaders }
      );
    }

    return Response.json(
      { balance: String(data.data) },
      { headers: corsHeaders }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: msg },
      { status: 500, headers: corsHeaders }
    );
  }
});
