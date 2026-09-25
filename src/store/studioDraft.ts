// Keeps the Studio console (mode, model, prompt, settings, uploads, Prompt
// Brain choices) across reloads. Signing out runs clearAll(), which saves the
// reset state, so nothing leaks to the next person on this browser.

import { getSpec } from '@catalog/index.ts';
import { useGenerationStore, defaultModelFor } from './generationStore';
import { toStudioMode, type GenerationMode } from '@/types/generation';

const KEY = 'oltaflock-studio-draft-v1';
const MODES: GenerationMode[] = ['image', 'video', 'image-to-image', 'image-to-video', 'video-to-video'];

interface Draft {
  mode: GenerationMode;
  selectedModel: string | null;
  rawPrompt: string;
  controls: Record<string, unknown>;
  brainUseCase: string;
  enhancePromptEnabled: boolean;
  lastModelByMode: Record<string, string>;
}

function restore() {
  let saved: Partial<Draft> | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return;
  }
  if (!saved || !MODES.includes(saved.mode as GenerationMode)) return;

  const mode = saved.mode as GenerationMode;
  const lastModelByMode = Object.fromEntries(
    Object.entries(saved.lastModelByMode ?? {}).filter(([, id]) => !!getSpec(id)),
  );
  // Drop a model that no longer exists or belongs to another mode.
  const spec = saved.selectedModel ? getSpec(saved.selectedModel) : undefined;
  const modelOk = spec?.mode === toStudioMode(mode);

  useGenerationStore.setState({
    mode,
    generationType: toStudioMode(mode),
    lastModelByMode,
    selectedModel: modelOk ? spec!.id : defaultModelFor(mode, lastModelByMode),
    controls: modelOk && saved.controls && typeof saved.controls === 'object' ? saved.controls : {},
    rawPrompt: typeof saved.rawPrompt === 'string' ? saved.rawPrompt : '',
    brainUseCase: typeof saved.brainUseCase === 'string' ? saved.brainUseCase : 'auto',
    enhancePromptEnabled: saved.enhancePromptEnabled ?? true,
  });
}

let started = false;

export function initStudioDraftPersistence() {
  if (started) return;
  started = true;
  restore();

  let timer: ReturnType<typeof setTimeout> | undefined;
  useGenerationStore.subscribe((s) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const draft: Draft = {
        mode: s.mode,
        selectedModel: s.selectedModel,
        rawPrompt: s.rawPrompt,
        controls: s.controls,
        brainUseCase: s.brainUseCase,
        enhancePromptEnabled: s.enhancePromptEnabled,
        lastModelByMode: s.lastModelByMode,
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(draft));
      } catch {
        // Storage full or blocked — the draft just won't survive a reload.
      }
    }, 300);
  });
}
