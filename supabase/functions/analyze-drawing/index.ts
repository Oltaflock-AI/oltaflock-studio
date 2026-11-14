// supabase/functions/analyze-drawing/index.ts
// Reads an architectural drawing (floor plan, sketch, elevation, section, site
// photo) with Claude vision and returns the spaces it contains, so the Spaces
// page can offer each room as something to render.

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

const SYSTEM = `You are an architect reading a drawing so it can be turned into photoreal renders.

Look carefully at the image. It may be a floor plan, a hand sketch, an elevation, a section, a 3D massing, a site photo or a photo of an existing room. It is often a screenshot or a phone photo of an AutoCAD screen: ignore the software interface, tabs, toolbars, screen glare and any neighbouring sheets or reference pictures that are cut off at the edges, and read the main drawing. Dimensions are usually in feet and inches (e.g. 7'-7").

Report:
- what kind of drawing it is,
- a short plain-English summary (one or two sentences),
- every distinct space you can identify (rooms, balconies, terraces, the exterior/facade if it is an elevation or site view). Use the labels written on the drawing when there are any. If the drawing shows a single room or view, return just that one space.
For an elevation or section, the "space" is the wall or part being drawn (e.g. "TV Wall, Bedroom"): describe its panel divisions, niches and recesses, shelves, hatched areas (hatching usually means fluted panels, slats, stone or wood), light positions, the TV or appliance positions, doors and overall width and height from the dimensions. Use the title on the drawing (e.g. "ELEVATION AA") and any room name in the file tabs.
For each space describe what the drawing tells you: shape, rough size if dimensions are written, where the doors and windows are, fixed items (kitchen counters, wardrobes, stairs, bathroom fittings, columns), ceiling or level changes, and what it connects to. Only state what the drawing shows. Do not invent furniture or materials.

Also note any style or material hints written or drawn on it.`;

const TOOL: Anthropic.Tool = {
  name: 'report_drawing',
  description: 'Report what the architectural drawing shows.',
  input_schema: {
    type: 'object',
    properties: {
      drawing_type: {
        type: 'string',
        enum: ['floor_plan', 'sketch', 'elevation', 'section', '3d_model', 'site_photo', 'room_photo', 'other'],
      },
      summary: { type: 'string', description: 'One or two plain sentences.' },
      style_hints: { type: 'string', description: 'Style or material hints visible on the drawing, or empty.' },
      spaces: {
        type: 'array',
        maxItems: 16,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Label for the space, e.g. "Master Bedroom".' },
            kind: {
              type: 'string',
              enum: ['living', 'dining', 'kitchen', 'bedroom', 'bathroom', 'study', 'pooja', 'balcony', 'terrace', 'lobby', 'staircase', 'exterior', 'office', 'retail', 'other'],
            },
            description: { type: 'string', description: 'Layout facts from the drawing: shape, size, doors, windows, fixed items, connections; for an elevation, the panels, niches, hatched finishes, lights and dimensions. Max ~80 words.' },
          },
          required: ['name', 'kind', 'description'],
        },
      },
    },
    required: ['drawing_type', 'summary', 'spaces'],
  },
};

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

  let imageUrl: string | undefined;
  let note: string | undefined;
  try {
    ({ image_url: imageUrl, note } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!imageUrl || !/^https:\/\//.test(imageUrl)) return json({ error: 'image_url (https) is required' }, 400);

  try {
    const img = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioDrawingReader/1.0)' } });
    if (!img.ok) return json({ error: `Could not download the drawing (${img.status})` }, 400);
    let mediaType = (img.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType)) mediaType = 'image/jpeg';
    const bytes = new Uint8Array(await img.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) return json({ error: 'Drawing is over 5MB. Export a smaller JPG or PNG.' }, 413);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const data = btoa(bin);

    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data } },
          { type: 'text', text: (note?.trim() ? `Notes from the designer: ${note.trim().slice(0, 500)}\n\n` : '') + `Read this drawing. Reply with ONLY a JSON object (no prose, no code fence) matching this JSON Schema:\n${JSON.stringify(TOOL.input_schema)}` },
        ],
      }],
    });
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const match = text.match(/\{[\s\S]*\}/);
    let out: { spaces?: unknown } | null = null;
    try { out = match ? JSON.parse(match[0]) : null; } catch { out = null; }
    if (!out || !Array.isArray(out.spaces)) {
      console.error('analyze-drawing: unparseable reply', text.slice(0, 500));
      return json({ error: 'Could not read the drawing. Try a clearer image.' }, 502);
    }
    return json(out);
  } catch (err) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`analyze-drawing ${ref}:`, err);
    return json({ error: `Could not read the drawing (ref ${ref})` }, 500);
  }
});
