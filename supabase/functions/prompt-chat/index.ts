// Prompt Assistant — a streaming chat that writes and refines prompts for one
// Studio model, keeps a live "prompt card", and learns durable preferences
// into the user's memory (shared with Prompt Brain).
//
// POST { chatId?, message, attachments?, modelId?, backend, output?, learn? }
// → text/event-stream of JSON events:
//   { type: 'chat', chatId, title }       chat created / resolved
//   { type: 'text', delta }               streamed reply text
//   { type: 'card', card }                validated prompt card
//   { type: 'memory', event }             memory added / updated / forgotten
//   { type: 'done', messageId }           assistant message persisted
//   { type: 'error', error }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { catalogFor, getSpec, specBackend } from '../_shared/catalog/index.ts';
import type { Backend, FieldSpec, ModelSpec } from '../_shared/catalog/types.ts';
import { MODE_LABELS } from '../_shared/catalog/types.ts';
import { CORE_RULES, FAMILY_GUIDES, MODE_RULES } from '../_shared/brain/knowledge.ts';
import { fetchRatedExamples } from '../_shared/brain/index.ts';
import { applyMemoryAction, fetchMemories, memoryBlock, MEMORY_CATEGORIES, type Memory, type MemoryAction, type MemoryEvent } from '../_shared/memory.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHAT_MODEL = Deno.env.get('ASSISTANT_MODEL') || Deno.env.get('BRAIN_MODEL') || 'claude-sonnet-5';
const FALLBACK_MODEL = 'claude-sonnet-4-20250514';
const REFLECT_MODEL = 'claude-haiku-4-5-20251001';
const HISTORY_LIMIT = 24;
const REFLECT_EVERY = 4; // user turns

interface Attachment { url: string; kind: 'image' | 'video' | 'audio' }

export interface PromptCard {
  title: string;
  prompt: string;
  negative_prompt?: string;
  settings: Record<string, string | number | boolean>;
  notes: string[];
  model_id: string | null;
}

// ─── Prompt construction ─────────────────────────────────────────────────────

function fieldLine(f: FieldSpec): string {
  let allowed = '';
  if (f.type === 'enum' && f.options) allowed = `one of ${f.options.map((o) => JSON.stringify(o.value)).join(', ')}`;
  else if (f.type === 'boolean') allowed = 'true/false';
  else if (f.type === 'number') allowed = `number ${f.min ?? ''}–${f.max ?? ''}`;
  else allowed = f.type;
  return `  - ${f.key} (${f.label}): ${allowed}${f.default !== undefined ? `; default ${JSON.stringify(f.default)}` : ''}`;
}

function targetBlock(spec: ModelSpec): string {
  const family = FAMILY_GUIDES[spec.family] ?? FAMILY_GUIDES[spec.family.split('-')[0]] ?? '';
  const settable = spec.fields.filter((f) => f.type !== 'seed' && f.type !== 'text' && f.type !== 'textarea');
  const media = spec.media.map((m) => `  - ${m.label}: ${m.kind}, ${m.min ? `required (${m.min}–${m.max})` : `optional, up to ${m.max}`}`);
  return [
    `\n# Target model: ${spec.name} (${spec.provider}) — id "${spec.id}"`,
    `Mode: ${MODE_LABELS[spec.mode]}. Output: ${spec.output}.${spec.audio ? ' Generates native audio.' : ' No audio — never describe sound.'}${spec.promptMax ? ` Hard prompt limit: ${spec.promptMax} characters.` : ''}`,
    `Best at: ${spec.bestFor}`,
    MODE_RULES[spec.mode] ?? '',
    family ? `\n## How to prompt this model\n${family}` : '',
    settable.length ? `\n## Settings you may suggest in the card (use these exact keys and values)\n${settable.map(fieldLine).join('\n')}` : '',
    media.length ? `\n## Inputs this model takes\n${media.join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

function chooserBlock(backend: Backend, output?: 'image' | 'video'): string {
  const specs = catalogFor(backend).filter((s) => !output || s.output === output);
  const seen = new Set<string>();
  const lines = specs
    .filter((s) => (seen.has(`${s.family}|${s.mode}`) ? false : (seen.add(`${s.family}|${s.mode}`), true)))
    .slice(0, 90)
    .map((s) => `  - ${s.id} — ${s.name} [${MODE_LABELS[s.mode]}]: ${s.bestFor}`);
  return `\n# No model chosen yet
Help the user pick one. When you draft a prompt, set model_id on the card to the best fit from this list (exact id):
${lines.join('\n')}`;
}

function systemPrompt(opts: {
  spec?: ModelSpec;
  backend: Backend;
  output?: 'image' | 'video';
  memories: Memory[];
  examples: string;
  learn: boolean;
}): string {
  const { spec, backend, output, memories, examples, learn } = opts;
  return [
    `You are the Oltaflock Prompt Assistant: a sharp creative director who writes prompts for AI image and video models, chatting with the user inside Oltaflock Studio. Generations run on their ${backend === 'kie' ? 'Kie.ai' : 'Higgsfield'} account.

# How you work
- Be a collaborator, not a form. Keep chat replies short (usually under 70 words), warm and specific.
- Draft early. Ask at most one or two clarifying questions, and only when the answer would materially change the prompt (e.g. format, product, dialogue). Otherwise write a draft and offer 2–3 directions to push it.
- Every time you write or revise a prompt, call update_prompt_card with the COMPLETE prompt. Never paste the prompt into chat text — the card shows it. Refer to it ("I tightened the camera move…").
- Suggest settings in the card only when they matter for the idea (aspect ratio, duration, resolution, audio). Use exact keys/values listed for the model.
- When the user asks to switch models, rewrite the same idea in the new model's syntax and set model_id.
- If the user attached images, look at them: describe or build on them as the user asks. For edit / image-to-video models the image is the input — describe only the change or motion.
- Use what you remember about the user without announcing it every time; mention it briefly when it shaped a choice ("kept it vertical, like your usual reels").`,
    CORE_RULES.replace(/^You are Prompt Brain[^\n]*\n/, ''),
    spec ? targetBlock(spec) : chooserBlock(backend, output),
    memoryBlock(memories, true),
    examples,
    learn
      ? `\n# Memory
You have a long-term memory of this user (above, each with an [id]). Keep it accurate with the remember tool:
- ADD durable facts and preferences: their brand/clients, recurring subjects, visual taste, formats they ship (e.g. "posts 9:16 reels"), models they prefer, words or looks they dislike, how they like you to work.
- UPDATE an existing memory (by id) when they refine or contradict it. FORGET when they say it's wrong or ask you to.
- Do NOT store one-off details of the current shot, anything sensitive (health, finances, passwords), or guesses. One short third-person sentence each.
- Don't narrate memory saves in chat; the app shows them.`
      : '\n# Memory\nLearning is paused by the user: do not call remember. You may still use what you already know.',
  ].filter(Boolean).join('\n');
}

// ─── Tools ───────────────────────────────────────────────────────────────────

const CARD_TOOL: Anthropic.Tool = {
  name: 'update_prompt_card',
  description: 'Show the current prompt draft to the user as a card they can copy, send to Studio, or generate from. Always send the complete prompt.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '2–5 word name for this idea' },
      prompt: { type: 'string', description: 'The complete prompt, ready to send to the model' },
      negative_prompt: { type: 'string', description: 'Only if the model supports negative prompts and it helps' },
      settings: { type: 'object', description: 'Suggested settings keyed by the exact setting keys listed for the model', additionalProperties: true },
      notes: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short tips (≤14 words each)' },
      model_id: { type: 'string', description: 'Catalog id of the model this prompt is written for' },
    },
    required: ['title', 'prompt'],
  },
};

const REMEMBER_TOOL: Anthropic.Tool = {
  name: 'remember',
  description: "Add, update or forget one long-term memory about the user.",
  input_schema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'update', 'forget'] },
      id: { type: 'string', description: 'Memory id (for update / forget)' },
      category: { type: 'string', enum: [...MEMORY_CATEGORIES] },
      content: { type: 'string', description: 'One short third-person sentence' },
    },
    required: ['action'],
  },
};

/** Keeps only settings the model really accepts, coerced to valid values. */
function validateSettings(spec: ModelSpec | undefined, raw: unknown): Record<string, string | number | boolean> {
  if (!spec || !raw || typeof raw !== 'object') return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const f = spec.fields.find((x) => x.key === key || x.api === key);
    if (!f) continue;
    if (f.type === 'enum' && f.options) {
      const match = f.options.find((o) => String(o.value).toLowerCase() === String(value).toLowerCase());
      if (match) out[f.key] = match.value;
    } else if (f.type === 'boolean') {
      out[f.key] = value === true || value === 'true';
    } else if (f.type === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) out[f.key] = Math.min(f.max ?? n, Math.max(f.min ?? n, n));
    }
  }
  return out;
}

function toCard(input: Record<string, unknown>, fallbackSpec: ModelSpec | undefined, backend: Backend): PromptCard | null {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) return null;
  let spec = fallbackSpec;
  if (typeof input.model_id === 'string') {
    const s = getSpec(input.model_id);
    if (s && specBackend(s) === backend) spec = s;
  }
  return {
    title: String(input.title ?? 'Prompt').slice(0, 60),
    prompt: spec?.promptMax ? prompt.slice(0, spec.promptMax) : prompt,
    negative_prompt: typeof input.negative_prompt === 'string' && input.negative_prompt.trim() ? input.negative_prompt.trim() : undefined,
    settings: validateSettings(spec, input.settings),
    notes: Array.isArray(input.notes) ? input.notes.filter((n): n is string => typeof n === 'string').slice(0, 3) : [],
    model_id: spec?.id ?? null,
  };
}

// ─── History → Claude messages ───────────────────────────────────────────────

interface Row {
  role: 'user' | 'assistant';
  content: string;
  card: PromptCard | null;
  attachments: Attachment[] | null;
}

function toMessages(rows: Row[]): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];
  for (const r of rows) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (r.role === 'user') {
      for (const a of r.attachments ?? []) {
        if (a.kind === 'image') blocks.push({ type: 'image', source: { type: 'url', url: a.url } });
        else blocks.push({ type: 'text', text: `[User attached a ${a.kind}: ${a.url}]` });
      }
    }
    let text = r.content.trim();
    if (r.role === 'assistant' && r.card) {
      text += `\n\n[Prompt card "${r.card.title}" for ${r.card.model_id ?? 'no model'}: ${r.card.prompt}${Object.keys(r.card.settings ?? {}).length ? ` | settings ${JSON.stringify(r.card.settings)}` : ''}]`;
    }
    if (text) blocks.push({ type: 'text', text });
    if (!blocks.length) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === r.role) (last.content as Anthropic.ContentBlockParam[]).push(...blocks);
    else msgs.push({ role: r.role, content: blocks });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

// ─── Reflection: consolidate memory from recent chat + ratings ──────────────

// deno-lint-ignore no-explicit-any
async function reflect(anthropic: Anthropic, supabase: any, userId: string, chatId: string) {
  try {
    const memories = await fetchMemories(supabase, userId, 80);
    const { data: rows } = await supabase
      .from('assistant_messages')
      .select('role, content, card, generation_ids')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(16);
    const ids = (rows ?? []).flatMap((r: { generation_ids: string[] }) => r.generation_ids ?? []);
    const { data: gens } = ids.length
      ? await supabase.from('generations').select('model, final_prompt, user_prompt, rating').in('id', ids).not('rating', 'is', null)
      : { data: [] };

    const transcript = [...(rows ?? [])].reverse()
      .map((r: { role: string; content: string; card: PromptCard | null }) => `${r.role.toUpperCase()}: ${r.content}${r.card ? ` [card: ${r.card.prompt.slice(0, 300)}]` : ''}`)
      .join('\n');
    const ratings = (gens ?? []).map((g: { model: string; rating: number; final_prompt: string | null; user_prompt: string }) =>
      `- ${g.rating}★ on ${g.model}: "${(g.final_prompt ?? g.user_prompt).slice(0, 200)}"`).join('\n');

    const res = await anthropic.messages.create({
      model: REFLECT_MODEL,
      max_tokens: 800,
      system: `You maintain a creative user's long-term memory for an AI image/video prompt assistant. Given current memories, a recent chat and ratings of results, return the minimal set of changes that makes memory more accurate and useful:
- add durable preferences/facts that are clearly supported (not one-off shot details, nothing sensitive)
- update memories the user refined; merge near-duplicates (update one, forget the other)
- forget memories clearly contradicted
- learn from ratings: 4–5★ patterns are liked, 1–2★ patterns disliked — only when the pattern is clear
Keep each memory one short third-person sentence. Categories: ${MEMORY_CATEGORIES.join(', ')}.
Respond with ONLY JSON: {"changes":[{"action":"add|update|forget","id":"<8-char id for update/forget>","category":"...","content":"..."}]} — an empty list is fine.`,
      messages: [{
        role: 'user',
        content: `${memoryBlock(memories, true) || 'No memories yet.'}\n\n## Recent chat\n${transcript}\n\n## Ratings of results from this chat\n${ratings || 'none'}`,
      }],
    });
    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const changes = (Array.isArray(json.changes) ? json.changes : []).slice(0, 6) as MemoryAction[];
    for (const c of changes) await applyMemoryAction(supabase, userId, memories, c, 'reflection', chatId);
    console.log(`[prompt-chat] reflection applied ${changes.length} change(s)`);
  } catch (e) {
    console.warn('[prompt-chat] reflection failed', e);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return json({ error: 'Auth failed' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'The assistant needs ANTHROPIC_API_KEY set in Supabase secrets.' }, 503);

  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? '').slice(0, 6000).trim();
  const attachments: Attachment[] = (Array.isArray(body.attachments) ? body.attachments : [])
    .filter((a: Attachment) => typeof a?.url === 'string' && /^https:\/\//.test(a.url))
    .slice(0, 6);
  const backend: Backend = body.backend === 'higgsfield' ? 'higgsfield' : 'kie';
  const output = body.output === 'video' || body.output === 'image' ? body.output : undefined;
  const learn = body.learn !== false;
  let spec = typeof body.modelId === 'string' ? getSpec(body.modelId) : undefined;
  if (spec && specBackend(spec) !== backend) spec = undefined;
  if (!message && !attachments.length) return json({ error: 'Empty message' }, 400);

  // Resolve or create the chat.
  let chatId: string | undefined = typeof body.chatId === 'string' ? body.chatId : undefined;
  let title = '';
  if (chatId) {
    const { data } = await supabase.from('assistant_chats').select('id, title').eq('id', chatId).maybeSingle();
    if (!data) return json({ error: 'Chat not found' }, 404);
    title = data.title;
  } else {
    title = (message || 'Reference upload').replace(/\s+/g, ' ').slice(0, 60);
    const { data, error } = await supabase
      .from('assistant_chats')
      .insert({ user_id: userId, title, model_id: spec?.id ?? null, backend })
      .select('id')
      .single();
    if (error) return json({ error: error.message }, 500);
    chatId = data.id;
  }

  const { error: userMsgError } = await supabase.from('assistant_messages').insert({
    chat_id: chatId, user_id: userId, role: 'user', content: message, attachments: attachments.length ? attachments : null,
  });
  if (userMsgError) return json({ error: userMsgError.message }, 500);

  const [{ data: history }, memories, examples] = await Promise.all([
    supabase.from('assistant_messages').select('role, content, card, attachments')
      .eq('chat_id', chatId).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    fetchMemories(supabase, userId),
    spec ? fetchRatedExamples(supabase, userId, spec) : Promise.resolve(''),
  ]);
  const messages = toMessages(((history ?? []) as Row[]).reverse());
  const system = systemPrompt({ spec, backend, output, memories, examples, learn });
  const tools = learn ? [CARD_TOOL, REMEMBER_TOOL] : [CARD_TOOL];
  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      send({ type: 'chat', chatId, title });

      let text = '';
      let card: PromptCard | null = null;
      const memoryEvents: MemoryEvent[] = [];
      let model = CHAT_MODEL;

      try {
        for (let round = 0; round < 3; round++) {
          let final: Anthropic.Message;
          try {
            const s = anthropic.messages.stream({
              model, max_tokens: 2000, tools,
              system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
              messages,
            });
            s.on('text', (delta) => { text += delta; send({ type: 'text', delta }); });
            final = await s.finalMessage();
          } catch (e) {
            const status = (e as { status?: number }).status;
            if (round === 0 && model !== FALLBACK_MODEL && (status === 404 || status === 400) && !text) {
              console.warn(`[prompt-chat] ${model} → ${status}, falling back`);
              model = FALLBACK_MODEL;
              round--;
              continue;
            }
            throw e;
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== 'tool_use') continue;
            const input = block.input as Record<string, unknown>;
            if (block.name === 'update_prompt_card') {
              const c = toCard(input, spec, backend);
              if (c) { card = c; send({ type: 'card', card: c }); }
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: c ? 'Card shown to the user.' : 'Card rejected: prompt was empty.' });
            } else if (block.name === 'remember' && learn) {
              const ev = await applyMemoryAction(supabase, userId, memories, input as unknown as MemoryAction, 'chat', chatId);
              if (ev) {
                memoryEvents.push(ev);
                send({ type: 'memory', event: ev });
                if (ev.action === 'add') memories.push({ id: ev.id, category: ev.category!, content: ev.content!, pinned: false, source: 'chat', updated_at: new Date().toISOString() });
              }
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: ev ? `Memory ${ev.action}ed.` : 'No change (duplicate or not found).' });
            } else {
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Unavailable.' });
            }
          }
          if (final.stop_reason !== 'tool_use' || !toolResults.length) break;
          messages.push({ role: 'assistant', content: final.content as Anthropic.ContentBlockParam[] });
          messages.push({ role: 'user', content: toolResults });
          // Separate text from before and after the tool call.
          if (text && !text.endsWith('\n')) { text += '\n\n'; send({ type: 'text', delta: '\n\n' }); }
        }

        const { data: saved } = await supabase.from('assistant_messages').insert({
          chat_id: chatId, user_id: userId, role: 'assistant', content: text.trim(), card,
          memory_events: memoryEvents.length ? memoryEvents : null,
        }).select('id').single();

        const chatUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (card?.model_id) chatUpdate.model_id = card.model_id;
        if (card && !body.chatId) { chatUpdate.title = card.title; send({ type: 'chat', chatId, title: card.title }); }
        await supabase.from('assistant_chats').update(chatUpdate).eq('id', chatId);

        send({ type: 'done', messageId: saved?.id });

        if (learn) {
          const { count } = await supabase.from('assistant_messages')
            .select('id', { count: 'exact', head: true }).eq('chat_id', chatId).eq('role', 'user');
          if (count && count % REFLECT_EVERY === 0) {
            // Runs after the response closes.
            // deno-lint-ignore no-explicit-any
            (globalThis as any).EdgeRuntime?.waitUntil(reflect(anthropic, supabase, userId, chatId!));
          }
        }
      } catch (e) {
        console.error('[prompt-chat] failed', e);
        send({ type: 'error', error: e instanceof Error ? e.message : 'Assistant failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
});
