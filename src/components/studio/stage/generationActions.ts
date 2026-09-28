import { toast } from 'sonner';
import { specBackend, specsForMode } from '@catalog/index.ts';
import type { DbGeneration } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { fromStudioMode } from '@/types/generation';
import { params, specFor } from './generationMeta';
import { getSpec } from '@catalog/index.ts';
import { getStyle } from '@/config/stylePresets';

/** Load a past generation's prompt, mode, provider, model, settings and media back into the composer. */
export function reuseGeneration(g: DbGeneration) {
  const spec = specFor(g);
  const store = useGenerationStore.getState();
  if (!spec) {
    store.setRawPrompt(g.user_prompt);
    toast.info('Prompt loaded. That model is no longer in the catalog, so pick another.');
    return;
  }
  usePreferencesStore.getState().setStudioBackend(specBackend(spec));
  store.setMode(fromStudioMode(spec.mode));
  store.setSelectedModel(spec.id as never);
  const keys = new Set(spec.fields.map((f) => f.key));
  for (const [k, v] of Object.entries(params(g))) {
    if (keys.has(k) || k.startsWith('media.')) store.setControl(k, v as never);
  }
  const style = params(g).style_preset;
  store.setStylePreset(typeof style === 'string' ? style : null);
  store.setRawPrompt(g.user_prompt);
  toast.success(`Loaded ${spec.name} with the same settings`);
}

/** Set the composer up to animate this image with the first image-to-video model. */
export function animateGeneration(g: DbGeneration) {
  if (!g.output_url || g.type !== 'image') return;
  const backend = usePreferencesStore.getState().studioBackend;
  const spec = specsForMode('image-to-video', backend).find((s) => s.media.some((m) => m.kind === 'image'));
  if (!spec) {
    toast.error('No image-to-video model is available for this provider');
    return;
  }
  const store = useGenerationStore.getState();
  store.setMode(fromStudioMode('image-to-video'));
  store.setSelectedModel(spec.id as never);
  const slot = spec.media.find((m) => m.kind === 'image')!;
  store.setControl(`media.${slot.key}`, [g.output_url] as never);
  store.setRawPrompt('');
  document.getElementById('studio-prompt')?.focus();
  toast.success(`Ready to animate with ${spec.name}. Describe the motion.`);
}

/**
 * Make a style preset active (or clear it with null). If the style suits an
 * aspect ratio and the current model offers it, switch to that too.
 */
export function applyStylePreset(id: string | null) {
  const store = useGenerationStore.getState();
  store.setStylePreset(id);
  const style = getStyle(id);
  const spec = store.selectedModel ? getSpec(store.selectedModel) : undefined;
  const aspect = spec?.fields.find((f) => f.key === 'aspect_ratio');
  if (style?.aspect && aspect?.options?.some((o) => o.value === style.aspect)) {
    store.setControl('aspect_ratio', style.aspect as never);
  }
}
