// Copies a generated output from the provider's (temporary) URL into R2 via the
// oltaflock-storage Worker. Fail-open: returns null when unconfigured or on any
// error, and the caller keeps the original URL.
export async function persistOutput(
  outputUrl: string,
  userId: string,
  generationId: string,
): Promise<string | null> {
  const apiUrl = Deno.env.get('STORAGE_API_URL');
  const secret = Deno.env.get('STORAGE_INGEST_SECRET');
  if (!apiUrl || !secret || !outputUrl) return null;

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-secret': secret },
      body: JSON.stringify({ url: outputUrl, userId, generationId }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error(`[persist] ingest failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const { url } = await res.json();
    return typeof url === 'string' ? url : null;
  } catch (err) {
    console.error('[persist] ingest error:', err);
    return null;
  }
}
