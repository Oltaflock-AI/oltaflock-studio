// supabase/functions/download/index.ts
// Streams a generation's output back to the browser so it can be saved as a
// file, for provider hosts that don't send CORS headers.
//
//   POST { generationId } → the file's bytes (Content-Type from the source)
//
// The URL is read from the caller's own generation row (RLS), never taken from
// the request, so this can't be used to fetch arbitrary URLs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'content-type, content-length',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS });

  const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return Response.json({ error: 'Auth failed' }, { status: 401, headers: CORS });

  const { generationId } = await req.json().catch(() => ({}));
  if (typeof generationId !== 'string') {
    return Response.json({ error: 'generationId is required' }, { status: 400, headers: CORS });
  }

  const { data: row } = await userClient
    .from('generations')
    .select('output_url')
    .eq('id', generationId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!row?.output_url) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });

  const upstream = await fetch(row.output_url);
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `Source returned ${upstream.status}` }, { status: 502, headers: CORS });
  }
  const headers = new Headers(CORS);
  headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { headers });
});
