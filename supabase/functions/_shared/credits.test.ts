// Run: cd supabase/functions && deno test --node-modules-dir=none _shared/credits.test.ts
import { MODEL_CATALOG, activeSpec } from './catalog/index.ts';
import { serverCredits, specCredits, usdToCredits } from './catalog/pricing.ts';
import { priceGeneration, reserveCredits } from './credits.ts';
import type { ModelSpec } from './catalog/types.ts';

function assertEq(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
const assert = (cond: unknown, msg: string) => { if (!cond) throw new Error(msg); };

const tieredPerSecond = MODEL_CATALOG.find((s) => !('credits' in s.pricing) && s.pricing.perSecond && s.api !== 'higgsfield')!;
const tieredEnum = MODEL_CATALOG.find((s) => !('credits' in s.pricing) && !s.pricing.perSecond && s.api !== 'higgsfield')!;

Deno.test('server price matches what the browser shows for every model at its defaults', () => {
  for (const spec of MODEL_CATALOG) {
    if (spec.api === 'higgsfield') continue;
    const r = serverCredits(spec, {});
    assert(!('error' in r), `${spec.id}: ${'error' in r ? r.error : ''}`);
    assertEq((r as { credits: number }).credits, specCredits(spec, {}), spec.id);
  }
});

Deno.test('server price matches the browser for every priced option', () => {
  for (const spec of MODEL_CATALOG) {
    const p = spec.pricing;
    if (spec.api === 'higgsfield' || 'credits' in p) continue;
    const keys = Array.isArray(p.by) ? p.by : [p.by];
    for (const tableKey of Object.keys(p.table)) {
      const parts = tableKey.split('|');
      const controls: Record<string, unknown> = {};
      keys.forEach((k, i) => {
        const field = spec.fields.find((f) => f.key === k);
        const opt = field?.options?.find((o) => String(o.value) === parts[i]);
        controls[k] = field?.type === 'boolean' ? parts[i] === 'true' : (opt?.value ?? parts[i]);
      });
      const r = serverCredits(spec, controls);
      if ('error' in r) continue; // table row for an option the UI no longer offers
      assertEq(r.credits, specCredits(spec, controls), `${spec.id} ${tableKey}`);
    }
  }
});

Deno.test('a client-sent cost_credits never changes the price', async () => {
  const spec = tieredPerSecond;
  const honest = serverCredits(spec, {});
  const r = await priceGeneration(spec, 'a cat', { cost_credits: 0 });
  assert('price' in r, 'priced');
  assertEq((r as { price: { credits: number } }).price.credits, (honest as { credits: number }).credits);
  assert((honest as { credits: number }).credits > 0, 'test model should cost something');
});

Deno.test('values that would dodge the price table are refused', () => {
  const sec = tieredPerSecond.pricing as { perSecond: string };
  for (const bad of ['abc', 0, -5, 99999, true]) {
    const r = serverCredits(tieredPerSecond, { [sec.perSecond]: bad });
    assert('error' in r, `duration ${String(bad)} should be refused for ${tieredPerSecond.id}`);
  }
  const by = (tieredEnum.pricing as { by: string | string[] }).by;
  const enumKey = Array.isArray(by) ? by[0] : by;
  const r = serverCredits(tieredEnum, { [enumKey]: 'not-a-real-option' });
  assert('error' in r, `enum value should be refused for ${tieredEnum.id}`);
});

Deno.test('a combination missing from the table charges the top tier, not the cheapest', () => {
  const spec: ModelSpec = {
    ...tieredEnum,
    fields: [{ key: 'q', label: 'Quality', type: 'enum', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], default: 'a' }],
    pricing: { by: 'q', table: { a: 2, c: 9 } },
  };
  assertEq(serverCredits(spec, { q: 'b' }), { credits: 9 });
});

Deno.test('usdToCredits rounds up to 0.1 credit', () => {
  assertEq(usdToCredits(0.02), 4);
  assertEq(usdToCredits(0.045), 9);
  assertEq(usdToCredits(0.07), 14);
  assertEq(usdToCredits(0.0051), 1.1);
  assertEq(usdToCredits(0), 0);
});

Deno.test('reserveCredits maps the RPC result and fails closed', async () => {
  const client = (data: unknown, error: { message: string } | null = null) => ({
    rpc: () => Promise.resolve({ data, error }),
  });
  const args = { userId: 'u', generationId: 'g', modelId: 'm', backend: 'kie', credits: 5 };
  assertEq(await reserveCredits(client([{ ok: true, reason: null, spent_today: 5, daily_cap: null }]), args),
    { ok: true, spentToday: 5, dailyCap: null });
  const cap = await reserveCredits(client([{ ok: false, reason: 'daily_cap', spent_today: 98, daily_cap: 100 }]), args);
  assert(!cap.ok && cap.status === 402, 'daily cap is 402');
  const dup = await reserveCredits(client([{ ok: false, reason: 'already_submitted', spent_today: 0, daily_cap: null }]), args);
  assert(!dup.ok && dup.status === 409, 'replay is 409');
  const down = await reserveCredits(client(null, { message: 'function does not exist' }), args);
  assert(!down.ok && down.status === 503, 'missing RPC fails closed');
});

Deno.test('the default MCP image model is priced', () => {
  const spec = activeSpec('nano-banana-2.1-edit');
  if (!spec) return; // catalog changed
  const r = serverCredits(spec, {});
  assert('credits' in r && r.credits > 0, 'nano banana edit costs credits');
});

Deno.test('Higgsfield jobs are priced from the live estimate, not skipped', async () => {
  const hf = MODEL_CATALOG.find((s) => s.api === 'higgsfield' && s.endpoint)!;
  const realFetch = globalThis.fetch;
  const prev = Deno.env.get('HF_CREDENTIALS');
  Deno.env.set('HF_CREDENTIALS', 'test-id:test-secret');
  let reply: { status: number; body: unknown } = { status: 200, body: {} };
  globalThis.fetch = ((input: string | URL | Request) => {
    assert(String(input).includes('/estimate/'), 'only the estimate endpoint is called');
    return Promise.resolve(new Response(JSON.stringify(reply.body), { status: reply.status }));
  }) as typeof fetch;
  try {
    reply = { status: 200, body: { type: 'estimate', credits: '12', usd: '0.60' } };
    let r = await priceGeneration(hf, 'a cat', { cost_credits: 0 });
    assertEq((r as { price: unknown }).price, { credits: 120, usd: 0.6, hfCredits: 12 }, 'estimate');

    reply = { status: 200, body: { type: 'estimate', credits: '12', usd: '0.60', discount: { percentage: '50', credits: '6', usd: '0.30' } } };
    r = await priceGeneration(hf, 'a cat', {});
    assertEq((r as { price: unknown }).price, { credits: 60, usd: 0.3, hfCredits: 6 }, 'discounted');

    reply = { status: 200, body: { type: 'description', pricing_description: 'per token' } };
    r = await priceGeneration(hf, 'a cat', {});
    assertEq((r as { price: unknown }).price, { credits: 0, usd: null }, 'metered');

    reply = { status: 500, body: { detail: 'down' } };
    r = await priceGeneration(hf, 'a cat', {});
    assert('error' in r && r.status === 502, 'estimate failure refuses the job');
  } finally {
    globalThis.fetch = realFetch;
    if (prev === undefined) Deno.env.delete('HF_CREDENTIALS'); else Deno.env.set('HF_CREDENTIALS', prev);
  }
});
