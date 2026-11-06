// Server-side credit accounting for generations. Edge functions only: every
// call needs a service-role client. See migration 20261106120000.
import type { ModelSpec } from './catalog/types.ts';
import { USD_PER_CREDIT, serverCredits, usdToCredits } from './catalog/pricing.ts';
import { buildInput } from './catalog/adapters.ts';
import { estimateHiggsfield } from './higgsfield.ts';

/** Any supabase-js service-role client (functions pin different versions). */
interface RpcClient {
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: any): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export interface Price {
  /** Studio credits charged against the user (1 credit = $0.005). */
  credits: number;
  /** Provider cost in USD when known. */
  usd: number | null;
  /** Higgsfield's own credit figure, recorded for the library. */
  hfCredits?: number;
}

/**
 * Authoritative price of one generation. kie.ai models use the shared catalog
 * table; Higgsfield models (catalog price 0) use Higgsfield's live estimate for
 * these exact params, converted to Studio credits.
 */
export async function priceGeneration(
  spec: ModelSpec,
  prompt: string,
  controls: Record<string, unknown>,
): Promise<{ price: Price } | { error: string; status: number }> {
  if (spec.api !== 'higgsfield') {
    const r = serverCredits(spec, controls);
    if ('error' in r) return { error: r.error, status: 400 };
    return { price: { credits: r.credits, usd: Math.round(r.credits * USD_PER_CREDIT * 1e4) / 1e4 } };
  }

  if (!spec.endpoint) return { error: `${spec.name} has no Higgsfield endpoint`, status: 400 };
  const res = await estimateHiggsfield(spec.endpoint, buildInput(spec, prompt, controls));
  if (!res.ok || !res.data) {
    return { error: `Could not price this Higgsfield job: ${res.error ?? 'no estimate'}`, status: 502 };
  }
  const d = res.data;
  if (d.type === 'description' || d.credits === undefined) {
    // Token-metered model with no up-front number; still goes through the
    // reservation (ownership, replay and daily cap) at 0 credits.
    return { price: { credits: 0, usd: null } };
  }
  const final = d.discount ?? d;
  const usd = Number(final.usd);
  if (!Number.isFinite(usd) || usd < 0) return { error: 'Higgsfield returned an invalid estimate', status: 502 };
  return { price: { credits: usdToCredits(usd), usd, hfCredits: Number(final.credits) } };
}

export type ReserveResult =
  | { ok: true; spentToday: number; dailyCap: number | null }
  | { ok: false; status: number; error: string };

/** Atomically checks the daily cap and records the charge for this generation. */
export async function reserveCredits(
  admin: RpcClient,
  args: { userId: string; generationId: string; modelId: string; backend: string; credits: number },
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc('reserve_generation_credits', {
    p_user_id: args.userId,
    p_generation_id: args.generationId,
    p_model_id: args.modelId,
    p_backend: args.backend,
    p_credits: args.credits,
  });
  if (error) {
    // Fail closed: without the ledger we cannot account for the job.
    console.error('[credits] reserve failed:', error.message);
    return { ok: false, status: 503, error: 'Credit check unavailable, try again shortly' };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; reason: string | null; spent_today: number | null; daily_cap: number | null }
    | undefined;
  if (!row) return { ok: false, status: 503, error: 'Credit check unavailable, try again shortly' };
  if (row.ok) return { ok: true, spentToday: Number(row.spent_today ?? 0), dailyCap: row.daily_cap === null ? null : Number(row.daily_cap) };

  switch (row.reason) {
    case 'daily_cap':
      return {
        ok: false, status: 402,
        error: `Daily credit limit reached: ${Number(row.spent_today)} of ${Number(row.daily_cap)} used today, this job needs ${args.credits}.`,
      };
    case 'already_submitted':
      return { ok: false, status: 409, error: 'This generation was already submitted' };
    case 'not_found':
      return { ok: false, status: 404, error: 'Generation not found or not in queued state' };
    default:
      return { ok: false, status: 400, error: `Credit check refused: ${row.reason ?? 'unknown'}` };
  }
}

/**
 * Charges (success) or releases (failure) the reservation, once. Safe to call
 * from both generation-callback and poll-tasks for the same job.
 */
export async function settleCredits(admin: RpcClient, generationId: string, success: boolean): Promise<number> {
  const { data, error } = await admin.rpc('settle_generation_charge', {
    p_generation_id: generationId,
    p_success: success,
  });
  if (error) {
    console.error(`[credits] settle failed for ${generationId}:`, error.message);
    return 0;
  }
  return Number(data ?? 0);
}
