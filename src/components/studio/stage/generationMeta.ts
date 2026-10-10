import { format, isToday, isYesterday } from 'date-fns';
import { getSpec } from '@catalog/index.ts';
import { KNOWN_MODELS } from '@/types/generation';
import { formatCredits } from '@/config/pricing';
import type { DbGeneration } from '@/hooks/useGenerations';
import { getStyle } from '@/config/stylePresets';

/** Keys the backend stores in model_params that aren't user-facing settings. */
const INTERNAL_KEYS = new Set([
  'backend', 'cost_credits', 'cost_usd', 'model_id', 'prompt', 'final_prompt', 'use_case',
  'image_urls', 'input_urls', 'reference_urls', 'callback_url', 'task_id',
]);

const FALLBACK_LABELS: Record<string, string> = {
  aspect_ratio: 'Aspect',
  resolution: 'Size',
  output_format: 'Format',
  num_images: 'Count',
  seed: 'Seed',
  duration: 'Length',
  quality: 'Quality',
  safety_filter_level: 'Safety',
  negative_prompt: 'Negative',
};

export function params(g: DbGeneration): Record<string, unknown> {
  return (g.model_params as Record<string, unknown> | null) ?? {};
}

export function specFor(g: DbGeneration) {
  const p = params(g);
  const id = (typeof p.model_id === 'string' && p.model_id) || KNOWN_MODELS.find((m) => m.displayName === g.model)?.id;
  return id ? getSpec(id) : undefined;
}

/** "12 cr · $0.06" for kie.ai rows, "$0.015" for Higgsfield rows. */
export function costLabel(g: DbGeneration): string | null {
  const p = params(g);
  const usd = typeof p.cost_usd === 'number' && p.cost_usd > 0 ? `$${p.cost_usd < 0.1 ? p.cost_usd.toFixed(3) : p.cost_usd.toFixed(2)}` : null;
  if (p.backend === 'higgsfield') return usd;
  const cr = typeof p.cost_credits === 'number' && p.cost_credits > 0 ? `${formatCredits(p.cost_credits)} cr` : null;
  return [cr, usd].filter(Boolean).join(' · ') || null;
}

/** User-facing settings as label/value chips, labelled from the model spec where possible. */
export function settingChips(g: DbGeneration): Array<{ key: string; label: string; value: string }> {
  const p = params(g);
  const fields = specFor(g)?.fields ?? [];
  const chips: Array<{ key: string; label: string; value: string }> = [];
  for (const [key, raw] of Object.entries(p)) {
    if (INTERNAL_KEYS.has(key) || raw === null || raw === undefined || raw === '') continue;
    if (key === 'style_preset') {
      const style = getStyle(String(raw));
      if (style) chips.push({ key, label: 'Style', value: style.name });
      continue;
    }
    if (Array.isArray(raw) || typeof raw === 'object') continue;
    const field = fields.find((f) => f.key === key || f.api === key);
    const label = field?.label ?? FALLBACK_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    const option = field?.options?.find((o) => o.value === raw);
    const value = option?.label ?? (typeof raw === 'boolean' ? (raw ? 'On' : 'Off') : String(raw));
    if (value.length > 24) continue;
    chips.push({ key, label, value });
  }
  return chips;
}

export function aspectOf(g: DbGeneration): string | null {
  const a = params(g).aspect_ratio;
  return typeof a === 'string' ? a : null;
}

export function modeLabel(g: DbGeneration): string {
  const p = params(g);
  const source = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? 'Image' : 'Text';
  const provider = p.backend === 'higgsfield' ? 'Higgsfield' : 'Kie.ai';
  return `${source} to ${g.type} · ${provider}`;
}

export function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, d MMM');
}

export function timeLabel(d: Date): string {
  return isToday(d) ? format(d, 'h:mm a') : format(d, 'd MMM, h:mm a');
}

export function groupByDay<T extends { created_at: string }>(rows: T[]): Array<{ label: string; rows: T[] }> {
  const groups: Array<{ label: string; rows: T[] }> = [];
  for (const row of rows) {
    const label = dayLabel(new Date(row.created_at));
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}

export const isActive = (g: DbGeneration) => g.status === 'queued' || g.status === 'running';

const FILLER = new Set(['a', 'an', 'the', 'of', 'with', 'and', 'in', 'on', 'at', 'for', 'to', 'shot', 'photo', 'image', 'picture', 'video', 'cinematic', 'editorial', 'photograph']);

const TRAILING = new Set(['a', 'an', 'the', 'of', 'with', 'and', 'in', 'on', 'at', 'for', 'to', 'her', 'his', 'their', 'its', 'my', 'your', 'through', 'from', 'into', 'over', 'under', 'by', 'as', 'is', 'very']);

/** A readable name from the prompt, used until the AI title arrives (or for old rows). */
export function fallbackTitle(prompt: string): string {
  const first = prompt.split(/[.,;:\n]/)[0] ?? prompt;
  const words = first.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);
  let start = 0;
  while (start < words.length - 1 && FILLER.has(words[start].toLowerCase())) start++;
  const slice = words.slice(start, start + 7);
  // End on a content word, not "a", "of", "her"…
  while (slice.length > 2 && TRAILING.has(slice[slice.length - 1].toLowerCase())) slice.pop();
  const picked = slice.join(' ');
  if (!picked) return 'Untitled';
  return picked.charAt(0).toUpperCase() + picked.slice(1);
}

export function displayTitle(g: DbGeneration): string {
  return g.title?.trim() || fallbackTitle(g.user_prompt);
}

/** Filename-safe slug of the generation's name. */
export function fileSlug(g: DbGeneration): string {
  return displayTitle(g).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'promunch-output';
}
