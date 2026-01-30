import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BALANCE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/remainder-credits';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxying balance check to:', BALANCE_WEBHOOK_URL);
    
    // Try GET request first
    const response = await fetch(BALANCE_WEBHOOK_URL, {
      method: 'GET',
    });

    console.log('Balance webhook response status:', response.status);
    console.log('Balance webhook response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Balance webhook response body:', data);

    // If response is empty, return a fallback
    if (!data || data.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Empty response from balance webhook', status: response.status }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking balance:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to check balance', details: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
