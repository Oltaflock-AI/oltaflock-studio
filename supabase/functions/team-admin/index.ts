// supabase/functions/team-admin/index.ts
// PROMUNCH Studio team management, for admins only.
//   { action: 'invite', email, role? }   sends a Supabase invite email
//   { action: 'remove', user_id }        signs the person out for good (ban) and
//                                        drops them from the team; their work stays
//   { action: 'set_role', user_id, role } makes someone an admin or a member

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'member'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: me } = await admin.from('team_members').select('role').eq('user_id', user.id).maybeSingle();
    if (me?.role !== 'admin') return json({ error: 'Only team admins can do this' }, 403);

    const body = await req.json();
    const action = String(body.action ?? '');

    if (action === 'invite') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const role = ROLES.includes(body.role) ? body.role : 'member';
      if (!EMAIL.test(email)) return json({ error: 'Enter a valid email address' }, 400);
      const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || undefined;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: siteUrl,
        data: { invited_by: user.id },
      });
      if (error) {
        const taken = /already been registered|already exists/i.test(error.message);
        return json({ error: taken ? `${email} is already on the team` : error.message }, taken ? 409 : 400);
      }
      if (role === 'admin' && data.user) {
        await admin.from('team_members').upsert({ user_id: data.user.id, role: 'admin', invited_by: user.id });
      }
      return json({ ok: true, user_id: data.user?.id ?? null });
    }

    const target = String(body.user_id ?? '');
    if (!target) return json({ error: 'user_id is required' }, 400);

    if (action === 'set_role') {
      const role = String(body.role ?? '');
      if (!ROLES.includes(role)) return json({ error: 'role must be admin or member' }, 400);
      if (role === 'member' && target === user.id) {
        const { count } = await admin.from('team_members').select('user_id', { count: 'exact', head: true }).eq('role', 'admin');
        if ((count ?? 0) <= 1) return json({ error: 'The team needs at least one admin' }, 400);
      }
      const { error } = await admin.from('team_members').update({ role }).eq('user_id', target);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'remove') {
      if (target === user.id) return json({ error: "You can't remove yourself" }, 400);
      const { error: banError } = await admin.auth.admin.updateUserById(target, { ban_duration: '876000h' });
      if (banError) return json({ error: banError.message }, 400);
      await admin.from('team_members').delete().eq('user_id', target);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('team-admin error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
