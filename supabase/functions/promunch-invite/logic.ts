// Pure helpers for promunch-invite. No network, no Supabase: tested with `deno test`.

export const TEAM_DOMAINS = ['promunch.in', 'vippysoya.com'] as const;
export const ROLES = ['admin', 'marketplace', 'content', 'member'] as const;
export type Role = (typeof ROLES)[number];

const ALLOWED_ORIGINS = ['https://studio.promunch.in', 'https://promunch-studio.vercel.app', 'http://localhost:8080'];

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  return (TEAM_DOMAINS as readonly string[]).includes(email.slice(at + 1)) ? email : null;
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function adminGuard(opts: {
  action: 'set_role' | 'remove';
  targetId: string;
  callerId: string;
  targetRole: Role;
  newRole?: Role;
  adminCount: number;
}): string | null {
  if (opts.action === 'remove' && opts.targetId === opts.callerId) return "You can't remove yourself";
  const losesAdmin = opts.targetRole === 'admin' && (opts.action === 'remove' || opts.newRole !== 'admin');
  if (losesAdmin && opts.adminCount <= 1) return 'The team needs at least one admin';
  return null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inviteEmail(opts: { name: string | null; link: string; siteUrl: string }) {
  const hi = opts.name?.trim() ? `Hi ${opts.name.trim()},` : 'Hi,';
  const subject = "You're in. PROMUNCH Studio is ready.";
  const text = [
    hi,
    '',
    "You've been invited to PROMUNCH Studio, the team's image and video studio.",
    `Open it here (this link works once and expires in 24 hours): ${opts.link}`,
    '',
    'After this, sign in with Continue with Google.',
  ].join('\n');
  const logo = `${opts.siteUrl.replace(/\/$/, '')}/email/promunch-logo-white.png`;
  const html = `<!doctype html><html><body style="margin:0;background:#F4F1EA;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;font-family:Assistant,'Segoe UI',Arial,sans-serif;color:#1A1714;">
  <div style="background:#AF272F;border-radius:20px 20px 0 0;padding:28px 32px;">
    <img src="${logo}" alt="PROMUNCH" width="160" style="display:block;border:0;">
  </div>
  <div style="background:#FFFFFF;border:1px solid #E7E2D8;border-top:0;border-radius:0 0 20px 20px;padding:32px;">
    <p style="margin:0 0 6px;font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8E1F26;">&#9733; PROMUNCH STUDIO</p>
    <h1 style="margin:0 0 16px;font-family:'Archivo Black','Arial Black',Arial,sans-serif;font-size:28px;line-height:1.1;text-transform:uppercase;color:#1A1714;">You're in.</h1>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">${escapeHtml(hi)}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">You've been invited to PROMUNCH Studio, the team's image and video studio.</p>
    <a href="${opts.link}" style="display:inline-block;background:#AF272F;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:14px;">Open PROMUNCH Studio</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5C554E;">This link works once and expires in 24 hours. After this, sign in with Continue with Google.</p>
  </div>
</div></body></html>`;
  return { subject, html, text };
}
