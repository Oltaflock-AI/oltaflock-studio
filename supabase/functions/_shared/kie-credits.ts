// Live credit balance of the kie.ai account that pays for every generation.
// This is the real number users can spend — the user_credits table is only a
// per-user spend log.

export async function fetchKieCredits(): Promise<number | null> {
  const apiKey = Deno.env.get('KIE_AI_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (data?.code !== 200) {
      console.error('[kie-credits] error:', data?.msg);
      return null;
    }
    const credits = Number(data.data);
    return Number.isFinite(credits) ? credits : null;
  } catch (err) {
    console.error('[kie-credits] fetch failed:', err);
    return null;
  }
}
