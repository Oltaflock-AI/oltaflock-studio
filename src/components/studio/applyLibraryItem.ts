import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, type Model } from '@/types/generation';
import type { LibraryItem } from '@/types/library';

/** Loads a saved/curated prompt-library item into the Studio console. */
export function applyLibraryItem(item: LibraryItem) {
  const store = useGenerationStore.getState();
  const modelConfig = ALL_MODELS.find((m) => m.id === item.model);

  store.resetForm();
  store.setMode(item.mode);
  store.setGenerationType(item.generation_type);
  if (modelConfig) {
    store.setSelectedModel(modelConfig.id as Model);
  }
  store.setRawPrompt(item.prompt);

  if (item.model_params) {
    Object.entries(item.model_params).forEach(([k, v]) => store.setControl(k, v));
  }
}
