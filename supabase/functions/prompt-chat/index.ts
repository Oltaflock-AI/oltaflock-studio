// Prompt Assistant — a streaming chat that writes and refines prompts for one
// Studio model, keeps a live "prompt card", and learns durable preferences
// into the user's memory (shared with Prompt Brain).
//
// POST { chatId?, message, attachments?, modelId?, backend, output?, learn? }
// → text/event-stream of JSON events:
//   { type: 'chat', chatId, title }       chat created / resolved
//   { type: 'text', delta }               streamed reply text
//   { type: 'status', status }            'thinking' | 'asking' | 'writing' | 'remembering'
//   { type: 'card', card }                validated prompt card
//   { type: 'questions', questions }      interactive brief the user answers in the UI
//   { type: 'suggestions', suggestions }  next-step replies shown as chips
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
import { BRAND, brandContext } from '../_shared/brand/index.ts';
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

export interface BriefQuestion {
  id: string;
  label: string;
  question: string;
  hint?: string;
  options: { label: string; description?: string }[];
  multi: boolean;
  defaults: string[];
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

/** Discovery for the conversational flow: a short back-and-forth, one question per turn. */
const CHAT_DISCOVERY = `## 1. Discovery — a quick conversation, then draft
Talk like a creative director in a chat, not a form. When the user starts a new idea and it is thin (e.g. "make a creative for a chips brand"), ask ONE question per turn: one short friendly line, then call ask_questions with exactly ONE question and 3–4 concrete, vivid options ("Chips bursting out of the bag mid-air"), never vague labels. Ask the question that changes the result most first (usually the concept or hook, then where it runs, then mood/setting).
- If no model is chosen and it isn't clear whether they want a still image or a video, make that your first question, framed around their idea (e.g. "A scroll-stopping still for the feed" / "A 6-second reel with motion"). Once they answer, stick to models of that kind. Don't ask it when the idea implies one (a "reel", "clip", "animation" → video; a "poster", "photo", "thumbnail" → image).
- Ask at most 3 questions in total across the conversation, fewer when the idea is already clear. After the user's answers, draft — don't keep interviewing.
- React briefly to each answer ("Mid-air burst it is.") before the next question, so it feels like a conversation.
- Never ask what memory, the conversation or attached references already answer; just use it.
- Skip questions entirely when the user gives a detailed brief, attaches references that answer it, or says "just draft it" / "surprise me" — draft straight away and make sensible choices.

`;

function systemPrompt(opts: {
  spec?: ModelSpec;
  backend: Backend;
  output?: 'image' | 'video';
  memories: Memory[];
  examples: string;
  learn: boolean;
  /** Conversational discovery: one question per turn instead of a brief form. */
  chat?: boolean;
}): string {
  const { spec, backend, output, memories, examples, learn, chat } = opts;
  return [
    `You are the ${BRAND.name} Studio Assistant: a sharp creative director on the ${BRAND.name} brand team who writes prompts for AI image and video models, chatting with a teammate inside ${BRAND.name} Studio. Generations run on the team's ${backend === 'kie' ? 'Kie.ai' : 'Higgsfield'} account. Every idea is for ${BRAND.name} unless the teammate clearly says otherwise, so don't ask what the brand, product category or audience is: you know them (see the brand section).

# How you work
You are a collaborator who runs a real creative process: understand the brief, then write, then refine.

${chat ? CHAT_DISCOVERY : `## 1. Discovery — ask before you draft
When the user starts a new idea and the brief is thin (e.g. "make a creative for a chips brand", "a video for my cafe"), do NOT draft yet. Write one short, friendly line, then call ask_questions with the 4–7 questions a senior creative director would ask for THIS brief. Tailor them to the category and medium — never a generic form. Pick from what actually changes the result:
- the brand and product specifics (name, flavour/variant, pack colours, logo or pack shot to include)
- the goal and where it runs (Instagram feed, story/reel, billboard, e-commerce, pitch deck) → this drives the format
- audience and tone (Gen Z and loud, premium and moody, family and warm…)
- the visual concept or hook (hero pack shot, lifestyle moment, surreal/ingredient explosion, flat-lay…)
- setting, props, people/talent, styling, lighting
- for video: length, camera movement, pacing, sound/dialogue
- copy or text in the image (headline, tagline) and whether to leave space for it instead
- must-haves and must-avoids, references
Every question needs 3–5 options that are concrete and vivid enough to be ideas in themselves ("Chips exploding out of the bag mid-air, ingredients flying"), not vague labels ("Dynamic"). Use multi:true where several can apply (e.g. props). When memory or the conversation already implies an answer, pre-select it in defaults; skip a question entirely when memory fully answers it and say so in your intro line ("I kept your usual 9:16 and brand palette").
Skip discovery when the user gives a detailed brief, attaches references that answer it, or says "just draft it" / "surprise me" — then draft straight away and make sensible choices.

`}## 2. Draft
Once you have answers, write the prompt. Every time you write or revise a prompt, call update_prompt_card with the COMPLETE prompt. Never paste the prompt into chat text — the card shows it. In chat, say in 1–3 sentences what you went for and why ("Went with the mid-air explosion on a hot-red backdrop so the pack pops in the feed").
- Suggest settings in the card only when they matter (aspect ratio, duration, resolution, audio). Use exact keys/values listed for the model; match the placement the user picked (story → 9:16, feed → 4:5 or 1:1, banner → 16:9).
- For variations ("give me 3 options"), call update_prompt_card once per variation in the same turn — each becomes its own version.
- Write your chat text once, before your tool calls; don't restate it afterwards.
- Never write a prompt or a "[Prompt card …]" into chat text — prompts only ever go through update_prompt_card.
- ${chat ? 'Only ask a follow-up (ask_questions, one question) if something important is still unknown after the draft.' : 'Only ask follow-up questions (ask_questions, 1–3 questions) if something important is still unknown after the draft.'}
- When the user asks to switch models, rewrite the same idea in the new model's syntax and set model_id.
- If the user attached images, look at them: describe or build on them as the user asks. For edit / image-to-video models the image is the input — describe only the change or motion.

## 3. Answer questions properly
When the user asks something (which model is best for X, how to get realistic hands, what a setting does, how to light a product, why a result looked off), give a genuinely useful, specific answer: lead with the direct answer, then short bullets or steps with concrete examples. Length should fit the question — a detailed question deserves a detailed answer (up to ~250 words). Use **bold** for key terms. Don't pad.

## 4. Keep it moving
End each turn in which you drafted/revised a card or answered a question by calling suggest_replies with 3–4 next steps phrased as the user would type them, specific to this idea ("Try a 9:16 story cut", "Add salsa splashing in", "Make the pack bigger"). Do not call it on turns where you ask_questions.

## Style
Warm, confident, specific; no filler, no "Great question!". Keep ordinary chat replies short. Use what you remember about the user without announcing it every time; mention it briefly when it shaped a choice.`,
    brandContext(BRAND),
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
- Brief answers often reveal durable facts (brand name, pack colours, audience, where they post) — remember those, not the one-off shot details.
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

const ASK_TOOL: Anthropic.Tool = {
  name: 'ask_questions',
  description: 'Show the user an interactive brief: a short set of tailored questions with tappable options. Ends your turn; the answers arrive as the next user message.',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: 7,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'short slug, e.g. "placement"' },
            label: { type: 'string', description: '1–3 word label used when summarising the answer, e.g. "Placement"' },
            question: { type: 'string', description: 'The question, conversational, under 14 words' },
            hint: { type: 'string', description: 'Optional one-line reason it matters' },
            options: {
              type: 'array',
              minItems: 2,
              maxItems: 6,
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Concrete option, under 9 words' },
                  description: { type: 'string', description: 'Optional extra detail, under 14 words' },
                },
                required: ['label'],
              },
            },
            multi: { type: 'boolean', description: 'true when several options can apply' },
            defaults: { type: 'array', items: { type: 'string' }, description: 'Option labels to pre-select, from memory or context' },
          },
          required: ['id', 'label', 'question', 'options'],
        },
      },
    },
    required: ['questions'],
  },
};

const SUGGEST_TOOL: Anthropic.Tool = {
  name: 'suggest_replies',
  description: 'Offer 3–4 one-tap next steps, phrased as the user would type them. Call last in the turn.',
  input_schema: {
    type: 'object',
    properties: { replies: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4, description: 'Each under 7 words' } },
    required: ['replies'],
  },
};

function toQuestions(input: Record<string, unknown>): BriefQuestion[] {
  const raw = Array.isArray(input.questions) ? input.questions : [];
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return raw.slice(0, 7).flatMap((q: Record<string, unknown>, i: number) => {
    const options = (Array.isArray(q?.options) ? q.options : [])
      .map((o: Record<string, unknown>) => ({ label: str(o?.label ?? o, 80), description: str(o?.description, 120) || undefined }))
      .filter((o: { label: string }) => o.label)
      .slice(0, 6);
    const question = str(q?.question, 160);
    if (!question || options.length < 2) return [];
    const labels = new Set(options.map((o: { label: string }) => o.label));
    return [{
      id: str(q.id, 40) || `q${i + 1}`,
      label: str(q.label, 30) || `Question ${i + 1}`,
      question,
      hint: str(q.hint, 140) || undefined,
      options,
      multi: q.multi === true,
      defaults: (Array.isArray(q.defaults) ? q.defaults : []).filter((d: unknown): d is string => typeof d === 'string' && labels.has(d)),
    }];
  });
}

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
  questions: BriefQuestion[] | null;
}

// Past cards and briefs are replayed as the tool calls that produced them. Writing them into
// the reply text instead teaches the model to type "[Prompt card …]" rather than call the tool.
function toMessages(rows: Row[]): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];
  let pendingResults: Anthropic.ToolResultBlockParam[] = [];
  rows.forEach((r, i) => {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (r.role === 'user') {
      blocks.push(...pendingResults);
      pendingResults = [];
      for (const a of r.attachments ?? []) {
        if (a.kind === 'image') blocks.push({ type: 'image', source: { type: 'url', url: a.url } });
        else blocks.push({ type: 'text', text: `[User attached a ${a.kind}: ${a.url}]` });
      }
      if (r.content.trim()) blocks.push({ type: 'text', text: r.content.trim() });
    } else {
      if (r.content.trim()) blocks.push({ type: 'text', text: r.content.trim() });
      const calls: [string, Record<string, unknown>, string][] = [];
      if (r.card) calls.push([CARD_TOOL.name, r.card as unknown as Record<string, unknown>, 'Card shown to the user.']);
      if (r.questions?.length) calls.push([ASK_TOOL.name, { questions: r.questions }, 'Shown to the user.']);
      calls.forEach(([name, input, result], j) => {
        const id = `toolu_hist_${i}_${j}`;
        blocks.push({ type: 'tool_use', id, name, input });
        pendingResults.push({ type: 'tool_result', tool_use_id: id, content: result });
      });
    }
    if (!blocks.length) return;
    const last = msgs[msgs.length - 1];
    if (last && last.role === r.role) (last.content as Anthropic.ContentBlockParam[]).push(...blocks);
    else msgs.push({ role: r.role, content: blocks });
  });
  // History may start mid-conversation: drop leading assistant turns and their orphaned results.
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (msgs.length) {
    const first = msgs[0].content as Anthropic.ContentBlockParam[];
    const kept = first.filter((b) => b.type !== 'tool_result');
    msgs[0] = { role: 'user', content: kept.length ? kept : [{ type: 'text', text: '(continued)' }] };
  }
  return msgs;
}

/** Safety net: turns any "[Prompt card "…" for …: … | settings {…}]" the model typed into real cards. */
const TYPED_CARD = /\[Prompt card "([^"]+)" for ([^:\]]+): ([\s\S]*?)(?: \| settings (\{[^\]]*\}))?\]/g;
function extractTypedCards(text: string): { text: string; found: Record<string, unknown>[] } {
  const found: Record<string, unknown>[] = [];
  const cleaned = text.replace(TYPED_CARD, (_m, title: string, model: string, prompt: string, settings?: string) => {
    let parsed: unknown = {};
    try { parsed = settings ? JSON.parse(settings) : {}; } catch { /* keep empty */ }
    found.push({ title, prompt: prompt.trim(), model_id: model.trim() === 'no model' ? undefined : model.trim(), settings: parsed });
    return '';
  });
  return { text: cleaned.replace(/\n{3,}/g, '\n\n').trim(), found };
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
  const chatFlow = body.flow === 'chat';
  let spec = typeof body.modelId === 'string' ? getSpec(body.modelId) : undefined;
  if (spec && specBackend(spec) !== backend) spec = undefined;
  if (!message && !attachments.length) return json({ error: 'Empty message' }, 400);

  // Placeholder title from the opening message, replaced by the first card's title.
  const autoTitle = (m: string) => (m || 'Reference upload').replace(/\s+/g, ' ').slice(0, 60);

  // True while the chat still carries its auto title and no earlier reply produced a card,
  // so the first card names the chat even when it arrives after a clarifying turn.
  const hasPlaceholderTitle = async (currentMessageId?: string) => {
    if (!body.chatId) return true;
    const [{ data: first }, { count }] = await Promise.all([
      supabase.from('assistant_messages').select('content').eq('chat_id', chatId).eq('role', 'user')
        .order('created_at', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('assistant_messages').select('id', { count: 'exact', head: true }).eq('chat_id', chatId)
        .not('card', 'is', null).neq('id', currentMessageId ?? ''),
    ]);
    return !count && !!first && title === autoTitle(first.content);
  };

  // Resolve or create the chat.
  let chatId: string | undefined = typeof body.chatId === 'string' ? body.chatId : undefined;
  let title = '';
  if (chatId) {
    const { data } = await supabase.from('assistant_chats').select('id, title').eq('id', chatId).maybeSingle();
    if (!data) return json({ error: 'Chat not found' }, 404);
    title = data.title;
  } else {
    title = autoTitle(message);
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
    supabase.from('assistant_messages').select('role, content, card, attachments, questions')
      .eq('chat_id', chatId).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    fetchMemories(supabase, userId),
    spec ? fetchRatedExamples(supabase, userId, spec) : Promise.resolve(''),
  ]);
  const messages = toMessages(((history ?? []) as Row[]).reverse());
  const system = systemPrompt({ spec, backend, output, memories, examples, learn, chat: chatFlow });
  const tools = learn ? [CARD_TOOL, ASK_TOOL, SUGGEST_TOOL, REMEMBER_TOOL] : [CARD_TOOL, ASK_TOOL, SUGGEST_TOOL];
  const TOOL_STATUS: Record<string, string> = { update_prompt_card: 'writing', ask_questions: 'asking', remember: 'remembering' };
  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      send({ type: 'chat', chatId, title });
      send({ type: 'status', status: 'thinking' });

      let text = '';
      const cards: PromptCard[] = [];
      let questions: BriefQuestion[] | null = null;
      let suggestions: string[] | null = null;
      const memoryEvents: MemoryEvent[] = [];
      let model = CHAT_MODEL;

      try {
        let lastTurn: { content: Anthropic.ContentBlockParam[]; toolResults: Anthropic.ToolResultBlockParam[] } | null = null;
        for (let round = 0; round < 3; round++) {
          let final: Anthropic.Message;
          try {
            const s = anthropic.messages.stream({
              model, max_tokens: 6000, tools,
              system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
              messages,
            });
            s.on('text', (delta) => { text += delta; send({ type: 'text', delta }); });
            s.on('streamEvent', (ev) => {
              if (ev.type === 'content_block_start' && ev.content_block.type === 'tool_use') {
                const status = TOOL_STATUS[ev.content_block.name];
                if (status) send({ type: 'status', status });
              }
            });
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
              if (c) { cards.push(c); send({ type: 'card', card: c, index: cards.length - 1 }); }
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: c ? 'Card shown to the user.' : 'Card rejected: prompt was empty.' });
            } else if (block.name === 'ask_questions') {
              const qs = toQuestions(input).slice(0, chatFlow ? 1 : 7);
              if (qs.length) { questions = qs; send({ type: 'questions', questions: qs }); }
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: qs.length ? 'Shown to the user. Stop and wait for their answers.' : 'Rejected: each question needs at least 2 options.' });
            } else if (block.name === 'suggest_replies') {
              const replies = (Array.isArray(input.replies) ? input.replies : [])
                .filter((r): r is string => typeof r === 'string' && !!r.trim()).map((r) => r.trim().slice(0, 60)).slice(0, 4);
              if (replies.length) { suggestions = replies; send({ type: 'suggestions', suggestions: replies }); }
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Shown.' });
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
          console.log(`[prompt-chat] round ${round} stop=${final.stop_reason} tools=${final.content.filter((b) => b.type === 'tool_use').map((b) => (b as Anthropic.ToolUseBlock).name).join(',') || '-'} out=${final.usage.output_tokens}`);
          if (final.stop_reason === 'max_tokens') console.warn('[prompt-chat] hit max_tokens; tool input may be truncated');
          lastTurn = { content: final.content as Anthropic.ContentBlockParam[], toolResults };
          if (final.stop_reason !== 'tool_use' || !toolResults.length) break;
          // Every tool is display-only, so once the reply text exists another round would only
          // repeat it. Questions and suggestions always close the turn.
          if (questions || suggestions || text.trim()) break;
          messages.push({ role: 'assistant', content: final.content as Anthropic.ContentBlockParam[] });
          messages.push({ role: 'user', content: toolResults });
          // Separate text from before and after the tool call.
          if (text && !text.endsWith('\n')) { text += '\n\n'; send({ type: 'text', delta: '\n\n' }); }
        }

        const typed = extractTypedCards(text);
        if (typed.found.length) {
          console.warn(`[prompt-chat] model typed ${typed.found.length} card(s) as text; converting`);
          text = typed.text;
          for (const input of typed.found) {
            const c = toCard(input, spec, backend);
            if (c) { cards.push(c); send({ type: 'card', card: c, index: cards.length - 1 }); }
          }
        }

        // Next-step chips. The reply loop stops as soon as the text is written, so ask for them
        // with one short forced call when the model didn't offer any itself.
        if (!questions && !suggestions && lastTurn && (text.trim() || cards.length)) {
          try {
            const followUp: Anthropic.MessageParam[] = [
              ...messages,
              { role: 'assistant', content: lastTurn.content },
              lastTurn.toolResults.length
                ? { role: 'user', content: lastTurn.toolResults }
                : { role: 'user', content: '(Offer next steps.)' },
            ];
            const res = await anthropic.messages.create({
              model, max_tokens: 300, tools, tool_choice: { type: 'tool', name: SUGGEST_TOOL.name },
              system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
              messages: followUp,
            });
            const block = res.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
            const replies = ((block?.input as { replies?: unknown })?.replies ?? []) as unknown[];
            const clean = replies.filter((r): r is string => typeof r === 'string' && !!r.trim()).map((r) => r.trim().slice(0, 60)).slice(0, 4);
            if (clean.length) { suggestions = clean; send({ type: 'suggestions', suggestions: clean }); }
          } catch (e) {
            console.warn('[prompt-chat] suggestions failed', e);
          }
        }

        // One row per card, so each variation is its own version with its own results.
        // The reply text, memory events and suggestions sit on the first row.
        const card = cards[0] ?? null;
        const { data: saved } = await supabase.from('assistant_messages').insert({
          chat_id: chatId, user_id: userId, role: 'assistant', content: text.trim(), card, questions,
          suggestions: cards.length > 1 ? null : suggestions,
          memory_events: memoryEvents.length ? memoryEvents : null,
        }).select('id').single();
        for (const [i, extra] of cards.slice(1).entries()) {
          await supabase.from('assistant_messages').insert({
            chat_id: chatId, user_id: userId, role: 'assistant', content: '', card: extra,
            suggestions: i === cards.length - 2 ? suggestions : null,
          });
        }

        const chatUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const lastCard = cards[cards.length - 1];
        if (lastCard?.model_id) chatUpdate.model_id = lastCard.model_id;
        if (card && await hasPlaceholderTitle(saved?.id)) { chatUpdate.title = card.title; send({ type: 'chat', chatId, title: card.title }); }
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
