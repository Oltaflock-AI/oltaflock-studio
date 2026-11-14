// supabase/functions/neeran-team/index.ts
// Neeran Studio team management, owner only:
//   add    { name, email }  → creates the login (temporary password) and adds them to the team
//   reset  { user_id }      → new temporary password
//   remove { user_id }      → takes them off the team and blocks their login
// The owner shares the temporary password themselves (e.g. on WhatsApp).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const DAILY_CAP = 1000; // Studio credits per day for each member (1 credit = $0.005)

function tempPassword(): string {
  const words = ['Render', 'Studio', 'Marble', 'Teak', 'Design', 'Space'];
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const n = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${words[bytes[0] % words.length]}-${n.slice(0, 4)}-${n.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await userClient.auth.getUser();
  const caller = auth?.user;
  if (!caller) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: team } = await admin.from('arch_teams').select('id, name').eq('owner_id', caller.id).maybeSingle();
  if (!team) return json({ error: 'Only the studio owner can manage the team' }, 403);

  let body: { action?: string; name?: string; email?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    if (body.action === 'add') {
      const email = (body.email ?? '').trim().toLowerCase();
      const name = (body.name ?? '').trim().slice(0, 60);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address' }, 400);
      if (!name) return json({ error: 'Enter their name' }, 400);

      const password = tempPassword();

      // An existing account is only reused when it was removed from a studio
      // earlier: its login is blocked and it belongs to no studio. Any other
      // existing account (an Oltaflock login, another studio's member, the
      // owner) is refused, so nobody's password can be taken over from here.
      const { data: existing } = await admin.from('profiles').select('user_id').eq('email', email).maybeSingle();
      let userId = existing?.user_id as string | undefined;
      if (userId) {
        const [{ data: found }, { data: memberships }] = await Promise.all([
          admin.auth.admin.getUserById(userId),
          admin.from('arch_team_members').select('team_id').eq('user_id', userId),
        ]);
        const bannedUntil = found?.user?.banned_until ? new Date(found.user.banned_until).getTime() : 0;
        const wasRemoved = bannedUntil > Date.now() && (memberships ?? []).length === 0;
        if (!wasRemoved) return json({ error: 'That email already has an account. Ask Khush to link it.' }, 409);
      }
      await admin.from('arch_allowed_emails').upsert({ email });
      if (userId) {
        const { error } = await admin.auth.admin.updateUserById(userId, { password, ban_duration: 'none' });
        if (error) throw error;
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: name },
        });
        if (error) throw error;
        userId = data.user.id;
      }

      const { error: memberError } = await admin.from('arch_team_members').upsert({
        team_id: team.id, user_id: userId, role: 'member', name, email,
      });
      if (memberError) throw memberError;
      await admin.from('user_spend_limits').upsert({
        user_id: userId, daily_credit_cap: DAILY_CAP, note: `${team.name} team member`,
      });
      return json({ user_id: userId, email, name, password });
    }

    if (body.action === 'reset' || body.action === 'remove') {
      const userId = body.user_id ?? '';
      if (userId === caller.id) return json({ error: 'Use “Change password” for your own account' }, 400);
      const { data: member } = await admin.from('arch_team_members')
        .select('user_id, email, name').eq('team_id', team.id).eq('user_id', userId).maybeSingle();
      if (!member) return json({ error: 'Not a member of your team' }, 404);

      if (body.action === 'reset') {
        const password = tempPassword();
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return json({ user_id: userId, email: member.email, name: member.name, password });
      }

      // Remove: block the login (their past renders stay in the shared projects).
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (error) throw error;
      await admin.from('arch_team_members').delete().eq('team_id', team.id).eq('user_id', userId);
      return json({ removed: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`neeran-team ${ref}:`, err);
    const msg = err instanceof Error ? err.message : '';
    if (/already been registered|already exists/i.test(msg)) return json({ error: 'That email already has an account. Ask Khush to link it.' }, 409);
    return json({ error: `Something went wrong (ref ${ref})` }, 500);
  }
});
