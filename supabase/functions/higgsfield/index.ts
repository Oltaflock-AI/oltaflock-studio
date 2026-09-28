// Studio helper for the Higgsfield backend:
//   { action: 'status' }                              → { configured }
//   { action: 'estimate', model, prompt, controls }   → { credits, usd }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSpec } from '../_shared/catalog/index.ts';
import { buildInput } from '../_shared/catalog/adapters.ts';
import { estimateHiggsfield, higgsfieldAuth } from '../_shared/higgsfield.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  const userClient = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return json({ error: 'Auth failed' }, 401);

  const { action, model, prompt = '', controls = {} } = await req.json().catch(() => ({}));
  const configured = !!higgsfieldAuth();

  if (action === 'status') return json({ configured });

  if (action === 'estimate') {
    if (!configured) return json({ error: 'not_configured' }, 503);
    const spec = getSpec(model);
    if (!spec || spec.api !== 'higgsfield' || !spec.endpoint) return json({ error: `Not a Higgsfield model: ${model}` }, 400);
    // The estimate validates params like a real submit; a placeholder prompt keeps
    // it working while the user is still typing.
    const input = buildInput(spec, prompt.trim() || (spec.noPrompt ? '' : 'estimate'), controls);
    const res = await estimateHiggsfield(spec.endpoint, input);
    if (!res.ok || !res.data) return json({ error: res.error }, 502);
    return json({ credits: Number(res.data.credits), usd: Number(res.data.usd) });
  }

  return json({ error: 'Unknown action' }, 400);
});
