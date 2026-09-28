import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSpec } from '@catalog/index.ts';
import { casesForOutput } from '@catalog/use-cases.ts';
import { useGenerationStore } from '@/store/generationStore';
import { toStudioMode } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';

interface EnhanceResponse {
  enhanced_prompt: string;
  notes?: string[];
  use_case?: string;
}

export interface Suggestion {
  prompt: string;
  notes: string[];
  useCase?: string;
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Prompt Brain: rewrite the prompt for the selected model, or write one from an
 * image, as a suggestion the user can apply, retry or discard (with undo).
 */
export function usePromptBrain() {
  const { rawPrompt, setRawPrompt, pendingRating, selectedModel, mode, controls, brainUseCase, setBrainUseCase } = useGenerationStore();
  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  const output = toStudioMode(mode).endsWith('video') ? 'video' : 'image';
  const useCases = casesForOutput(output);
  const useCase = useCases.some((u) => u.id === brainUseCase) ? brainUseCase : 'auto';

  const [busy, setBusy] = useState<'text' | 'image' | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const disabled = pendingRating || busy !== null;
  const firstImage = Object.entries(controls)
    .filter(([k, v]) => k.startsWith('media.') && Array.isArray(v))
    .flatMap(([, v]) => v as string[])
    .find((u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u));

  const callBrain = async (body: Record<string, unknown>, kind: 'text' | 'image') => {
    if (!selectedModel) {
      toast.error('Pick a model first — the brain tunes prompts per model');
      return;
    }
    setBusy(kind);
    try {
      const { data, error } = await supabase.functions.invoke<EnhanceResponse>('enhance-prompt', {
        body: {
          prompt: rawPrompt,
          model: selectedModel,
          mode: toStudioMode(mode),
          use_case: useCase,
          controls,
          ...body,
        },
      });
      if (error || !data?.enhanced_prompt) throw new Error(error?.message ?? 'No response from brain');
      setSuggestion({ prompt: data.enhanced_prompt, notes: data.notes ?? [], useCase: data.use_case });
    } catch (err) {
      console.error('Brain error:', err);
      toast.error('Prompt Brain failed — try again');
    } finally {
      setBusy(null);
    }
  };

  const optimize = () => {
    if (!rawPrompt.trim()) {
      toast.error('Write a rough idea first');
      return;
    }
    callBrain({ type: 'text' }, 'text');
  };

  const analyzeImage = async (file?: File) => {
    let blob: Blob | undefined = file;
    if (!blob && firstImage) {
      try {
        blob = await (await fetch(firstImage)).blob();
      } catch {
        toast.error('Could not load your uploaded image');
        return;
      }
    }
    if (!blob) {
      imageInputRef.current?.click();
      return;
    }
    if (blob.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB for analysis');
      return;
    }
    const base64 = await fileToBase64(blob);
    callBrain({ type: 'image', image_base64: base64, image_media_type: blob.type || 'image/jpeg' }, 'image');
  };

  const apply = () => {
    if (!suggestion) return;
    setPreviousPrompt(rawPrompt);
    setRawPrompt(suggestion.prompt);
    setSuggestion(null);
  };

  const discard = () => setSuggestion(null);
  const restore = () => {
    if (previousPrompt === null) return;
    setRawPrompt(previousPrompt);
    setPreviousPrompt(null);
  };

  return {
    rawPrompt, setRawPrompt, spec, output, useCases, useCase, setBrainUseCase,
    busy, disabled, suggestion, previousPrompt, firstImage, imageInputRef,
    optimize, analyzeImage, apply, discard, restore,
  };
}
