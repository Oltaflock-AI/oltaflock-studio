import { create } from 'zustand';
import type { 
  GenerationMode, 
  Model, 
  GenerationType, 
  JobEntry,
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
  
  // Uploaded Image URLs (for Image → Image)
  uploadedImageUrls: string[];
  setUploadedImageUrls: (urls: string[]) => void;
  addUploadedImageUrl: (url: string) => void;
  removeUploadedImageUrl: (index: number) => void;
  clearUploadedImageUrls: () => void;
  
  // Character IDs (Sora 2 Pro)
  characterIds: string[];
  addCharacterId: (id: string) => void;
  removeCharacterId: (index: number) => void;
  clearCharacterIds: () => void;
  
  // Generation State - now per-job instead of global
  activeGenerationIds: Set<string>;
  addActiveGeneration: (id: string) => void;
  removeActiveGeneration: (id: string) => void;
  isAnyGenerating: () => boolean;
  
  // Legacy alias for backward compatibility (returns true if any active)
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  
  // Current Output
  currentOutput: {
    jobId: string;
    outputUrl: string;
    refinedPrompt: string;
  } | null;
  setCurrentOutput: (output: { jobId: string; outputUrl: string; refinedPrompt: string } | null) => void;
  
  // Prompt Brain (enhancement toggle)
  enhancePromptEnabled: boolean;
  setEnhancePromptEnabled: (enabled: boolean) => void;

  // Pending Rating
  pendingRating: boolean;
  setPendingRating: (pending: boolean) => void;
  
  // Jobs (formerly History)
  jobs: JobEntry[];
  addJob: (job: JobEntry) => void;
  updateJob: (jobId: string, updates: Partial<JobEntry>) => void;
  updateJobByJobId: (jobId: string, updates: Partial<JobEntry>) => void;
  deleteJob: (id: string) => void; // Soft delete
  getActiveJobs: () => JobEntry[];
  
  // Legacy aliases for backward compatibility
  history: JobEntry[];
  addHistoryEntry: (entry: JobEntry) => void;
  updateHistoryRating: (id: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  updateHistoryStatus: (id: string, status: JobStatus, error?: string) => void;
  
  // Selected Job (for detail view)
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  
  // Legacy alias
  selectedHistoryId: string | null;
  setSelectedHistoryId: (id: string | null) => void;
  
  // Reset
  resetForm: () => void;
  
  // Clear all state (for logout)
  clearAll: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Current Mode
  mode: 'image',
  setMode: (mode) => set({ 
    mode, 
    selectedModel: null, 
    generationType: mode === 'image' ? 'text-to-image' : mode === 'video' ? 'text-to-video' : 'image-to-image',
    controls: {},
    referenceFiles: [],
    uploadedImageUrls: [],
    characterIds: [],
    currentOutput: null,
    pendingRating: false,
  }),
  
  // Selected Model
  selectedModel: null,
  setSelectedModel: (model) => set({ 
    selectedModel: model, 
    controls: {},
    referenceFiles: [],
    uploadedImageUrls: [],
    characterIds: [],
  }),
  
  // Generation Type
  generationType: null,
  setGenerationType: (type) => set({ 
    generationType: type,
    referenceFiles: [],
    uploadedImageUrls: [],
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
  
  // Uploaded Image URLs
  uploadedImageUrls: [],
  setUploadedImageUrls: (urls) => set({ uploadedImageUrls: urls }),
  addUploadedImageUrl: (url) => set((state) => ({
    uploadedImageUrls: [...state.uploadedImageUrls, url].slice(0, 8)
  })),
  removeUploadedImageUrl: (index) => set((state) => ({
    uploadedImageUrls: state.uploadedImageUrls.filter((_, i) => i !== index)
  })),
  clearUploadedImageUrls: () => set({ uploadedImageUrls: [] }),
  
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
  
  // Generation State - per-job tracking
  activeGenerationIds: new Set<string>(),
  addActiveGeneration: (id) => set((state) => {
    const newSet = new Set(state.activeGenerationIds);
    newSet.add(id);
    return { activeGenerationIds: newSet, isGenerating: newSet.size > 0 };
  }),
  removeActiveGeneration: (id) => set((state) => {
    const newSet = new Set(state.activeGenerationIds);
    newSet.delete(id);
    return { activeGenerationIds: newSet, isGenerating: newSet.size > 0 };
  }),
  isAnyGenerating: () => get().activeGenerationIds.size > 0,
  
  // Legacy compatibility - derived from activeGenerationIds
  isGenerating: false,
  setIsGenerating: () => {},
  
  // Current Output
  currentOutput: null,
  setCurrentOutput: (output) => set({ currentOutput: output }),
  
  // Prompt Brain
  enhancePromptEnabled: true,
  setEnhancePromptEnabled: (enabled) => set({ enhancePromptEnabled: enabled }),

  // Pending Rating
  pendingRating: false,
  setPendingRating: (pending) => set({ pendingRating: pending }),
  
  // Jobs
  jobs: [],
  addJob: (job) => set((state) => ({
    jobs: [job, ...state.jobs],
    selectedJobId: job.id,
  })),
  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === id ? { ...job, ...updates } : job
    ),
  })),
  updateJobByJobId: (jobId, updates) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.jobId === jobId ? { ...job, ...updates } : job
    ),
  })),
  deleteJob: (id) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === id ? { ...job, deleted: true, status: 'deleted' as JobStatus } : job
    ),
    selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
  })),
  getActiveJobs: () => get().jobs.filter((job) => !job.deleted),
  
  // Legacy aliases (computed from jobs)
  get history() {
    return get().jobs.filter((job) => !job.deleted);
  },
  addHistoryEntry: (entry) => {
    const jobEntry: JobEntry = {
      ...entry,
      deleted: false,
    };
    set((state) => ({
      jobs: [jobEntry, ...state.jobs],
      selectedJobId: jobEntry.id,
    }));
  },
  updateHistoryRating: (id, rating) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === id ? { ...job, rating } : job
    ),
    pendingRating: false,
  })),
  updateHistoryStatus: (id, status, error) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === id ? { ...job, status, error } : job
    ),
  })),
  
  // Selected Job
  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  
  // Legacy alias
  get selectedHistoryId() {
    return get().selectedJobId;
  },
  setSelectedHistoryId: (id) => set({ selectedJobId: id }),
  
  // Reset
  resetForm: () => set({
    rawPrompt: '',
    controls: {},
    referenceFiles: [],
    uploadedImageUrls: [],
    characterIds: [],
    currentOutput: null,
    pendingRating: false,
  }),
  
  // Clear all state (for logout)
  clearAll: () => set({
    mode: 'image',
    selectedModel: null,
    generationType: null,
    rawPrompt: '',
    controls: {},
    referenceFiles: [],
    uploadedImageUrls: [],
    characterIds: [],
    activeGenerationIds: new Set<string>(),
    isGenerating: false,
    currentOutput: null,
    pendingRating: false,
    jobs: [],
    selectedJobId: null,
  }),
}));
