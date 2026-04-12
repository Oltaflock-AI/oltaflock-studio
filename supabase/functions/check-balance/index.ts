import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BALANCE_WEBHOOK_URL = Deno.env.get('BALANCE_WEBHOOK_URL') || 'https://directive-ai.app.n8n.cloud/webhook/remainder-credits';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxying balance check to:', BALANCE_WEBHOOK_URL);

    const response = await fetch(BALANCE_WEBHOOK_URL, {
      method: 'GET',
    });

    console.log('Balance webhook response status:', response.status);

    const data = await response.text();
    console.log('Balance webhook response body:', data);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Balance webhook returned ${response.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If response is empty, return proper error
    if (!data || data.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Empty response from balance webhook' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Wrap the text response in a proper JSON object
    return new Response(
      JSON.stringify({ balance: data.trim() }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking balance:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to check balance', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
