// supabase/functions/enhance-prompt/index.ts
// Oltaflock Creative Studio — Prompt Brain preview endpoint.
//   type: 'text'  — rewrite the user's prompt for the selected model + use case
//   type: 'image' — analyze a base64 image (+ optional prompt) and write a prompt
// The knowledge base lives in ../_shared/brain.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSpec } from '../_shared/catalog/index.ts';
import { optimizePrompt } from '../_shared/brain/index.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const {
      prompt = '',
      model,
      type = 'text',
      use_case = 'auto',
      controls = {},
      image_base64,
      image_media_type = 'image/jpeg',
    } = await req.json();

    const spec = model ? getSpec(model) : undefined;
    if (!spec) return json({ error: `Unknown model: ${model}` }, 400);

    const withImage = type === 'image' && typeof image_base64 === 'string' && image_base64.length > 0;
    if (!withImage && !String(prompt).trim()) return json({ error: 'prompt is required' }, 400);

    const result = await optimizePrompt({
      spec,
      prompt,
      useCase: use_case,
      controls,
      userId: user.id,
      supabase,
      image: withImage
        ? { base64: image_base64, mediaType: IMAGE_TYPES.includes(image_media_type) ? image_media_type : 'image/jpeg' }
        : undefined,
    });

    if (!result) return json({ error: 'Prompt Brain unavailable' }, 503);

    return json({ enhanced_prompt: result.prompt, notes: result.notes, use_case: result.useCase });
  } catch (err) {
    console.error('enhance-prompt error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
