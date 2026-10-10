import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Backend } from '@catalog/types.ts';

interface AssistantState {
  backend: Backend;
  output: 'image' | 'video';
  /** Target model; null = "help me choose". */
  modelId: string | null;
  activeChatId: string | null;
  /** Let the assistant add to / tidy its memory. */
  learn: boolean;
  setBackend: (backend: Backend) => void;
  setOutput: (output: 'image' | 'video') => void;
  setModelId: (modelId: string | null) => void;
  setActiveChatId: (id: string | null) => void;
  setLearn: (learn: boolean) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      backend: 'kie',
      output: 'image',
      modelId: null,
      activeChatId: null,
      learn: true,
      setBackend: (backend) => set({ backend, modelId: null }),
      setOutput: (output) => set({ output }),
      setModelId: (modelId) => set({ modelId }),
      // A new chat starts on auto-pick; otherwise the last chat's model would stick to every new idea.
      setActiveChatId: (activeChatId) => set(activeChatId ? { activeChatId } : { activeChatId: null, modelId: null }),
      setLearn: (learn) => set({ learn }),
    }),
    { name: 'promunch-studio-assistant' },
  ),
);
