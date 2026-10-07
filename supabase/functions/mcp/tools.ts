// Tools exposed by the Oltaflock Studio MCP server. All reads and writes go
// through `ctx.supabase` (the caller's token), so RLS scopes everything to the
// signed-in user. Generation itself is delegated to the existing `generate`
// edge function, so MCP jobs behave exactly like jobs started in the Studio.

import type { McpServer } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/mcp.js';
import { z } from 'npm:zod@3.25.76';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { MODEL_CATALOG, RETIRED_MODELS, activeSpec, specBackend } from '../_shared/catalog/index.ts';
import { fieldValue, validateSpecInput } from '../_shared/catalog/adapters.ts';
import { specCredits, specPriceText } from '../_shared/catalog/pricing.ts';
import { USE_CASES } from '../_shared/catalog/use-cases.ts';
import type { ModelSpec } from '../_shared/catalog/types.ts';
import { optimizePrompt } from '../_shared/brain/index.ts';
import { fetchKieCredits } from '../_shared/kie-credits.ts';
import { persistOutput } from '../_shared/persist-output.ts';
import { MEMORY_CATEGORIES, fetchMemories } from '../_shared/memory.ts';
import { WIDGET_TOOL_META } from './widget.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export interface Ctx {
  userId: string;
  email: string | null;
  /** The caller's "Bearer …" header, forwarded to other edge functions. */
  authorization: string;
  /** User-scoped client (RLS applies). */
  supabase: SupabaseClientLike;
  supabaseUrl: string;
  anonKey: string;
}

export const USD_PER_CREDIT = 0.005;
const MAX_WAIT_SECONDS = 50;
const POLL_MS = 3000;
export const ELEMENT_KINDS = ['character', 'product', 'logo', 'place', 'style', 'other'] as const;
const MODES = ['text-to-image', 'image-to-image', 'text-to-video', 'image-to-video', 'video-to-video'] as const;
export const GENERATION_FIELDS =
  'id, title, type, model, status, progress, user_prompt, final_prompt, output_url, error_message, folder_id, rating, model_params, created_at';

// ─── Response helpers ────────────────────────────────────────────────────────

type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };

export function ok(data: Record<string, unknown>, extra: Content[] = []) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }, ...extra] as Content[],
    structuredContent: data,
  };
}

/** Largest image embedded inline; bigger outputs are left as links. */
const MAX_INLINE_IMAGE_BYTES = 3_500_000;
const MAX_INLINE_IMAGES = 4;
const CDN_BASE = 'https://cdn.oltaflock.ai/';

/** Outputs in our bucket get a 1024px JPEG from the storage Worker; others are fetched as-is. */
function previewUrl(outputUrl: string): string {
  const api = Deno.env.get('STORAGE_API_URL');
  if (!api || !outputUrl.startsWith(CDN_BASE)) return outputUrl;
  return `${api.replace(/\/$/, '')}/preview/${outputUrl.slice(CDN_BASE.length)}?w=1024`;
}

/**
 * Finished images as MCP image blocks, so chat clients (Claude, ChatGPT) show
 * the picture itself rather than a bare URL they won't render.
 */
async function imageBlocks(rows: GenerationRow[]): Promise<Content[]> {
  const images = rows.filter((r) => r.type === 'image' && r.status === 'done' && r.output_url).slice(0, MAX_INLINE_IMAGES);
  const blocks = await Promise.all(images.map(async (r): Promise<Content | null> => {
    try {
      const res = await fetch(previewUrl(r.output_url!), { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return null;
      const mimeType = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      if (!mimeType.startsWith('image/')) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > MAX_INLINE_IMAGE_BYTES) return null;
      return { type: 'image', data: encodeBase64(bytes), mimeType };
    } catch {
      return null;
    }
  }));
  return blocks.filter((b): b is Content => b !== null);
}

export function fail(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
export const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

type ToolResult = ReturnType<typeof ok> | ReturnType<typeof fail>;
interface ToolConfig<S extends z.ZodRawShape> {
  title: string;
  description: string;
  inputSchema: S;
  annotations: typeof READ;
  _meta?: Record<string, unknown>;
}

/** registerTool with argument types inferred from the zod shape (the SDK's own inference is lost under Deno). */
export function toolRegistrar(server: McpServer) {
  return <S extends z.ZodRawShape>(name: string, config: ToolConfig<S>, cb: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>) =>
    server.registerTool(name, config as never, cb as never);
}

// ─── Catalog helpers ─────────────────────────────────────────────────────────

export function modelSummary(spec: ModelSpec) {
  return {
    id: spec.id,
    name: spec.name,
    provider: spec.provider,
    mode: spec.mode,
    output: spec.output,
    backend: specBackend(spec),
    best_for: spec.bestFor,
    price: specPriceText(spec),
    native_audio: spec.audio ?? false,
    inputs: spec.media.map((m) => `${m.label}: ${m.kind}, ${m.min ? `required, ${m.min}–${m.max}` : `optional, up to ${m.max}`}`),
    featured: spec.featured ?? false,
  };
}

function modelDetail(spec: ModelSpec) {
  return {
    ...modelSummary(spec),
    prompt: spec.noPrompt ? 'not used' : spec.promptRequired === false ? 'optional' : 'required',
    prompt_max_chars: spec.promptMax ?? null,
    settings: spec.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      default: f.default ?? null,
      options: f.options?.map((o) => o.value),
      min: f.min,
      max: f.max,
      only_when: f.when ? `${f.when.key} in [${f.when.in.join(', ')}]` : undefined,
      help: f.help,
    })),
    media_slots: spec.media.map((m) => ({
      key: `media.${m.key}`,
      kind: m.kind,
      label: m.label,
      min: m.min ?? 0,
      max: m.max,
      help: m.help,
    })),
  };
}

export function unknownModel(id: string) {
  if (RETIRED_MODELS.has(id)) return `Model "${id}" has been retired. Call studio_list_models to pick a current one.`;
  const near = MODEL_CATALOG.filter((m) => m.id.includes(id) || m.name.toLowerCase().includes(id.toLowerCase())).slice(0, 5);
  return `Unknown model "${id}".${near.length ? ` Did you mean: ${near.map((m) => m.id).join(', ')}?` : ''} Call studio_list_models to see valid ids.`;
}

/** Puts reference URLs into the spec's free media slots of that kind. Returns what didn't fit. */
function fillMediaSlots(spec: ModelSpec, controls: Record<string, unknown>, urls: string[], kind: 'image' | 'video' | 'audio'): string[] {
  let pending = urls.filter(Boolean);
  for (const slot of spec.media.filter((m) => m.kind === kind)) {
    if (!pending.length) break;
    const key = `media.${slot.key}`;
    const current = ((controls[key] as string[] | undefined) ?? []).filter((u) => !pending.includes(u));
    const room = slot.max - current.length;
    if (room <= 0) continue;
    controls[key] = [...current, ...pending.slice(0, room)];
    pending = pending.slice(room);
  }
  return pending;
}

/** Fills every field's default so the stored row and the price match what the model receives. */
export function withDefaults(spec: ModelSpec, controls: Record<string, unknown>) {
  const out = { ...controls };
  for (const f of spec.fields) {
    if (out[f.key] === undefined) {
      const v = fieldValue(f, controls);
      if (v !== undefined) out[f.key] = v;
    }
  }
  return out;
}

export interface ElementRow { id: string; name: string; kind: string; description: string | null; image_urls: string[] }

/** "@Name" → "Name" plus a note describing each element (mirrors the Studio's expandElements). */
function expandElements(prompt: string, used: ElementRow[]): string {
  if (!used.length) return prompt;
  let text = prompt;
  for (const e of used) text = text.replace(new RegExp(`(^|\\s)@${e.name}(?![A-Za-z0-9_-])`, 'gi'), `$1${e.name}`);
  const notes = used
    .map((e) => `${e.name}${e.description?.trim() ? `: ${e.description.trim()}` : ''} (shown in the reference image${e.image_urls.length > 1 ? 's' : ''})`)
    .join('; ');
  return `${text.trim().replace(/[.\s]+$/, '')}. ${notes}.`;
}

// ─── Generation helpers ──────────────────────────────────────────────────────

export interface GenerationRow {
  id: string;
  title: string | null;
  type: string;
  model: string;
  status: string;
  progress: number | null;
  user_prompt: string;
  final_prompt: string | null;
  output_url: string | null;
  error_message: string | null;
  folder_id: string | null;
  rating: number | null;
  model_params: Record<string, unknown> | null;
  created_at: string;
}

export function generationView(g: GenerationRow) {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    model: g.model,
    model_id: (g.model_params?.model_id as string | undefined) ?? null,
    status: g.status,
    progress: g.progress,
    output_url: g.output_url,
    error: g.error_message,
    prompt: g.user_prompt,
    final_prompt: g.final_prompt && g.final_prompt !== g.user_prompt ? g.final_prompt : undefined,
    folder_id: g.folder_id,
    rating: g.rating,
    credits: (g.model_params?.cost_credits as number | undefined) ?? null,
    created_at: g.created_at,
    studio_url: `https://studio.oltaflock.ai/generation/${g.id}`,
  };
}

/** Generation views with `starred` set from the user's saved library items. */
export async function viewsOf(ctx: Ctx, rows: GenerationRow[]) {
  const views = rows.map(generationView);
  if (!rows.length) return views;
  const { data } = await ctx.supabase
    .from('prompt_library_items')
    .select('source_generation_id')
    .eq('user_id', ctx.userId)
    .in('source_generation_id', rows.map((r) => r.id));
  const starred = new Set(((data ?? []) as Array<{ source_generation_id: string }>).map((r) => r.source_generation_id));
  return views.map((v) => ({ ...v, starred: starred.has(v.id) }));
}

const isFinished = (status: string) => status === 'done' || status === 'error';

export async function fetchGenerations(ctx: Ctx, ids: string[]): Promise<GenerationRow[]> {
  const { data, error } = await ctx.supabase.from('generations').select(GENERATION_FIELDS).in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as GenerationRow[];
}

/**
 * Rows are marked done with the provider's temporary URL, then the permanent
 * copy (keyed by generation id) replaces it a few seconds later. Wait for that
 * copy, but give up after PERSIST_GRACE_MS in case storage is off or failed.
 */
const PERSIST_GRACE_MS = 15_000;

export async function waitFor(ctx: Ctx, ids: string[], seconds: number): Promise<GenerationRow[]> {
  const deadline = Date.now() + Math.min(seconds, MAX_WAIT_SECONDS) * 1000;
  const doneAt = new Map<string, number>();
  const settled = (r: GenerationRow) => {
    if (r.status === 'error') return true;
    if (r.status !== 'done') return false;
    if (!r.output_url || r.output_url.includes(r.id)) return true;
    if (!doneAt.has(r.id)) doneAt.set(r.id, Date.now());
    return Date.now() - doneAt.get(r.id)! > PERSIST_GRACE_MS;
  };
  let rows = await fetchGenerations(ctx, ids);
  while (Date.now() < deadline && !rows.every(settled)) {
    await new Promise((r) => setTimeout(r, Math.min(POLL_MS, Math.max(0, deadline - Date.now()))));
    rows = await fetchGenerations(ctx, ids);
  }
  const stale = new Set([...doneAt].filter(([, at]) => Date.now() - at > PERSIST_GRACE_MS).map(([id]) => id));
  return repairUnpersisted(ctx, rows, (r) => stale.has(r.id));
}

const isUnpersisted = (r: GenerationRow) => r.status === 'done' && !!r.output_url && !r.output_url.includes(r.id);

/**
 * The callback copies outputs to permanent storage but carries on if that
 * fails, and nothing retries it — so the row keeps the provider's expiring URL.
 * Retry the copy for such rows (those given up on in this call, or finished
 * over two minutes ago) so MCP clients never hand out a link that dies.
 */
export async function repairUnpersisted(ctx: Ctx, rows: GenerationRow[], gaveUp: (r: GenerationRow) => boolean = () => false) {
  const old = (r: GenerationRow) => Date.now() - new Date(r.created_at).getTime() > 120_000;
  const targets = rows.filter((r) => isUnpersisted(r) && (gaveUp(r) || old(r))).slice(0, 5);
  if (!targets.length) return rows;
  const fixed = new Map<string, string>();
  await Promise.all(targets.map(async (r) => {
    const url = await persistOutput(r.output_url!, ctx.userId, r.id);
    if (!url) return;
    const { error } = await ctx.supabase.from('generations').update({ output_url: url }).eq('id', r.id);
    if (!error) fixed.set(r.id, url);
  }));
  return rows.map((r) => (fixed.has(r.id) ? { ...r, output_url: fixed.get(r.id)! } : r));
}

function waitNote(rows: GenerationRow[]) {
  const pending = rows.filter((r) => !isFinished(r.status)).length;
  if (!pending) return undefined;
  return `${pending} still rendering. Videos usually take 1–5 minutes. Call studio_get_generations with these ids (and wait_seconds) to check again.`;
}

export interface GenerateArgs {
  model_id: string;
  prompt?: string;
  settings?: Record<string, unknown>;
  reference_images?: string[];
  reference_videos?: string[];
  enhance_prompt?: boolean;
  title?: string;
  folder_id?: string;
  /** Recorded on the row: 'mcp' for the model, 'mcp-app' for buttons in the chat panel. */
  source?: string;
}

/**
 * Creates the generation row and starts the `generate` edge function: the one
 * path behind studio_generate, Regenerate and the chat panels.
 */
export async function startGeneration(ctx: Ctx, args: GenerateArgs): Promise<{ id: string; credits: number; warnings: string[] } | { error: string }> {
  const spec = activeSpec(args.model_id);
  if (!spec) return { error: unknownModel(args.model_id) };

  const warnings: string[] = [];
  const controls: Record<string, unknown> = { ...(args.settings ?? {}) };

  // Elements referenced as @Name
  let prompt = args.prompt ?? '';
  const mentioned = new Set([...prompt.matchAll(/(^|\s)@([A-Za-z0-9_-]+)/g)].map((m) => m[2].toLowerCase()));
  if (mentioned.size) {
    const { data } = await ctx.supabase.from('elements').select('id, name, kind, description, image_urls');
    const used = ((data ?? []) as ElementRow[]).filter((e) => mentioned.has(e.name.toLowerCase()));
    const missing = [...mentioned].filter((n) => !used.some((e) => e.name.toLowerCase() === n));
    if (missing.length) warnings.push(`No element named ${missing.map((n) => `@${n}`).join(', ')} — left as plain text.`);
    if (used.length) {
      const left = fillMediaSlots(spec, controls, used.flatMap((e) => e.image_urls), 'image');
      if (!spec.media.some((m) => m.kind === 'image')) {
        warnings.push(`${spec.name} takes no reference images, so only the element descriptions were used. Pick an image-to-image / image-to-video / reference model to use their images.`);
      } else if (left.length) {
        warnings.push(`${spec.name} had no room for ${left.length} element image(s).`);
      }
      prompt = expandElements(prompt, used);
    }
  }

  if (args.reference_images?.length) {
    const left = fillMediaSlots(spec, controls, args.reference_images, 'image');
    if (left.length === args.reference_images.length) return { error: `${spec.name} does not accept reference images. Use a model with mode image-to-image or image-to-video.` };
    if (left.length) warnings.push(`${left.length} reference image(s) did not fit ${spec.name}'s slots and were dropped.`);
  }
  if (args.reference_videos?.length) {
    const left = fillMediaSlots(spec, controls, args.reference_videos, 'video');
    if (left.length === args.reference_videos.length) return { error: `${spec.name} does not accept reference videos. Use a video-to-video model.` };
    if (left.length) warnings.push(`${left.length} reference video(s) were dropped (no room).`);
  }

  const problem = validateSpecInput(spec, prompt, controls);
  if (problem) return { error: `${problem}. Call studio_get_model("${spec.id}") to see its inputs.` };

  const full = withDefaults(spec, controls);
  const credits = specCredits(spec, full);
  const isHf = spec.api === 'higgsfield';

  const { data: row, error } = await ctx.supabase
    .from('generations')
    .insert({
      request_id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: spec.output,
      model: spec.name,
      user_prompt: args.prompt ?? '',
      status: 'queued',
      user_id: ctx.userId,
      title: args.title ?? null,
      folder_id: args.folder_id ?? null,
      model_params: {
        ...full,
        source: args.source ?? 'mcp',
        model_id: spec.id,
        backend: specBackend(spec),
        cost_credits: credits,
        cost_usd: isHf ? null : credits * USD_PER_CREDIT,
      },
    })
    .select('id')
    .single();
  if (error || !row) return { error: `Could not create the generation: ${error?.message ?? 'unknown error'}` };
  const id = (row as { id: string }).id;

  const res = await fetch(`${ctx.supabaseUrl}/functions/v1/generate`, {
    method: 'POST',
    headers: { Authorization: ctx.authorization, apikey: ctx.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: spec.id,
      type: spec.mode,
      controls: { ...full, cost_credits: credits },
      generationId: id,
      enhancePromptEnabled: args.enhance_prompt ?? false,
      useCase: 'auto',
    }),
  });
  const body = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) {
    const msg = body.error ?? `Generation failed to start (${res.status})`;
    await ctx.supabase.from('generations').update({ status: 'error', error_message: msg }).eq('id', id);
    return { error: msg };
  }
  return { id, credits, warnings };
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export function registerTools(server: McpServer, ctx: Ctx) {
  const tool = toolRegistrar(server);

  // ── Catalog ──
  tool('studio_list_models', {
    title: 'List models',
    description:
      'List the image and video models available in Oltaflock Studio, with what each is best for, its price in credits and which inputs it accepts. ' +
      'Filter by output or mode. Use the returned `id` with studio_get_model and studio_generate.',
    inputSchema: {
      output: z.enum(['image', 'video']).optional().describe('Only image or only video models'),
      mode: z.enum(MODES).optional().describe('e.g. "text-to-video" or "image-to-video"'),
      backend: z.enum(['kie', 'higgsfield']).optional().describe('Provider account; omit for all'),
      query: z.string().optional().describe('Case-insensitive match on name, provider or best-for text, e.g. "veo", "kling", "product"'),
    },
    annotations: READ,
  }, async ({ output, mode, backend, query }) => {
    const q = query?.toLowerCase();
    const models = MODEL_CATALOG
      .filter((m) => !output || m.output === output)
      .filter((m) => !mode || m.mode === mode)
      .filter((m) => !backend || specBackend(m) === backend)
      .filter((m) => !q || `${m.id} ${m.name} ${m.provider} ${m.bestFor} ${(m.tags ?? []).join(' ')}`.toLowerCase().includes(q))
      .map(modelSummary);
    return ok({ count: models.length, models });
  });

  tool('studio_get_model', {
    title: 'Get model settings',
    description:
      'Full settings for one model: every setting key with its options and default, and the media slots it accepts. ' +
      'Call this before studio_generate when you want to set aspect ratio, duration, resolution, audio, etc.',
    inputSchema: { model_id: z.string().describe('Model id from studio_list_models') },
    annotations: READ,
  }, async ({ model_id }) => {
    const spec = activeSpec(model_id);
    return spec ? ok(modelDetail(spec)) : fail(unknownModel(model_id));
  });

  tool('studio_estimate_cost', {
    title: 'Estimate cost',
    description: 'Credits (and USD) one generation would cost with the given settings. 1 credit = $0.005.',
    inputSchema: {
      model_id: z.string(),
      settings: z.record(z.unknown()).optional().describe('Same `settings` object you would pass to studio_generate'),
    },
    annotations: READ,
  }, async ({ model_id, settings }) => {
    const spec = activeSpec(model_id);
    if (!spec) return fail(unknownModel(model_id));
    const credits = specCredits(spec, settings ?? {});
    return ok({ model_id, credits, usd: Math.round(credits * USD_PER_CREDIT * 1000) / 1000, pricing: specPriceText(spec) });
  });

  tool('studio_get_balance', {
    title: 'Get credit balance',
    description: 'Current credit balance available for generations.',
    inputSchema: {},
    annotations: READ,
  }, async () => {
    const balance = await fetchKieCredits();
    if (balance === null) return fail('Could not read the credit balance right now. Try again shortly.');
    return ok({ credits: balance, usd: Math.round(balance * USD_PER_CREDIT * 100) / 100 });
  });

  // ── Prompting ──
  tool('studio_enhance_prompt', {
    title: 'Enhance prompt',
    description:
      "Rewrite a rough idea into a production prompt tuned for a specific model, using Prompt Brain and the user's saved memory " +
      '(style, brands, dislikes). Returns the prompt only — nothing is generated.',
    inputSchema: {
      model_id: z.string(),
      idea: z.string().min(1).describe('The rough idea or draft prompt'),
      use_case: z.enum(USE_CASES.map((u) => u.id) as [string, ...string[]]).optional().describe('Defaults to auto'),
      settings: z.record(z.unknown()).optional().describe('Planned settings (aspect ratio, duration…) so the prompt fits them'),
    },
    annotations: { ...READ, idempotentHint: false, openWorldHint: true },
  }, async ({ model_id, idea, use_case, settings }) => {
    const spec = activeSpec(model_id);
    if (!spec) return fail(unknownModel(model_id));
    const result = await optimizePrompt({
      spec, prompt: idea, useCase: use_case ?? 'auto', controls: settings ?? {}, userId: ctx.userId, supabase: ctx.supabase,
    });
    if (!result) return fail('Prompt Brain is unavailable right now. Write the prompt yourself and pass it to studio_generate.');
    return ok({ model_id, prompt: result.prompt, notes: result.notes, use_case: result.useCase ?? use_case ?? 'auto' });
  });

  // ── Generation ──
  tool('studio_generate', {
    title: 'Generate image or video',
    description:
      'Start one image or video generation. It is saved to the user\'s Oltaflock library and charged in credits. ' +
      'Write "@Name" in the prompt to use one of the user\'s saved elements (its reference images are attached automatically). ' +
      'Pass public URLs in reference_images / reference_videos for image-to-image, image-to-video (first frame) or video-to-video. ' +
      'Returns the generation id right away; set wait_seconds (max 50) to wait for the result. ' +
      'For several shots, call this once per shot and then studio_get_generations with all ids.',
    inputSchema: {
      model_id: z.string().describe('Model id from studio_list_models'),
      prompt: z.string().default('').describe('What to create. For image-to-video, describe the motion rather than re-describing the frame.'),
      settings: z.record(z.unknown()).optional().describe(
        'Model settings by key from studio_get_model, e.g. {"aspect_ratio":"16:9","duration":8}. ' +
        'Media can also be set directly as {"media.<slot>": ["https://…"]}.',
      ),
      reference_images: z.array(z.string().url()).optional().describe('Image URLs, filled into the model\'s image slots in order (first frame first)'),
      reference_videos: z.array(z.string().url()).optional().describe('Video URLs for video-to-video models'),
      enhance_prompt: z.boolean().default(false).describe("Let Prompt Brain rewrite the prompt for this model using the user's memory. Leave off when you already wrote a detailed prompt."),
      title: z.string().min(1).max(120).optional().describe('Name shown in the library, e.g. "Shot 2 — pour close-up"'),
      folder_id: z.string().uuid().optional().describe('Library folder to file it in (studio_list_folders)'),
      wait_seconds: z.number().int().min(0).max(MAX_WAIT_SECONDS).default(0).describe('Wait up to this long for the result before returning'),
    },
    annotations: { ...WRITE, openWorldHint: true },
    _meta: WIDGET_TOOL_META,
  }, async (args) => {
    const started = await startGeneration(ctx, args);
    if ('error' in started) return fail(started.error);
    const { id, credits, warnings } = started;

    const rows = args.wait_seconds ? await waitFor(ctx, [id], args.wait_seconds) : await fetchGenerations(ctx, [id]);
    return ok({
      generation: rows[0] ? generationView(rows[0]) : { id, status: 'running' },
      credits,
      warnings: warnings.length ? warnings : undefined,
      next: waitNote(rows),
    }, await imageBlocks(rows));
  });

  tool('studio_get_generations', {
    title: 'Get generations',
    description:
      'Status and output URLs for one or more generations. Set wait_seconds to wait until they finish (max 50 per call; call again if some are still running).',
    inputSchema: {
      ids: z.array(z.string().uuid()).min(1).max(20),
      wait_seconds: z.number().int().min(0).max(MAX_WAIT_SECONDS).default(0),
    },
    annotations: READ,
    _meta: WIDGET_TOOL_META,
  }, async ({ ids, wait_seconds }) => {
    const rows = wait_seconds ? await waitFor(ctx, ids, wait_seconds) : await repairUnpersisted(ctx, await fetchGenerations(ctx, ids));
    const missing = ids.filter((id) => !rows.some((r) => r.id === id));
    return ok({
      generations: await viewsOf(ctx, rows),
      not_found: missing.length ? missing : undefined,
      next: waitNote(rows),
    }, await imageBlocks(rows));
  });

  tool('studio_list_generations', {
    title: 'Search library',
    description: "Browse or search the user's library of past generations, newest first.",
    inputSchema: {
      type: z.enum(['image', 'video']).optional(),
      status: z.enum(['queued', 'running', 'done', 'error']).optional(),
      folder_id: z.string().uuid().optional(),
      search: z.string().optional().describe('Matches title or prompt'),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    },
    annotations: READ,
    _meta: WIDGET_TOOL_META,
  }, async ({ type, status, folder_id, search, limit, offset }) => {
    let q = ctx.supabase.from('generations').select(GENERATION_FIELDS, { count: 'exact' }).eq('user_id', ctx.userId);
    if (type) q = q.eq('type', type);
    if (status) q = q.eq('status', status);
    if (folder_id) q = q.eq('folder_id', folder_id);
    if (search?.trim()) {
      const s = search.trim().replace(/[%,()]/g, ' ');
      q = q.or(`title.ilike.%${s}%,user_prompt.ilike.%${s}%`);
    }
    const { data, error, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) return fail(error.message);
    const rows = (data ?? []) as GenerationRow[];
    return ok({
      total: count ?? rows.length,
      offset,
      has_more: (count ?? 0) > offset + rows.length,
      generations: await viewsOf(ctx, rows),
    });
  });

  tool('studio_update_generation', {
    title: 'Rename, rate or file a generation',
    description: 'Rename a generation, rate it 1–5 (ratings teach Prompt Brain what the user likes), or move it to a folder.',
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().min(1).max(120).optional(),
      rating: z.number().int().min(1).max(5).optional(),
      folder_id: z.string().uuid().nullable().optional().describe('null moves it back to Unfiled'),
    },
    annotations: { ...WRITE, idempotentHint: true },
  }, async ({ id, title, rating, folder_id }) => {
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (rating !== undefined) patch.rating = rating;
    if (folder_id !== undefined) patch.folder_id = folder_id;
    if (!Object.keys(patch).length) return fail('Nothing to update — pass title, rating or folder_id.');
    const { data, error } = await ctx.supabase.from('generations').update(patch).eq('id', id).select(GENERATION_FIELDS).maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail(`No generation ${id} in your library.`);
    return ok({ generation: generationView(data as GenerationRow) });
  });

  // ── Folders ──
  tool('studio_list_folders', {
    title: 'List folders',
    description: "The user's library folders.",
    inputSchema: {},
    annotations: READ,
  }, async () => {
    const { data, error } = await ctx.supabase.from('generation_folders').select('id, name, color, created_at').order('position').order('created_at');
    if (error) return fail(error.message);
    return ok({ folders: data ?? [] });
  });

  tool('studio_create_folder', {
    title: 'Create folder',
    description: 'Create a library folder, e.g. one per video project. Returns the existing folder if the name is taken.',
    inputSchema: { name: z.string().min(1).max(60) },
    annotations: { ...WRITE, idempotentHint: true },
  }, async ({ name }) => {
    const clean = name.trim();
    const { data: existing } = await ctx.supabase.from('generation_folders').select('id, name').ilike('name', clean).maybeSingle();
    if (existing) return ok({ folder: existing, created: false });
    const { data, error } = await ctx.supabase.from('generation_folders').insert({ user_id: ctx.userId, name: clean }).select('id, name').single();
    if (error) return fail(error.message);
    return ok({ folder: data, created: true });
  });

  // ── Memory ──
  tool('studio_list_memories', {
    title: 'Read creative memory',
    description:
      "What Oltaflock remembers about the user: their style, brands/clients, recurring subjects, technical defaults, dislikes and workflow. " +
      'Read this at the start of any creative task and apply it by default.',
    inputSchema: { category: z.enum(MEMORY_CATEGORIES).optional() },
    annotations: READ,
  }, async ({ category }) => {
    const memories = (await fetchMemories(ctx.supabase, ctx.userId, 200)).filter((m) => !category || m.category === category);
    return ok({ count: memories.length, memories: memories.map(({ id, category, content, pinned, updated_at }) => ({ id, category, content, pinned, updated_at })) });
  });

  tool('studio_remember', {
    title: 'Save to memory',
    description:
      'Save a lasting fact or preference about the user (shared with the Oltaflock Assistant and Prompt Brain). ' +
      'Use for durable things ("brand colour is #229DE7", "hates lens flare"), not one-off requests. One fact per call.',
    inputSchema: {
      content: z.string().min(3).max(400),
      category: z.enum(MEMORY_CATEGORIES).describe('about | style | brand | subject | technical | dislike | workflow'),
      pinned: z.boolean().default(false).describe('Pinned memories are always applied and never auto-removed'),
    },
    annotations: WRITE,
  }, async ({ content, category, pinned }) => {
    const text = content.trim();
    const existing = await fetchMemories(ctx.supabase, ctx.userId, 200);
    const dupe = existing.find((m) => m.content.toLowerCase() === text.toLowerCase());
    if (dupe) return ok({ memory: dupe, created: false });
    const { data, error } = await ctx.supabase
      .from('assistant_memories')
      .insert({ user_id: ctx.userId, category, content: text, pinned, source: 'manual' })
      .select('id, category, content, pinned, updated_at')
      .single();
    if (error) return fail(error.message);
    return ok({ memory: data, created: true });
  });

  tool('studio_update_memory', {
    title: 'Update memory',
    description: 'Correct, recategorise, pin or unpin a saved memory.',
    inputSchema: {
      id: z.string().uuid(),
      content: z.string().min(3).max(400).optional(),
      category: z.enum(MEMORY_CATEGORIES).optional(),
      pinned: z.boolean().optional(),
    },
    annotations: { ...WRITE, idempotentHint: true },
  }, async ({ id, content, category, pinned }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (content !== undefined) patch.content = content.trim();
    if (category !== undefined) patch.category = category;
    if (pinned !== undefined) patch.pinned = pinned;
    const { data, error } = await ctx.supabase
      .from('assistant_memories').update(patch).eq('id', id).select('id, category, content, pinned, updated_at').maybeSingle();
    if (error) return fail(error.message);
    return data ? ok({ memory: data }) : fail(`No memory ${id}.`);
  });

  tool('studio_forget_memory', {
    title: 'Forget memory',
    description: 'Delete a saved memory. Only do this when the user asks or it is clearly wrong.',
    inputSchema: { id: z.string().uuid() },
    annotations: DELETE,
  }, async ({ id }) => {
    const { data, error } = await ctx.supabase.from('assistant_memories').delete().eq('id', id).select('id, content').maybeSingle();
    if (error) return fail(error.message);
    return data ? ok({ forgotten: data }) : fail(`No memory ${id}.`);
  });

  // ── Elements ──
  tool('studio_list_elements', {
    title: 'List elements',
    description:
      'The user\'s saved elements: named, reusable references (characters, products, logos, places, styles). ' +
      'Use one in a prompt as "@Name" to keep it consistent across shots.',
    inputSchema: { kind: z.enum(ELEMENT_KINDS).optional() },
    annotations: READ,
  }, async ({ kind }) => {
    let q = ctx.supabase.from('elements').select('id, name, kind, description, image_urls, updated_at').order('updated_at', { ascending: false });
    if (kind) q = q.eq('kind', kind);
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ elements: data ?? [] });
  });

  tool('studio_save_element', {
    title: 'Create or update element',
    description:
      'Create an element (or update the one with this name) from 1–8 image URLs — e.g. a character sheet or product shot you just generated — ' +
      'so later shots can reference it as "@Name".',
    inputSchema: {
      name: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/).describe('One word: letters, digits, - or _'),
      kind: z.enum(ELEMENT_KINDS).default('other'),
      description: z.string().max(600).optional().describe('What the images show — appended to prompts that use it'),
      image_urls: z.array(z.string().url()).min(1).max(8),
    },
    annotations: { ...WRITE, idempotentHint: true },
  }, async ({ name, kind, description, image_urls }) => {
    const { data: existing } = await ctx.supabase.from('elements').select('id').ilike('name', name).maybeSingle();
    const values = { name, kind, description: description ?? null, image_urls, updated_at: new Date().toISOString() };
    const query = existing
      ? ctx.supabase.from('elements').update(values).eq('id', existing.id)
      : ctx.supabase.from('elements').insert({ ...values, user_id: ctx.userId });
    const { data, error } = await query.select('id, name, kind, description, image_urls').single();
    if (error) return fail(error.message);
    return ok({ element: data, created: !existing, usage: `Write @${name} in a prompt to use it.` });
  });

  tool('studio_delete_element', {
    title: 'Delete element',
    description: 'Delete a saved element. Only when the user asks.',
    inputSchema: { id: z.string().uuid() },
    annotations: DELETE,
  }, async ({ id }) => {
    const { data, error } = await ctx.supabase.from('elements').delete().eq('id', id).select('id, name').maybeSingle();
    if (error) return fail(error.message);
    return data ? ok({ deleted: data }) : fail(`No element ${id}.`);
  });

  // ── Uploads ──
  tool('studio_upload_media', {
    title: 'Upload reference media',
    description:
      'Store an image/video/audio file so it can be used as a reference: pass a URL to copy, or base64 data for a file the user attached. ' +
      'Returns a permanent public URL for reference_images / reference_videos / elements.',
    inputSchema: {
      url: z.string().url().optional(),
      base64: z.string().optional().describe('File bytes, base64-encoded (no data: prefix). Max ~3 MB.'),
      mime_type: z.string().optional().describe('Required with base64, e.g. image/png'),
      filename: z.string().optional(),
    },
    annotations: { ...WRITE, openWorldHint: true },
  }, async ({ url, base64, mime_type, filename }) => {
    let blob: Blob;
    if (base64) {
      if (!mime_type) return fail('mime_type is required with base64.');
      const bytes = Uint8Array.from(atob(base64.replace(/^data:[^,]+,/, '')), (c) => c.charCodeAt(0));
      blob = new Blob([bytes], { type: mime_type });
    } else if (url) {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return fail(`Could not download ${url} (${res.status}).`);
      blob = await res.blob();
    } else {
      return fail('Pass either url or base64.');
    }
    if (blob.size > 25 * 1024 * 1024) return fail('File is over 25 MB.');

    const ext = (blob.type.split('/')[1] ?? 'bin').replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
    const base = (filename ?? `mcp-${Date.now()}`).replace(/\.[^.]+$/, '');
    const name = `${Date.now()}-${base}.${ext}`.replace(/[^A-Za-z0-9._-]/g, '_');
    const publicUrl = await uploadFile(ctx, name, blob);
    return ok({ url: publicUrl, mime_type: blob.type, bytes: blob.size });
  });
}

/** Same destinations as the web app's uploadFile: R2 via the storage Worker, else Supabase Storage. */
export async function uploadFile(ctx: Ctx, name: string, blob: Blob): Promise<string> {
  const storageApi = Deno.env.get('STORAGE_API_URL')?.replace(/\/$/, '');
  if (storageApi) {
    const res = await fetch(`${storageApi}/o/uploads/${ctx.userId}/${name}`, {
      method: 'PUT',
      headers: { Authorization: ctx.authorization, 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    const body = await res.json().catch(() => ({})) as { url?: string; error?: string };
    if (!res.ok || !body.url) throw new Error(body.error || `Upload failed (${res.status})`);
    return body.url;
  }
  const path = `${ctx.userId}/${name}`;
  const { error } = await ctx.supabase.storage.from('generation-uploads').upload(path, blob, { contentType: blob.type || undefined });
  if (error) throw new Error(error.message);
  return ctx.supabase.storage.from('generation-uploads').getPublicUrl(path).data.publicUrl;
}

