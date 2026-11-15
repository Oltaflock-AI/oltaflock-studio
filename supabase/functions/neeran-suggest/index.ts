// supabase/functions/neeran-suggest/index.ts
// Neeran Studio: suggests materials and furniture for the parts of a room the
// designer hasn't decided yet, so they go with what is already finalised.
// Prefers items from the app's catalog (which have photos); free text otherwise.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MODEL = 'claude-sonnet-5-5';

const SYSTEM = `You are a senior Indian interior designer helping another designer finish a room's material schedule.
Some choices are already finalised (locked). Never change or contradict them. Suggest the remaining finishes and key pieces so the whole room works together: colour harmony, contrast between stone and wood, veneer and laminate tones, metal finishes, fabric, lighting.
Be practical for Indian homes and what Indian vendors actually stock (Italian and Indian marbles, granite, quartz, veneers, laminates, PU and duco paint finishes, fluted panels, cane, brass, rugs, curtains).
Prefer items from the catalog given (use their exact surface and id). When nothing in the catalog fits, give catalog_id null and describe the item precisely (material, colour, finish, pattern) so a render model can draw it.
Suggest only for places that are not already covered by a locked choice. 4 to 9 suggestions. Keep "why" to one short sentence in plain English.`;

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One sentence describing the overall scheme.' },
    items: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          where: { type: 'string', description: 'Place in the room, e.g. "Walls", "Wardrobe shutters", "Sofa", "Curtains".' },
          name: { type: 'string', description: 'Short name, e.g. "Walnut veneer".' },
          prompt: { type: 'string', description: 'Precise description for the render model (material, colour, finish, pattern, scale).' },
          catalog_surface: { type: ['string', 'null'] },
          catalog_id: { type: ['string', 'null'] },
          why: { type: 'string' },
        },
        required: ['where', 'name', 'prompt', 'why'],
      },
    },
  },
  required: ['summary', 'items'],
};

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

async function toImageBlock(url: string): Promise<Anthropic.ImageBlockParam | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioSuggest/1.0)' } });
    if (!r.ok) return null;
    let mediaType = (r.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType)) mediaType = 'image/jpeg';
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) return null;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: btoa(bin) } };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: 'Not signed in' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 503);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const room = `${clip(body?.room?.name, 80)} (${clip(body?.room?.kind, 30) || 'room'})`;
  const style = clip(body?.style, 400);
  const context = clip(body?.context, 800);
  const wants = clip(body?.wants, 400);
  const locked: Array<{ where: string; name: string; image_url?: string }> = Array.isArray(body?.locked) ? body.locked.slice(0, 30) : [];
  const catalog = clip(typeof body?.catalog === 'string' ? body.catalog : '', 30000);

  const images: Anthropic.ImageBlockParam[] = [];
  const lines: string[] = [];
  for (const l of locked) {
    let line = `- ${clip(l.where, 60)}: ${clip(l.name, 200)}`;
    if (images.length < 5 && typeof l.image_url === 'string' && /^https:\/\//.test(l.image_url)) {
      const block = await toImageBlock(l.image_url);
      if (block) { images.push(block); line += ` (photo ${images.length})`; }
    }
    lines.push(line);
  }

  const text = [
    `Room: ${room}`,
    context ? `From the drawing: ${context}` : '',
    style ? `Style wanted: ${style}` : 'Style: whatever suits the finalised choices best.',
    lines.length ? `Already finalised (do not change):\n${lines.join('\n')}` : 'Nothing is finalised yet: suggest a full scheme.',
    images.length ? 'The photos attached are the finalised materials, in the order numbered above.' : '',
    wants ? `The designer asks: ${wants}` : '',
    `Catalog (surface: id = name):\n${catalog}`,
    `Reply with ONLY a JSON object (no prose, no code fence) matching this JSON Schema:\n${JSON.stringify(SCHEMA)}`,
  ].filter(Boolean).join('\n\n');

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: 'user', content: [...images, { type: 'text', text }] }],
    });
    const out = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const match = out.match(/\{[\s\S]*\}/);
    // deno-lint-ignore no-explicit-any
    let parsed: any = null;
    try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error('neeran-suggest: unparseable reply', out.slice(0, 500));
      return json({ error: 'Could not come up with ideas. Try again.' }, 502);
    }
    return json(parsed);
  } catch (err) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`neeran-suggest ${ref}:`, err);
    return json({ error: `Could not get ideas (ref ${ref})` }, 500);
  }
});
