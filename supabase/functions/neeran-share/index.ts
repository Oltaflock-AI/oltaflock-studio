// supabase/functions/neeran-share/index.ts
// Public, read-only: the client presentation for a Neeran Studio project,
// looked up by its private share token. Returns only what the board shows
// (project name/client/location, the chosen renders, their drawings and
// materials). No login; anyone with the link can view, nothing else.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let token = new URL(req.url).searchParams.get('token') ?? '';
  if (!token && req.method === 'POST') {
    try { token = (await req.json()).token ?? ''; } catch { /* ignore */ }
  }
  if (!UUID.test(token)) return json({ error: 'Not found' }, 404);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: project } = await admin
    .from('arch_projects')
    .select('id, name, client, location, presentation, updated_at')
    .eq('share_token', token)
    .maybeSingle();
  if (!project) return json({ error: 'Not found' }, 404);

  const pres = (project.presentation ?? {}) as { render_ids?: string[]; note?: string };
  const ids = (pres.render_ids ?? []).filter((id) => UUID.test(id)).slice(0, 40);

  let renders: Array<Record<string, unknown>> = [];
  let drawings: Array<Record<string, unknown>> = [];
  if (ids.length) {
    const { data } = await admin
      .from('generations')
      .select('id, output_url, created_at, model_params')
      .in('id', ids)
      .eq('status', 'done');
    const rows = (data ?? []).filter((g) => (g.model_params as Record<string, unknown>)?.project_id === project.id);
    const byId = new Map(rows.map((g) => [g.id, g]));
    renders = ids.map((id) => byId.get(id)).filter(Boolean).map((g) => {
      const mp = g!.model_params as Record<string, unknown>;
      return {
        id: g!.id,
        url: g!.output_url,
        label: (mp.label as string | undefined)?.split(' · ')[0] ?? null,
        drawing_id: mp.drawing_id ?? null,
        materials: Array.isArray(mp.materials) ? mp.materials : [],
        created_at: g!.created_at,
      };
    });
    const drawingIds = [...new Set(renders.map((r) => r.drawing_id).filter(Boolean))] as string[];
    if (drawingIds.length) {
      const { data: d } = await admin.from('arch_drawings').select('id, image_url').in('id', drawingIds).eq('project_id', project.id);
      drawings = d ?? [];
    }
  }

  return json({
    project: { name: project.name, client: project.client, location: project.location, note: pres.note ?? '', updated_at: project.updated_at },
    renders,
    drawings,
  });
});
