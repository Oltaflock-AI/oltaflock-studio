// Turns a ModelSpec + studio controls into a kie.ai request, and normalizes
// every kie.ai status response shape into one TaskStatus.

import type { ApiKind, FieldSpec, MediaSlot, ModelSpec } from './types.ts';

export const KIE_BASE = 'https://api.kie.ai/api/v1';

interface ApiEndpoints {
  create: string;
  status: string;
}

export const API_ENDPOINTS: Record<ApiKind, ApiEndpoints> = {
  market: { create: '/jobs/createTask', status: '/jobs/recordInfo' },
  veo: { create: '/veo/generate', status: '/veo/record-info' },
  'veo-extend': { create: '/veo/extend', status: '/veo/record-info' },
  gpt4o: { create: '/gpt4o-image/generate', status: '/gpt4o-image/record-info' },
  kontext: { create: '/flux/kontext/generate', status: '/flux/kontext/record-info' },
  runway: { create: '/runway/generate', status: '/runway/record-detail' },
  aleph: { create: '/aleph/generate', status: '/aleph/record-info' },
};

type Controls = Record<string, unknown>;

/** kie.ai response/callback bodies: shapes vary per API family and are probed defensively. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KieData = any;

function isVisible(rule: FieldSpec['when'] | MediaSlot['when'], controls: Controls, spec: ModelSpec): boolean {
  if (!rule) return true;
  const field = spec.fields.find((f) => f.key === rule.key);
  const value = controls[rule.key] ?? field?.default;
  return rule.in.includes(value as string | number | boolean);
}

/** Resolved value of a field (explicit control or its default). */
export function fieldValue(field: FieldSpec, controls: Controls): unknown {
  const v = controls[field.key];
  return v === undefined || v === '' ? field.default : v;
}

export function visibleFields(spec: ModelSpec, controls: Controls): FieldSpec[] {
  return spec.fields.filter((f) => isVisible(f.when, controls, spec));
}

export function visibleMedia(spec: ModelSpec, controls: Controls): MediaSlot[] {
  return spec.media.filter((m) => isVisible(m.when, controls, spec));
}

/** Media slot values live in controls under `media.<slotKey>` as string[]. */
export function mediaValue(slot: MediaSlot, controls: Controls): string[] {
  const v = controls[`media.${slot.key}`];
  return Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
}

/** Builds the flat input object (prompt + fields + media) for a model. */
export function buildInput(spec: ModelSpec, prompt: string, controls: Controls): Record<string, unknown> {
  const input: Record<string, unknown> = { ...(spec.fixed ?? {}) };

  const trimmed = spec.noPrompt ? '' : prompt.trim();
  if (trimmed) {
    input[spec.promptKey ?? 'prompt'] = spec.promptMax ? trimmed.slice(0, spec.promptMax) : trimmed;
  }

  for (const field of visibleFields(spec, controls)) {
    let value = fieldValue(field, controls);
    if (value === undefined || value === null || value === '') continue;
    if (field.omitIf !== undefined && value === field.omitIf) continue;
    if (field.type === 'seed' && (value === -1 || value === '-1')) continue;
    if (field.cast === 'string') value = String(value);
    if (field.cast === 'number') value = Number(value);
    input[field.api ?? field.key] = value;
  }

  for (const slot of visibleMedia(spec, controls)) {
    const urls = mediaValue(slot, controls).slice(0, slot.max);
    if (urls.length === 0) continue;
    // Several slots may feed one array param (e.g. Kling start + end frame → image_urls).
    const existing = input[slot.api];
    input[slot.api] = slot.single ? urls[0] : Array.isArray(existing) ? [...existing, ...urls] : urls;
  }

  if (spec.editors?.includes('kling-multishot') && controls.multi_shots === true) {
    const shots = ((controls.multi_prompt as Array<{ prompt: string; duration: number }>) ?? [])
      .filter((s) => s?.prompt?.trim())
      .slice(0, 5)
      .map((s) => ({ prompt: s.prompt.trim(), duration: Number(s.duration) || 3 }));
    if (shots.length > 0) {
      input.multi_shots = true;
      input.multi_prompt = shots;
      delete input.prompt;
      input.duration = String(shots.reduce((sum, s) => sum + s.duration, 0));
    }
  }

  if (spec.editors?.includes('kling-elements')) {
    const elements = ((controls.kling_elements as Array<{ name: string; description: string; element_input_urls: string[] }>) ?? [])
      .filter((el) => el?.name && el.element_input_urls?.length >= 2)
      .slice(0, 3)
      .map((el) => ({
        name: el.name,
        description: el.description || '',
        element_input_urls: el.element_input_urls.slice(0, 4),
      }));
    if (elements.length > 0) input.kling_elements = elements;
  }

  return input;
}

/** Full request body for kie.ai. Market API nests under `input`; the rest are flat. */
export function buildRequestBody(
  spec: ModelSpec,
  prompt: string,
  controls: Controls,
  callbackUrl: string,
): Record<string, unknown> {
  const input = buildInput(spec, prompt, controls);
  if (spec.api === 'market') {
    return { model: spec.kieModel, callBackUrl: callbackUrl, input };
  }
  const body: Record<string, unknown> = { ...input, callBackUrl: callbackUrl };
  if (spec.kieModel) body.model = spec.kieModel;
  return body;
}

export function validateSpecInput(spec: ModelSpec, prompt: string, controls: Controls): string | null {
  if (!spec.noPrompt && spec.promptRequired !== false && !prompt.trim() && !(controls.multi_shots === true)) {
    return `${spec.name} needs a prompt`;
  }
  if (spec.editors?.includes('kling-multishot') && controls.multi_shots === true) {
    const shots = ((controls.multi_prompt as Array<{ prompt: string }>) ?? []).filter((s) => s?.prompt?.trim());
    if (shots.length === 0) return 'Multi-shot is on — write at least one shot';
  }
  for (const slot of visibleMedia(spec, controls)) {
    const n = mediaValue(slot, controls).length;
    if (slot.min && n < slot.min) return `${slot.label}: add at least ${slot.min} file${slot.min > 1 ? 's' : ''}`;
    if (n > slot.max) return `${slot.label}: max ${slot.max} file${slot.max > 1 ? 's' : ''}`;
  }
  return null;
}

// ─── Status normalization ────────────────────────────────────────────────────

export interface TaskStatus {
  state: 'running' | 'success' | 'fail';
  urls: string[];
  error?: string;
  progress?: number;
}

function parseMaybeJson(v: unknown): KieData {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

function collectUrls(...candidates: unknown[]): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (!v) return;
    if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      push(o.resultUrl ?? o.url ?? o.videoUrl ?? o.imageUrl);
    }
  };
  candidates.forEach(push);
  return [...new Set(out)];
}

/** Normalizes any kie.ai record-info payload (`data` object) into TaskStatus. */
export function parseTaskStatus(api: ApiKind, data: KieData): TaskStatus {
  if (!data) return { state: 'running', urls: [] };

  if (api === 'market') {
    const result = parseMaybeJson(data.resultJson);
    const urls = collectUrls(result?.resultUrls, result?.resultUrl, result?.url);
    if (data.state === 'success') return { state: 'success', urls };
    if (data.state === 'fail') return { state: 'fail', urls: [], error: data.failMsg || 'Generation failed' };
    return { state: 'running', urls: [], progress: typeof data.progress === 'number' ? data.progress : undefined };
  }

  if (api === 'gpt4o') {
    const urls = collectUrls(data.response?.resultUrls);
    if (data.status === 'SUCCESS') return { state: 'success', urls };
    if (data.status === 'CREATE_TASK_FAILED' || data.status === 'GENERATE_FAILED' || data.successFlag === 2) {
      return { state: 'fail', urls: [], error: data.errorMessage || 'Generation failed' };
    }
    const p = Number.parseFloat(data.progress);
    return { state: 'running', urls: [], progress: Number.isFinite(p) ? Math.round(p * 100) : undefined };
  }

  if (api === 'runway' || api === 'aleph') {
    const urls = collectUrls(data.videoInfo?.videoUrl, data.response?.resultVideoUrl, data.response?.resultUrls);
    const state = String(data.state ?? '').toLowerCase();
    if (state === 'success' || data.successFlag === 1) return { state: 'success', urls };
    if (state === 'fail' || data.successFlag === 2 || data.successFlag === 3) {
      return { state: 'fail', urls: [], error: data.failMsg || data.errorMessage || 'Generation failed' };
    }
    return { state: 'running', urls: [] };
  }

  // veo / veo-extend / kontext share the successFlag convention
  const response = parseMaybeJson(data.response);
  const urls = collectUrls(response?.resultUrls, response?.resultImageUrl, response?.originImageUrl, response?.fullResultUrls);
  if (data.successFlag === 1) return { state: 'success', urls };
  if (data.successFlag === 2 || data.successFlag === 3) {
    return { state: 'fail', urls: [], error: data.errorMessage || data.failMsg || 'Generation failed' };
  }
  return { state: 'running', urls: [] };
}

/** Parses a kie.ai callback body — shapes differ per API, so check them all. */
export function parseCallback(api: ApiKind, body: KieData): { taskId?: string; status: TaskStatus } {
  const data = body?.data ?? body;
  const taskId = data?.taskId ?? data?.task_id ?? body?.taskId;
  // Callback bodies for market mirror record-info; others carry `code` 200 on success.
  if (api === 'market') return { taskId, status: parseTaskStatus('market', data) };

  const urls = collectUrls(
    data?.info?.resultUrls, data?.info?.resultImageUrl, data?.info?.videoUrl,
    data?.response?.resultUrls, data?.resultUrls, data?.videoInfo?.videoUrl, data?.video_url, data?.resultInfoJson?.resultUrls,
  );
  if (body?.code === 200 && urls.length > 0) return { taskId, status: { state: 'success', urls } };
  if (body?.code && body.code !== 200) return { taskId, status: { state: 'fail', urls: [], error: body.msg || 'Generation failed' } };
  return { taskId, status: parseTaskStatus(api, data) };
}
