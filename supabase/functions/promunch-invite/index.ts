import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { adminGuard, corsHeaders, inviteEmail, isRole, normalizeEmail, type Role } from './logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_KEY = Deno.env.get('PROMUNCH_RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('PROMUNCH_FROM_EMAIL') ?? 'PROMUNCH Studio <studio@promunch.in>';
const SITE_URL = Deno.env.get('PROMUNCH_SITE_URL') ?? 'https://studio.promunch.in';

type Member = { user_id: string; email: string; name: string | null; role: Role };

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function signInLink(admin: SupabaseClient, email: string): Promise<{ link: string; userId: string; existed: boolean }> {
  const options = { redirectTo: `${SITE_URL}/` };
  const invite = await admin.auth.admin.generateLink({ type: 'invite', email, options });
  if (!invite.error && invite.data.properties?.action_link && invite.data.user) {
    return { link: invite.data.properties.action_link, userId: invite.data.user.id, existed: false };
  }
  if (invite.error && invite.error.code !== 'email_exists' && invite.error.status !== 422) {
    throw new HttpError(502, invite.error.message);
  }
  // Already registered (possibly an Oltaflock Studio account in the shared project): sign-in link only.
  const magic = await admin.auth.admin.generateLink({ type: 'magiclink', email, options });
  if (magic.error || !magic.data.properties?.action_link || !magic.data.user) {
    throw new HttpError(502, magic.error?.message ?? invite.error?.message ?? 'Could not create a sign-in link');
  }
  return { link: magic.data.properties.action_link, userId: magic.data.user.id, existed: true };
}

async function sendInvite(to: string, name: string | null, link: string) {
  if (!RESEND_KEY) throw new HttpError(502, 'Email is not set up yet (PROMUNCH_RESEND_API_KEY missing)');
  const { subject, html, text } = inviteEmail({ name, link, siteUrl: SITE_URL });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    console.error('[promunch-invite] Resend error', res.status, await res.text());
    throw new HttpError(502, 'The invite was saved but the email failed. Try Resend.');
  }
}

async function getMember(admin: SupabaseClient, userId: unknown): Promise<Member> {
  if (typeof userId !== 'string') throw new HttpError(400, 'user_id is required');
  const { data, error } = await admin.from('promunch_members').select('user_id, email, name, role').eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'That person is not on the team');
  return data as Member;
}

async function adminCount(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin.from('promunch_members').select('user_id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw new HttpError(500, error.message);
  return count ?? 0;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'Sign in first');
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new HttpError(401, 'Sign in first');

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: me, error: meError } = await admin.from('promunch_members').select('role').eq('user_id', user.id).maybeSingle();
    if (meError) throw new HttpError(500, 'Could not check your access');
    if (me?.role !== 'admin') throw new HttpError(403, 'Only PROMUNCH admins can manage the team');

    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};

    switch (body.action) {
      case 'invite': {
        const email = normalizeEmail(body.email);
        if (!email) throw new HttpError(400, 'Use a @promunch.in or @vippysoya.com address');
        if (!isRole(body.role)) throw new HttpError(400, 'Pick a role');
        const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null;
        const { link, userId, existed } = await signInLink(admin, email);
        const { data: existing, error: lookupError } = await admin.from('promunch_members').select('user_id').eq('user_id', userId).maybeSingle();
        if (lookupError) throw new HttpError(500, lookupError.message);
        if (existing) throw new HttpError(409, 'Already on the team. Use Resend or change their role.');
        const now = new Date().toISOString();
        const { error } = await admin.from('promunch_members').insert(
          { user_id: userId, email, name, role: body.role, invited_by: user.id, last_invite_at: now },
        );
        if (error) throw new HttpError(500, error.message);
        await sendInvite(email, name, link);
        return json({ status: existed ? 'added_existing' : 'invited', user_id: userId });
      }
      case 'resend': {
        const m = await getMember(admin, body.user_id);
        const { link } = await signInLink(admin, m.email);
        const { error: touchError } = await admin.from('promunch_members').update({ last_invite_at: new Date().toISOString() }).eq('user_id', m.user_id);
        if (touchError) throw new HttpError(500, touchError.message);
        await sendInvite(m.email, m.name, link);
        return json({ status: 'resent' });
      }
      case 'set_role': {
        if (!isRole(body.role)) throw new HttpError(400, 'Pick a role');
        const m = await getMember(admin, body.user_id);
        const problem = adminGuard({ action: 'set_role', targetId: m.user_id, callerId: user.id, targetRole: m.role, newRole: body.role, adminCount: await adminCount(admin) });
        if (problem) throw new HttpError(409, problem);
        const { error } = await admin.from('promunch_members').update({ role: body.role }).eq('user_id', m.user_id);
        if (error) throw new HttpError(500, error.message);
        return json({ status: 'updated' });
      }
      case 'remove': {
        const m = await getMember(admin, body.user_id);
        const problem = adminGuard({ action: 'remove', targetId: m.user_id, callerId: user.id, targetRole: m.role, adminCount: await adminCount(admin) });
        if (problem) throw new HttpError(409, problem);
        // Membership only. The auth account is shared with Oltaflock Studio and is never deleted here.
        const { error } = await admin.from('promunch_members').delete().eq('user_id', m.user_id);
        if (error) throw new HttpError(500, error.message);
        return json({ status: 'removed' });
      }
      default:
        throw new HttpError(400, 'Unknown action');
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('[promunch-invite]', e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
