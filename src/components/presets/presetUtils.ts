import { useCallback, useEffect, useState } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, TYPE_LABELS } from '@/types/generation';
import type { GenerationType, Model } from '@/types/generation';
import { getModelIdentity, MODEL_FAMILIES } from '@/config/models';
import type { LibraryItem } from '@/types/library';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && VIDEO_EXT.test(url);
}

/** True when the model id maps to a model the Studio can actually select. */
export function isKnownModel(modelId: string | null | undefined): boolean {
  return !!modelId && ALL_MODELS.some((m) => m.id === modelId);
}

/** Human label for a preset's model, falling back to the raw id when unknown. */
export function modelLabel(modelId: string | null | undefined): string {
  if (!modelId) return 'Any model';
  const family = modelId.replace(/-i2i$|-i2v$/, '');
  if (MODEL_FAMILIES[family]) return getModelIdentity(modelId).label;
  return ALL_MODELS.find((m) => m.id === modelId)?.displayName ?? modelId;
}

export function typeLabel(type: GenerationType | null | undefined): string | null {
  return type ? TYPE_LABELS[type] ?? null : null;
}

export interface ApplyPresetResult {
  modelLoaded: boolean;
}

/**
 * Loads a preset's prompt, mode, generation type, model and saved controls
 * into the generation store. Mirrors LibraryDetailDialog's "Use this prompt"
 * so both entry points behave identically. Models that no longer exist are
 * skipped — the prompt and mode still load and the user picks a model.
 */
export function applyPresetToStore(item: LibraryItem): ApplyPresetResult {
  const store = useGenerationStore.getState();
  const modelConfig = ALL_MODELS.find((m) => m.id === item.model);

  store.resetForm();

  // Prefer the model's own mode so the Studio's model list matches the
  // selection; fall back to the preset's stored mode.
  const mode = modelConfig?.mode ?? item.mode ?? 'image';
  store.setMode(mode);

  let genType: GenerationType | null = item.generation_type ?? null;
  if (modelConfig && (!genType || !modelConfig.generationTypes.includes(genType))) {
    genType = modelConfig.generationTypes[0] ?? genType;
  }
  if (genType) store.setGenerationType(genType);

  if (modelConfig) {
    store.setSelectedModel(modelConfig.id as Model);
    if (item.model_params) {
      Object.entries(item.model_params).forEach(([k, v]) => store.setControl(k, v));
    }
  }

  store.setRawPrompt(item.prompt);

  return { modelLoaded: !!modelConfig };
}

const FAVORITES_KEY = 'oltaflock:preset-favorites';

function readFavorites(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Per-browser favorite presets. There is no favorites column on
 * prompt_library_items yet, so this is a local convenience only.
 */
export function usePresetFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavorites());

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      // storage unavailable (private mode etc.) — favorites stay in memory
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
