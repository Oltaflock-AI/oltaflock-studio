/**
 * oltaflock-storage — R2 gateway for Oltaflock Studio.
 *
 * Reads are NOT served here: the bucket is exposed on PUBLIC_BASE_URL (R2 custom
 * domain), which is cached and has no egress fees. This Worker only handles writes.
 *
 * Object keys: {kind}/{userId}/{name}
 *   uploads      user reference media (client-writable)
 *   avatars      profile pictures    (client-writable)
 *   generations  model outputs       (ingest-only, written server-to-server)
 *
 * Routes
 *   PUT    /o/:kind/:userId/:name   upload; Supabase JWT required, userId must be the caller
 *   DELETE /o/:kind/:userId/:name   delete one object; same rules
 *   DELETE /u/me                    delete everything the caller owns (account deletion)
 *   POST   /ingest                  copy a remote URL into R2; x-ingest-secret required
 */

interface Env {
  BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  PUBLIC_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  INGEST_SECRET: string;
}

type ClientKind = 'uploads' | 'avatars';
const ALL_KINDS = ['uploads', 'avatars', 'generations'] as const;

const MB = 1024 * 1024;
// Workers cap request bodies at 100MB on Free/Pro; stay under it.
const CLIENT_RULES: Record<ClientKind, { maxBytes: number; types: string[]; cache: string }> = {
  uploads: {
    maxBytes: 95 * MB,
    types: ['image/', 'video/', 'audio/'],
    cache: 'public, max-age=31536000, immutable', // names are unique per upload
  },
  avatars: {
    maxBytes: 5 * MB,
    types: ['image/'],
    cache: 'public, max-age=3600', // fixed key, overwritten on change
  },
};
const MAX_INGEST_BYTES = 500 * MB;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error('[storage] unhandled', err);
      return json({ error: 'Internal error' }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);

  if (request.method === 'POST' && url.pathname === '/ingest') return ingest(request, env);

  if (request.method === 'DELETE' && url.pathname === '/u/me') {
    const user = await authenticate(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    return purgeUser(user.id, env);
  }

  if (parts[0] === 'o' && parts.length === 4) {
    const [, kind, userId, name] = parts;
    if (kind !== 'uploads' && kind !== 'avatars') return json({ error: 'Unknown kind' }, 400);
    if (!NAME_RE.test(name) || name.includes('..')) return json({ error: 'Invalid name' }, 400);

    const user = await authenticate(request, env);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.id !== userId) return json({ error: 'Forbidden' }, 403);

    const key = `${kind}/${userId}/${name}`;
    if (request.method === 'PUT') return putObject(request, env, kind, key);
    if (request.method === 'DELETE') {
      await env.BUCKET.delete(key);
      return json({ ok: true });
    }
  }

  return json({ error: 'Not found' }, 404);
}

async function putObject(request: Request, env: Env, kind: ClientKind, key: string): Promise<Response> {
  const rules = CLIENT_RULES[kind];
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!rules.types.some((p) => contentType.startsWith(p))) {
    return json({ error: `Only ${rules.types.join(', ')} files allowed` }, 415);
  }

  // R2 needs a known length to stream; browsers always send Content-Length for File/Blob bodies.
  const length = Number(request.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) return json({ error: 'Content-Length required' }, 411);
  if (length > rules.maxBytes) return json({ error: `File exceeds ${rules.maxBytes / MB}MB` }, 413);
  if (!request.body) return json({ error: 'Empty body' }, 400);

  await env.BUCKET.put(key, request.body, {
    httpMetadata: { contentType, cacheControl: rules.cache },
  });
  return json({ url: publicUrl(env, key), key });
}

async function ingest(request: Request, env: Env): Promise<Response> {
  if (!env.INGEST_SECRET || request.headers.get('x-ingest-secret') !== env.INGEST_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { url, userId, generationId } = (await request.json().catch(() => ({}))) as {
    url?: string;
    userId?: string;
    generationId?: string;
  };
  if (!url || !userId || !generationId || !UUID_RE.test(userId) || !UUID_RE.test(generationId)) {
    return json({ error: 'url, userId and generationId (uuid) required' }, 400);
  }
  let source: URL;
  try {
    source = new URL(url);
  } catch {
    return json({ error: 'Invalid url' }, 400);
  }
  if (source.protocol !== 'https:') return json({ error: 'https only' }, 400);

  const upstream = await fetch(source.toString());
  if (!upstream.ok || !upstream.body) return json({ error: `Upstream ${upstream.status}` }, 502);

  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
  const ext = extensionFor(contentType, source.pathname);
  const key = `generations/${userId}/${generationId}.${ext}`;
  const length = Number(upstream.headers.get('content-length'));
  const httpMetadata = { contentType, cacheControl: 'public, max-age=31536000, immutable' };

  if (Number.isFinite(length) && length > 0) {
    if (length > MAX_INGEST_BYTES) return json({ error: 'Source too large' }, 413);
    await env.BUCKET.put(key, upstream.body, { httpMetadata });
  } else {
    // Chunked upstream: length unknown, so buffer (bounded below).
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > 100 * MB) return json({ error: 'Source too large for unknown length' }, 413);
    await env.BUCKET.put(key, buf, { httpMetadata });
  }
  return json({ url: publicUrl(env, key), key });
}

async function purgeUser(userId: string, env: Env): Promise<Response> {
  let deleted = 0;
  for (const kind of ALL_KINDS) {
    let cursor: string | undefined;
    do {
      const page = await env.BUCKET.list({ prefix: `${kind}/${userId}/`, cursor, limit: 1000 });
      if (page.objects.length) {
        await env.BUCKET.delete(page.objects.map((o) => o.key));
        deleted += page.objects.length;
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
  return json({ ok: true, deleted });
}

/** Validate a Supabase access token by asking Supabase Auth who it belongs to. */
async function authenticate(request: Request, env: Env): Promise<{ id: string } | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ? { id: user.id } : null;
}

function publicUrl(env: Env, key: string): string {
  return `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
}

function extensionFor(contentType: string, pathname: string): string {
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  if (map[contentType]) return map[contentType];
  const fromPath = pathname.split('.').pop()?.toLowerCase();
  return fromPath && /^[a-z0-9]{2,5}$/.test(fromPath) ? fromPath : 'bin';
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}
