// logic_test.ts
import { assertEquals, assert, assertStringIncludes } from 'jsr:@std/assert@1';
import { normalizeEmail, isRole, corsHeaders, adminGuard, inviteEmail } from './logic.ts';

Deno.test('normalizeEmail accepts team domains only', () => {
  assertEquals(normalizeEmail('  Ajay@PROMUNCH.in '), 'ajay@promunch.in');
  assertEquals(normalizeEmail('k@vippysoya.com'), 'k@vippysoya.com');
  assertEquals(normalizeEmail('x@oltaflock.ai'), null);
  assertEquals(normalizeEmail('x@notpromunch.in'), null);
  assertEquals(normalizeEmail('no-at-sign'), null);
  assertEquals(normalizeEmail(42), null);
});

Deno.test('isRole', () => {
  assert(isRole('marketplace'));
  assert(!isRole('owner'));
});

Deno.test('corsHeaders echoes allowed origins only', () => {
  assertEquals(corsHeaders('https://studio.promunch.in')['Access-Control-Allow-Origin'], 'https://studio.promunch.in');
  assertEquals(corsHeaders('http://localhost:8080')['Access-Control-Allow-Origin'], 'http://localhost:8080');
  assertEquals(corsHeaders('https://evil.example')['Access-Control-Allow-Origin'], 'https://studio.promunch.in');
  assertEquals(corsHeaders(null)['Access-Control-Allow-Origin'], 'https://studio.promunch.in');
});

Deno.test('adminGuard protects the last admin and yourself', () => {
  const base = { callerId: 'me', targetId: 'other', targetRole: 'admin' as const };
  assertEquals(adminGuard({ ...base, action: 'remove', adminCount: 1 }), 'The team needs at least one admin');
  assertEquals(adminGuard({ ...base, action: 'set_role', newRole: 'content', adminCount: 1 }), 'The team needs at least one admin');
  assertEquals(adminGuard({ ...base, action: 'remove', adminCount: 2 }), null);
  assertEquals(adminGuard({ ...base, action: 'set_role', newRole: 'admin', adminCount: 1 }), null);
  assertEquals(adminGuard({ ...base, targetId: 'me', action: 'remove', adminCount: 3 }), "You can't remove yourself");
  assertEquals(adminGuard({ callerId: 'me', targetId: 'x', targetRole: 'content', action: 'remove', adminCount: 1 }), null);
});

Deno.test('inviteEmail follows the copy rules', () => {
  const e = inviteEmail({ name: 'Ajay', link: 'https://x.supabase.co/auth/v1/verify?token=abc', siteUrl: 'https://studio.promunch.in' });
  for (const part of [e.subject, e.html, e.text]) {
    assert(!part.includes('—'), 'no em dashes');
    assert(!/oltaflock/i.test(part), 'no Oltaflock');
    assert(!/Promunch|ProMunch/.test(part.replace(/PROMUNCH/g, '')), 'PROMUNCH in caps');
  }
  assertStringIncludes(e.html, 'https://x.supabase.co/auth/v1/verify?token=abc');
  assertStringIncludes(e.html, 'https://studio.promunch.in/email/promunch-logo-white.png');
  assertStringIncludes(e.text, 'Hi Ajay');
  assertStringIncludes(e.text, 'Continue with Google');
});

Deno.test('inviteEmail escapes the name', () => {
  const e = inviteEmail({ name: '<b>x</b>', link: 'https://l', siteUrl: 'https://s' });
  assert(!e.html.includes('<b>x</b>'));
});
