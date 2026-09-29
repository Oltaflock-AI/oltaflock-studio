import { toast } from 'sonner';
import { specBackend, specsForMode } from '@catalog/index.ts';
import type { DbGeneration } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { fromStudioMode } from '@/types/generation';
import { params, specFor } from './generationMeta';
import { getSpec } from '@catalog/index.ts';
import { getStyle } from '@/config/stylePresets';
import type { StudioElement } from '@/hooks/useElements';

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

/**
 * Add a past generation's output as reference media for the next generation.
 * Uses the current model if it has a free slot of the right kind; otherwise
 * switches to a model that takes references, preferring the same family
 * (Nano Banana Pro → Nano Banana Pro Edit) and the current provider.
 */
export function referenceGeneration(g: DbGeneration) {
  if (!g.output_url || g.status !== 'done') return;
  const kind = g.type === 'video' ? 'video' : 'image';
  attachReferences([g.output_url], kind, `this ${kind}`);
}

/** An element's images as references for the next generation ("@Name" in the prompt). */
export function referenceElement(e: Pick<StudioElement, 'name' | 'image_urls'>, { quiet = false } = {}) {
  return attachReferences(e.image_urls, 'image', `@${e.name}`, { quiet });
}

/**
 * Adds reference media to the current model's slots of the right kind, or
 * switches to a model that takes it (see referenceGeneration). Returns false
 * when no model for the provider accepts that kind of reference.
 */
export function attachReferences(
  sources: string[],
  kind: 'image' | 'video',
  what: string,
  { quiet = false }: { quiet?: boolean } = {},
): boolean {
  const store = useGenerationStore.getState();
  const current = store.selectedModel ? getSpec(store.selectedModel) : undefined;

  /** Fills free slots; 'none' when the spec has no slot of this kind. */
  const addTo = (spec: NonNullable<typeof current>): 'added' | 'present' | 'none' => {
    const slots = spec.media.filter((m) => m.kind === kind);
    if (slots.length === 0) return 'none';
    let pending = sources.filter((u) => {
      const controls = useGenerationStore.getState().controls;
      return !slots.some((slot) => ((controls[`media.${slot.key}`] as string[] | undefined) ?? []).includes(u));
    });
    if (pending.length === 0) return 'present';
    for (const slot of slots) {
      const key = `media.${slot.key}`;
      const urls = (useGenerationStore.getState().controls[key] as string[] | undefined) ?? [];
      const room = slot.max - urls.length;
      if (room <= 0 || pending.length === 0) continue;
      useGenerationStore.getState().setControl(key, [...urls, ...pending.slice(0, room)] as never);
      pending = pending.slice(room);
    }
    if (pending.length > 0 && !quiet) toast.info(`${spec.name} has no room for ${pending.length} more reference${pending.length === 1 ? '' : 's'}`);
    return 'added';
  };

  const onCurrent = current ? addTo(current) : 'none';
  if (onCurrent === 'present') {
    if (!quiet) toast.info(`${what} is already attached`);
    return true;
  }
  if (onCurrent === 'added' && current) {
    if (!quiet) toast.success(`Added ${what} as a reference for ${current.name}`, studioAction());
    return true;
  }

  const backend = usePreferencesStore.getState().studioBackend;
  const output = current ? (current.mode.endsWith('video') ? 'video' : 'image') : 'image';
  const mode = kind === 'video' ? 'video-to-video' : output === 'video' ? 'image-to-video' : 'image-to-image';
  const candidates = specsForMode(mode, backend).filter((s) => s.media.some((m) => m.kind === kind));
  const target =
    candidates.find((s) => current && s.name === `${current.name} Edit`) ??
    candidates.find((s) => current && s.family === current.family) ??
    candidates[0];
  if (!target) {
    if (!quiet) toast.error(`No model for this provider takes a reference ${kind}`);
    return false;
  }
  store.setMode(fromStudioMode(mode));
  store.setSelectedModel(target.id as never);
  addTo(target);
  document.getElementById('studio-prompt')?.focus();
  if (!quiet) toast.success(`Switched to ${target.name} with ${what} as a reference`, studioAction());
  return true;
}

/** Outside the Studio, offer a jump back to it (client-side, keeping the composer state). */
function studioAction() {
  if (window.location.pathname === '/') return undefined;
  return {
    action: {
      label: 'Open Studio',
      onClick: () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    },
  };
}
