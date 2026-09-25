// "What next?" actions on a finished generation: reuse its setup, or feed its
// output into another mode (animate an image, edit it, upscale it).

import { getSpec } from '@catalog/index.ts';
import type { ModelSpec, StudioMode } from '@catalog/types.ts';
import { useGenerationStore, defaultModelFor } from '@/store/generationStore';
import { findModelConfig, fromStudioMode } from '@/types/generation';
import type { DbGeneration } from '@/hooks/useGenerations';

/** Bookkeeping keys stored in model_params that aren't user settings. */
const META_KEYS = new Set(['model_id', 'use_case', 'cost_credits', 'cost_usd', 'image_urls']);

function focusPrompt() {
  requestAnimationFrame(() => (document.getElementById('studio-prompt') as HTMLTextAreaElement | null)?.focus());
}

/** First upload slot of the given kind — required slots win (start frame, image to edit…). */
function primarySlot(spec: ModelSpec, kind: 'image' | 'video') {
  return spec.media.find((m) => m.kind === kind && (m.min ?? 0) > 0) ?? spec.media.find((m) => m.kind === kind);
}

/** Loads a past generation's model, prompt and settings back into the console. */
export function reuseGeneration(gen: DbGeneration) {
  const params = (gen.model_params ?? {}) as Record<string, unknown>;
  const config = findModelConfig(gen.model, params);
  const store = useGenerationStore.getState();
  if (!config) {
    store.setRawPrompt(gen.user_prompt);
    focusPrompt();
    return false;
  }
  store.setMode(config.mode);
  store.setSelectedModel(config.id);
  for (const [k, v] of Object.entries(params)) {
    if (!META_KEYS.has(k) && v !== undefined) store.setControl(k, v);
  }
  // Generations from before the catalog stored input images as image_urls.
  const legacyImages = params.image_urls;
  const spec = getSpec(config.id);
  const slot = spec && primarySlot(spec, 'image');
  if (Array.isArray(legacyImages) && legacyImages.length && slot && !params[`media.${slot.key}`]) {
    store.setControl(`media.${slot.key}`, legacyImages.slice(0, slot.max));
  }
  if (typeof params.use_case === 'string') store.setBrainUseCase(params.use_case);
  store.setRawPrompt(gen.user_prompt);
  focusPrompt();
  return true;
}

/**
 * Switches to `mode`, picks `preferredModel` (or the user's last model there),
 * and drops `url` into that model's main upload slot. Keeps the prompt.
 */
function sendTo(mode: StudioMode, url: string, kind: 'image' | 'video', preferredModel?: string): string | null {
  const store = useGenerationStore.getState();
  const genMode = fromStudioMode(mode);
  store.setMode(genMode);
  const id = preferredModel ?? defaultModelFor(genMode, store.lastModelByMode);
  const spec = id ? getSpec(id) : undefined;
  if (!spec) return null;
  store.setSelectedModel(spec.id);
  const slot = primarySlot(spec, kind);
  if (slot) store.setControl(`media.${slot.key}`, [url]);
  focusPrompt();
  return spec.name;
}

export const animateImage = (url: string) => sendTo('image-to-video', url, 'image');
export const editImage = (url: string) => sendTo('image-to-image', url, 'image');
export const upscaleImage = (url: string) => sendTo('image-to-image', url, 'image', 'topaz-image-upscale');
export const upscaleVideo = (url: string) => sendTo('video-to-video', url, 'video', 'topaz-video-upscale');
export const editVideo = (url: string) => sendTo('video-to-video', url, 'video');
