// Higgsfield API client (https://docs.higgsfield.ai). Server-side only: the key
// grants access to the account's credits.
//
// Credentials: set HF_API_KEY_ID + HF_API_KEY_SECRET, or HF_CREDENTIALS as "id:secret".

export const HF_BASE = 'https://api.higgsfield.ai';

export function higgsfieldAuth(): string | null {
  const combined = Deno.env.get('HF_CREDENTIALS');
  if (combined?.includes(':')) return `Key ${combined}`;
  const id = Deno.env.get('HF_API_KEY_ID');
  const secret = Deno.env.get('HF_API_KEY_SECRET');
  return id && secret ? `Key ${id}:${secret}` : null;
}

export interface HiggsfieldResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<HiggsfieldResult<T>> {
  const auth = higgsfieldAuth();
  if (!auth) return { ok: false, status: 0, data: null, error: 'Higgsfield API key is not configured' };

  const res = await fetch(`${HF_BASE}${path}`, {
    method,
    headers: { Authorization: auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : text.slice(0, 200);
    return { ok: false, status: res.status, data: null, error: `Higgsfield ${res.status}: ${msg || res.statusText}` };
  }
  return { ok: true, status: res.status, data: data as T };
}

export interface HiggsfieldSubmit {
  status: string;
  request_id: string;
  status_url?: string;
}

/** Submits a generation; Higgsfield POSTs the terminal result to `webhookUrl`. */
export function submitHiggsfield(endpoint: string, input: Record<string, unknown>, webhookUrl?: string) {
  const qs = webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : '';
  return call<HiggsfieldSubmit>('POST', `/${endpoint}${qs}`, input);
}

export function higgsfieldStatus(requestId: string) {
  return call<Record<string, unknown>>('GET', `/requests/${encodeURIComponent(requestId)}/status`);
}

/** Price for these exact params, e.g. { credits: "1.500", usd: "0.094" }. */
export function estimateHiggsfield(endpoint: string, input: Record<string, unknown>) {
  return call<{ credits: string; usd: string }>('POST', `/estimate/${endpoint}`, input);
}
