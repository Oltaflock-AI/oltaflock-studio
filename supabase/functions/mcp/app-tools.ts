// Tools behind the Oltaflock Studio chat panels (MCP Apps).
//
// Two kinds:
// - Panel openers the model calls (studio_open_studio, studio_browse_library,
//   studio_storyboard, studio_open_memory). They return a small result so the
//   model's context stays lean; the panel loads the bulk data itself.
// - App-only tools (visibility ["app"]) that only the panel calls: star,
//   regenerate, composer data, model controls. The model never sees them.

import type { McpServer } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/mcp.js';
import { z } from 'npm:zod@3.25.76';
import { MODEL_CATALOG, activeSpec } from '../_shared/catalog/index.ts';
import { specCredits, specPriceText } from '../_shared/catalog/pricing.ts';
import { fetchKieCredits } from '../_shared/kie-credits.ts';
import { MEMORY_CATEGORIES } from '../_shared/memory.ts';
import {
  type Ctx, type GenerationRow, ELEMENT_KINDS, GENERATION_FIELDS, READ, USD_PER_CREDIT, WRITE,
  fail, fetchGenerations, ok, startGeneration, toolRegistrar, unknownModel, viewsOf, withDefaults,
} from './tools.ts';
import { APP_ONLY_META, WIDGET_TOOL_META } from './widget.ts';

/** A result whose text (what the model reads) is a short summary, with the panel data in structuredContent. */
function panel(summary: string, data: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: summary }], structuredContent: data };
}

const timeout = <T>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));

/** Keys of a stored model_params that are real model inputs (settings and media slots). */
function settingsFrom(params: Record<string, unknown> | null, fieldKeys: string[]) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (k.startsWith('media.') || fieldKeys.includes(k)) out[k] = v;
  }
  return out;
}

const shotSchema = z.object({
  title: z.string().max(120).optional().describe('e.g. "Shot 1 — wide establishing"'),
  prompt: z.string().default(''),
  model_id: z.string().describe('Model id from studio_list_models'),
  settings: z.record(z.unknown()).optional().describe('Settings by key from studio_get_model'),
  reference_images: z.array(z.string().url()).optional(),
  generation_id: z.string().uuid().optional().describe('An existing generation for this shot, to show its result'),
});

export function registerAppTools(server: McpServer, ctx: Ctx) {
  const tool = toolRegistrar(server);

  // ── Panel openers (model-visible) ──

  tool('studio_open_studio', {
    title: 'Open the Studio panel',
    description:
      'Show an interactive Oltaflock Studio composer in the chat: the user picks a model, writes or tweaks the prompt, sets aspect ratio / duration / ' +
      'references, sees the credit cost and generates from the panel. Prefill it with your suggestion. Use when the user wants to tweak things ' +
      'themselves, asks to "open the studio", or is exploring models. Generations started in the panel are reported back to you.',
    inputSchema: {
      prompt: z.string().optional(),
      model_id: z.string().optional().describe('Model to preselect'),
      output: z.enum(['image', 'video']).optional(),
      settings: z.record(z.unknown()).optional(),
      reference_images: z.array(z.string().url()).optional(),
      folder_id: z.string().uuid().optional(),
    },
    annotations: READ,
    _meta: WIDGET_TOOL_META,
  }, async (prefill) => {
    if (prefill.model_id && !activeSpec(prefill.model_id)) return fail(unknownModel(prefill.model_id));
    return panel(
      'The Studio panel is open in the chat with your prefill. The user can adjust and generate from it (they confirm the credit cost first). ' +
        'Generations they start there are reported back to you.',
      { view: 'composer', prefill },
    );
  });

  tool('studio_browse_library', {
    title: 'Browse library panel',
    description:
      "Show the user's Oltaflock library as an interactive grid in the chat (folders, search, image/video filter). They can open, star, rename, " +
      'file, download and pick items to use as references. Use studio_list_generations instead when you need the data yourself.',
    inputSchema: {
      folder_id: z.string().uuid().optional(),
      type: z.enum(['image', 'video']).optional(),
      search: z.string().optional(),
    },
    annotations: READ,
    _meta: WIDGET_TOOL_META,
  }, async (filters) => panel('The library panel is open in the chat. Items the user picks there will come back as a message.', { view: 'library', filters }));

  tool('studio_storyboard', {
    title: 'Show storyboard',
    description:
      'Show a multi-shot plan as an interactive storyboard in the chat: one card per shot with prompt, model and credit cost. The user can edit a ' +
      'shot\'s prompt and generate one shot or all of them from the panel (after confirming the cost), and regenerate any shot. ' +
      'Pass generation_id on shots you already started to show their progress and results. Prefer this over a text shot list for videos of 2+ shots.',
    inputSchema: {
      title: z.string().min(1).max(120),
      folder_id: z.string().uuid().optional().describe('Folder to file the shots in'),
      folder_name: z.string().min(1).max(60).optional().describe('Creates (or reuses) a folder with this name when folder_id is not given'),
      shots: z.array(shotSchema).min(1).max(12),
    },
    annotations: { ...WRITE, idempotentHint: true },
    _meta: WIDGET_TOOL_META,
  }, async ({ title, folder_id, folder_name, shots }) => {
    let folder: { id: string; name: string } | null = null;
    if (folder_id) {
      const { data } = await ctx.supabase.from('generation_folders').select('id, name').eq('id', folder_id).maybeSingle();
      folder = data;
    } else if (folder_name?.trim()) {
      const clean = folder_name.trim();
      const { data: existing } = await ctx.supabase.from('generation_folders').select('id, name').ilike('name', clean).maybeSingle();
      folder = existing ?? (await ctx.supabase.from('generation_folders').insert({ user_id: ctx.userId, name: clean }).select('id, name').single()).data;
    }

    const ids = shots.map((s) => s.generation_id).filter((id): id is string => !!id);
    const rows = ids.length ? await viewsOf(ctx, await fetchGenerations(ctx, ids)) : [];
    const planned = shots.map((s, i) => {
      const spec = activeSpec(s.model_id);
      const credits = spec ? specCredits(spec, withDefaults(spec, s.settings ?? {})) : null;
      return {
        index: i + 1,
        title: s.title ?? `Shot ${i + 1}`,
        prompt: s.prompt,
        model_id: s.model_id,
        model_name: spec?.name ?? s.model_id,
        output: spec?.output ?? null,
        settings: s.settings ?? {},
        reference_images: s.reference_images ?? [],
        credits,
        error: spec ? undefined : unknownModel(s.model_id),
        generation: s.generation_id ? rows.find((r) => r.id === s.generation_id) ?? null : null,
      };
    });
    const total = planned.reduce((n, s) => n + (s.generation ? 0 : s.credits ?? 0), 0);
    const bad = planned.filter((s) => s.error);
    return panel(
      `Storyboard "${title}" (${shots.length} shot${shots.length === 1 ? '' : 's'}, ~${total} credits to generate the rest) is shown in the chat` +
        (folder ? `, filing into folder "${folder.name}"` : '') + '. The user can edit and generate shots from it; results are reported back to you.' +
        (bad.length ? ` Problems: ${bad.map((s) => `shot ${s.index}: ${s.error}`).join(' ')}` : ''),
      { view: 'storyboard', title, folder, shots: planned, total_credits: total },
    );
  });

  tool('studio_open_memory', {
    title: 'Open memory & elements panel',
    description:
      "Show the user's creative memory (style, brands, dislikes…) and saved elements (characters, products…) as an editable panel in the chat, " +
      'where they can add, edit, pin and delete them. Use when the user wants to see or manage what Oltaflock remembers.',
    inputSchema: { tab: z.enum(['memory', 'elements']).default('memory') },
    annotations: READ,
    _meta: WIDGET_TOOL_META,
  }, async ({ tab }) => panel('The memory & elements panel is open in the chat.', { view: 'memory', tab, categories: MEMORY_CATEGORIES, element_kinds: ELEMENT_KINDS }));

  // ── App-only tools (called by the panels, hidden from the model) ──

  tool('studio_app_composer_data', {
    title: 'Composer data',
    description: 'Models, folders, elements and balance for the Studio panel.',
    inputSchema: {},
    annotations: READ,
    _meta: APP_ONLY_META,
  }, async () => {
    const [folders, elements, balance] = await Promise.all([
      ctx.supabase.from('generation_folders').select('id, name, color').order('position').order('created_at'),
      ctx.supabase.from('elements').select('id, name, kind, description, image_urls').order('updated_at', { ascending: false }),
      Promise.race([fetchKieCredits().catch(() => null), timeout(4000, null)]),
    ]);
    return ok({
      models: MODEL_CATALOG.map((m) => ({
        id: m.id, name: m.name, provider: m.provider, mode: m.mode, output: m.output, best_for: m.bestFor,
        price: specPriceText(m), featured: !!m.featured, is_new: !!m.isNew, audio: !!m.audio,
      })),
      folders: folders.data ?? [],
      elements: elements.data ?? [],
      balance,
    });
  });

  tool('studio_app_model', {
    title: 'Model controls',
    description: "One model's controls and media slots, as the Studio panel renders them.",
    inputSchema: { model_id: z.string() },
    annotations: READ,
    _meta: APP_ONLY_META,
  }, async ({ model_id }) => {
    const spec = activeSpec(model_id);
    if (!spec) return fail(unknownModel(model_id));
    return ok({
      id: spec.id,
      name: spec.name,
      mode: spec.mode,
      output: spec.output,
      prompt: spec.noPrompt ? 'none' : spec.promptRequired === false ? 'optional' : 'required',
      prompt_max: spec.promptMax ?? null,
      fields: spec.fields.map(({ key, label, type, options, default: def, min, max, step, help, advanced, when }) =>
        ({ key, label, type, options, default: def, min, max, step, help, advanced, when })),
      media: spec.media.map(({ key, kind, label, min, max, help, when }) => ({ key, kind, label, min, max, help, when })),
    });
  });

  tool('studio_app_star', {
    title: 'Star or unstar',
    description: 'Toggle a generation in the user\'s Starred collection.',
    inputSchema: { id: z.string().uuid() },
    annotations: { ...WRITE, idempotentHint: false },
    _meta: APP_ONLY_META,
  }, async ({ id }) => {
    const { data: existing } = await ctx.supabase
      .from('prompt_library_items').select('id').eq('user_id', ctx.userId).eq('source_generation_id', id).limit(1);
    if (existing?.length) {
      const { error } = await ctx.supabase.from('prompt_library_items').delete().eq('id', existing[0].id);
      return error ? fail(error.message) : ok({ id, starred: false });
    }
    const [g] = await fetchGenerations(ctx, [id]);
    if (!g) return fail(`No generation ${id} in your library.`);
    if (g.status !== 'done' || !g.output_url) return fail('Only finished generations can be starred.');
    const video = g.type === 'video';
    const { error } = await ctx.supabase.from('prompt_library_items').insert({
      user_id: ctx.userId,
      is_curated: false,
      title: g.title?.trim() || g.user_prompt.trim().slice(0, 60) || 'Untitled',
      prompt: g.user_prompt,
      category: 'other',
      thumbnail_url: g.output_url,
      mode: video ? 'video' : 'image',
      generation_type: video ? 'text-to-video' : 'text-to-image',
      model: g.model,
      model_params: g.model_params,
      source_generation_id: g.id,
    });
    return error ? fail(error.message) : ok({ id, starred: true });
  });

  tool('studio_app_rerun', {
    title: 'Regenerate',
    description: 'Run a generation again with the same model, settings and references (optionally a new prompt). Costs credits.',
    inputSchema: { id: z.string().uuid(), prompt: z.string().optional() },
    annotations: { ...WRITE, openWorldHint: true },
    _meta: APP_ONLY_META,
  }, async ({ id, prompt }) => {
    const { data } = await ctx.supabase.from('generations').select(GENERATION_FIELDS).eq('id', id).maybeSingle();
    const g = data as GenerationRow | null;
    if (!g) return fail(`No generation ${id} in your library.`);
    const spec = activeSpec((g.model_params?.model_id as string | undefined) ?? '');
    if (!spec) return fail('This item was uploaded or made with a model that is no longer available, so it cannot be regenerated.');
    const started = await startGeneration(ctx, {
      model_id: spec.id,
      prompt: prompt ?? g.user_prompt,
      settings: settingsFrom(g.model_params, spec.fields.map((f) => f.key)),
      title: g.title ?? undefined,
      folder_id: g.folder_id ?? undefined,
      source: 'mcp-app',
    });
    if ('error' in started) return fail(started.error);
    const [row] = await viewsOf(ctx, await fetchGenerations(ctx, [started.id]));
    return ok({ generation: row ?? { id: started.id, status: 'queued' }, credits: started.credits, usd: started.credits * USD_PER_CREDIT });
  });
}
