import { create } from 'zustand';
import type { 
  GenerationMode, 
  Model, 
  GenerationType, 
  HistoryEntry,
  JobStatus
} from '@/types/generation';

interface GenerationState {
  // Current Mode
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  
  // Selected Model
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  
  // Generation Type
  generationType: GenerationType | null;
  setGenerationType: (type: GenerationType | null) => void;
  
  // Raw Prompt
  rawPrompt: string;
  setRawPrompt: (prompt: string) => void;
  
  // Model Controls
  controls: Record<string, unknown>;
  setControl: (key: string, value: unknown) => void;
  resetControls: () => void;
  
  // Reference Files
  referenceFiles: File[];
  addReferenceFiles: (files: File[]) => void;
  removeReferenceFile: (index: number) => void;
  clearReferenceFiles: () => void;
  
  // Character IDs (Sora 2 Pro)
  characterIds: string[];
  addCharacterId: (id: string) => void;
  removeCharacterId: (index: number) => void;
  clearCharacterIds: () => void;
  
  // Generation State
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  
  // Current Output
  currentOutput: {
    jobId: string;
    outputUrl: string;
    refinedPrompt: string;
  } | null;
  setCurrentOutput: (output: { jobId: string; outputUrl: string; refinedPrompt: string } | null) => void;
  
  // Pending Rating
  pendingRating: boolean;
  setPendingRating: (pending: boolean) => void;
  
  // History
  history: HistoryEntry[];
  addHistoryEntry: (entry: HistoryEntry) => void;
  updateHistoryRating: (id: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  updateHistoryStatus: (id: string, status: JobStatus, error?: string) => void;
  
  // Selected History Entry (for metadata panel)
  selectedHistoryId: string | null;
  setSelectedHistoryId: (id: string | null) => void;
  
  // Reset
  resetForm: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Current Mode
  mode: 'image',
  setMode: (mode) => set({ 
    mode, 
    selectedModel: null, 
    generationType: null,
    controls: {},
    referenceFiles: [],
    characterIds: [],
    currentOutput: null,
    pendingRating: false,
  }),
  
  // Selected Model
  selectedModel: null,
  setSelectedModel: (model) => set({ 
    selectedModel: model, 
    generationType: null,
    controls: {},
    referenceFiles: [],
    characterIds: [],
  }),
  
  // Generation Type
  generationType: null,
  setGenerationType: (type) => set({ 
    generationType: type,
    referenceFiles: [],
  }),
  
  // Raw Prompt
  rawPrompt: '',
  setRawPrompt: (prompt) => set({ rawPrompt: prompt }),
  
  // Model Controls
  controls: {},
  setControl: (key, value) => set((state) => ({
    controls: { ...state.controls, [key]: value }
  })),
  resetControls: () => set({ controls: {} }),
  
  // Reference Files
  referenceFiles: [],
  addReferenceFiles: (files) => set((state) => {
    const newFiles = [...state.referenceFiles, ...files].slice(0, 8);
    return { referenceFiles: newFiles };
  }),
  removeReferenceFile: (index) => set((state) => ({
    referenceFiles: state.referenceFiles.filter((_, i) => i !== index)
  })),
  clearReferenceFiles: () => set({ referenceFiles: [] }),
  
  // Character IDs
  characterIds: [],
  addCharacterId: (id) => set((state) => {
    if (state.characterIds.length >= 5) return state;
    return { characterIds: [...state.characterIds, id] };
  }),
  removeCharacterId: (index) => set((state) => ({
    characterIds: state.characterIds.filter((_, i) => i !== index)
  })),
  clearCharacterIds: () => set({ characterIds: [] }),
  
  // Generation State
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  
  // Current Output
  currentOutput: null,
  setCurrentOutput: (output) => set({ currentOutput: output }),
  
  // Pending Rating
  pendingRating: false,
  setPendingRating: (pending) => set({ pendingRating: pending }),
  
  // History
  history: [],
  addHistoryEntry: (entry) => set((state) => ({
    history: [entry, ...state.history],
    selectedHistoryId: entry.id,
  })),
  updateHistoryRating: (id, rating) => set((state) => ({
    history: state.history.map((entry) =>
      entry.id === id ? { ...entry, rating } : entry
    ),
    pendingRating: false,
  })),
  updateHistoryStatus: (id, status, error) => set((state) => ({
    history: state.history.map((entry) =>
      entry.id === id ? { ...entry, status, error } : entry
    ),
  })),
  
  // Selected History Entry
  selectedHistoryId: null,
  setSelectedHistoryId: (id) => set({ selectedHistoryId: id }),
  
  // Reset
  resetForm: () => set({
    rawPrompt: '',
    controls: {},
    referenceFiles: [],
    characterIds: [],
    currentOutput: null,
    pendingRating: false,
  }),
}));
