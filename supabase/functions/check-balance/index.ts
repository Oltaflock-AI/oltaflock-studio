// Returns the live kie.ai credit balance to signed-in users.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchKieCredits } from '../_shared/kie-credits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const credits = await fetchKieCredits();
  if (credits === null) {
    return Response.json({ error: 'Could not read kie.ai balance' }, { status: 502, headers: corsHeaders });
  }

  return Response.json({ balance: credits }, { headers: corsHeaders });
});
