// Prompt Brain — rewrites a rough idea into a prompt tuned for one specific
// model, one use case, and the exact settings/inputs the user has chosen.

import type { ModelSpec } from '../catalog/types.ts';
import { fieldValue, mediaValue, visibleFields, visibleMedia } from '../catalog/adapters.ts';
import { USE_CASES } from '../catalog/use-cases.ts';
import { CORE_RULES, FAMILY_GUIDES, USE_CASE_GUIDES, MODE_RULES } from './knowledge.ts';

const PRIMARY_MODEL = Deno.env.get('BRAIN_MODEL') || 'claude-sonnet-5';
const FALLBACK_MODEL = 'claude-sonnet-4-20250514';

/** Any supabase-js client (edge functions import different versions). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientLike = any;

export interface BrainInput {
  spec: ModelSpec;
  prompt: string;
  useCase?: string;
  controls?: Record<string, unknown>;
  userId?: string;
  supabase?: SupabaseClientLike;
  image?: { base64: string; mediaType: string };
}

export interface BrainResult {
  prompt: string;
  notes: string[];
  useCase?: string;
}

/** Plain-English summary of the settings + inputs, so the brain writes for them. */
function describeSetup(spec: ModelSpec, controls: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const f of visibleFields(spec, controls)) {
    const v = fieldValue(f, controls);
    if (v === undefined || v === '' || f.type === 'seed') continue;
    lines.push(`- ${f.label}: ${String(v)}`);
  }
  for (const m of visibleMedia(spec, controls)) {
    const n = mediaValue(m, controls).length;
    if (n > 0) lines.push(`- ${m.label}: ${n} ${m.kind}${n > 1 ? 's' : ''} attached (API field ${m.api})`);
  }
  if (controls.multi_shots === true) lines.push('- Multi-shot storyboard is ON (per-shot prompts are sent separately).');
  const elements = (controls.kling_elements as Array<{ name: string }> | undefined)?.filter((e) => e?.name) ?? [];
  if (elements.length) lines.push(`- Elements available: ${elements.map((e) => `@${e.name}`).join(', ')} — reference them by these tags.`);
  return lines.length ? lines.join('\n') : '- defaults';
}

async function fetchRatedExamples(supabase: SupabaseClientLike, userId: string, spec: ModelSpec): Promise<string> {
  try {
    const { data } = await supabase
      .from('generations')
      .select('user_prompt, final_prompt, rating, model, model_params')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(60);
    const rows = ((data ?? []) as Array<{ user_prompt: string; final_prompt: string | null; rating: number; model: string; model_params: Record<string, unknown> | null }>)
      .filter((r) => r.model_params?.model_id === spec.id || r.model === spec.name);
    const good = rows.filter((r) => r.rating >= 4).slice(0, 4);
    const bad = rows.filter((r) => r.rating <= 2).slice(0, 2);
    if (!good.length && !bad.length) return '';
    const fmt = (r: typeof rows[number]) => `  • "${(r.final_prompt ?? r.user_prompt).slice(0, 400)}" (${r.rating}★)`;
    return [
      `\n## This user's rated results on ${spec.name}`,
      good.length ? `Worked well — learn the pattern, don't copy:\n${good.map(fmt).join('\n')}` : '',
      bad.length ? `Did not work — avoid these tendencies:\n${bad.map(fmt).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  } catch (e) {
    console.warn('[brain] examples fetch failed', e);
    return '';
  }
}

export function buildSystemPrompt(spec: ModelSpec, useCase: string, controls: Record<string, unknown>, examples = ''): string {
  const family = FAMILY_GUIDES[spec.family] ?? FAMILY_GUIDES[spec.family.split('-')[0]] ?? '';
  const caseMeta = USE_CASES.find((u) => u.id === useCase);
  const caseGuide = useCase !== 'auto' ? USE_CASE_GUIDES[useCase] : '';
  const autoCases = USE_CASES.filter((u) => u.id !== 'auto' && (u.output === 'both' || u.output === spec.output))
    .map((u) => `${u.id} (${u.label})`).join(', ');

  return [
    CORE_RULES,
    `\n# Target model: ${spec.name} (${spec.provider})`,
    `Mode: ${spec.mode}. Output: ${spec.output}.${spec.audio ? ' Generates native audio.' : ' No audio track — never describe sound.'}${spec.promptMax ? ` Hard prompt limit: ${spec.promptMax} characters — stay well under it.` : ''}`,
    `Best at: ${spec.bestFor}`,
    MODE_RULES[spec.mode] ?? '',
    family ? `\n## How to prompt ${spec.name}\n${family}` : '',
    `\n## User's current settings\n${describeSetup(spec, controls)}\nWrite for these settings: match the aspect ratio's framing, fit the action to the duration, and use the attached inputs.`,
    caseGuide
      ? `\n## Use case: ${caseMeta?.label}\n${caseGuide}`
      : `\n## Use case: auto-detect\nInfer the closest use case from the idea and apply its conventions. Options: ${autoCases}.`,
    examples,
    `\n# Output format
Respond with ONLY a JSON object, no code fences:
{"prompt": "<the optimized prompt>", "use_case": "<use case id you applied>", "notes": ["<≤3 short tips about settings or what you changed, each ≤ 14 words>"]}`,
  ].filter(Boolean).join('\n');
}

async function callClaude(model: string, system: string, content: unknown, apiKey: string) {
  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
    }),
  });
}

function parseResult(text: string, fallbackPrompt: string): BrainResult {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      if (typeof obj.prompt === 'string' && obj.prompt.trim()) {
        return {
          prompt: obj.prompt.trim(),
          notes: Array.isArray(obj.notes) ? obj.notes.filter((n: unknown) => typeof n === 'string').slice(0, 3) : [],
          useCase: typeof obj.use_case === 'string' ? obj.use_case : undefined,
        };
      }
    } catch { /* fall through to plain text */ }
  }
  return { prompt: cleaned || fallbackPrompt, notes: [] };
}

/** Returns an optimized prompt, or null if the brain is unavailable. Never throws. */
export async function optimizePrompt(input: BrainInput): Promise<BrainResult | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.warn('[brain] ANTHROPIC_API_KEY not set');
    return null;
  }

  const { spec, prompt, useCase = 'auto', controls = {}, userId, supabase, image } = input;
  const examples = supabase && userId ? await fetchRatedExamples(supabase, userId, spec) : '';
  const system = buildSystemPrompt(spec, useCase, controls, examples);

  const direction = prompt.trim()
    ? `User's idea:\n"""${prompt.trim()}"""`
    : 'No written idea — base the prompt entirely on the image.';
  const task = image
    ? `${direction}\n\nThe attached image is the user's reference. ${spec.mode === 'image-to-video' || spec.mode === 'image-to-image' ? 'It will be sent to the model as an input, so describe only the change/motion — do not re-describe what is already visible.' : 'Capture its subject, style, lighting and composition in the prompt.'}`
    : direction;

  const content = image
    ? [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
        { type: 'text', text: task },
      ]
    : task;

  try {
    let res = await callClaude(PRIMARY_MODEL, system, content, apiKey);
    if (!res.ok && (res.status === 404 || res.status === 400)) {
      console.warn(`[brain] ${PRIMARY_MODEL} → ${res.status}, falling back`);
      res = await callClaude(FALLBACK_MODEL, system, content, apiKey);
    }
    if (!res.ok) {
      console.error('[brain] Claude error', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    const result = parseResult(text, prompt);
    if (spec.promptMax && result.prompt.length > spec.promptMax) {
      result.prompt = result.prompt.slice(0, spec.promptMax);
    }
    return result;
  } catch (e) {
    console.error('[brain] failed', e);
    return null;
  }
}
