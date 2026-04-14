import { useState } from 'react';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, generateJobId } from '@/types/generation';
import type { Model } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { calculateCost } from '@/config/pricing';
import { toast } from 'sonner';

export function useRetryGeneration() {
  const { createGeneration, updateGeneration, generations } = useGenerations();
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    selectedJobId,
    setSelectedJobId,
    addActiveGeneration,
    removeActiveGeneration,
    setCurrentOutput,
    setPendingRating,
    enhancePromptEnabled,
  } = useGenerationStore();

  const selectedGeneration = generations.find(g => g.id === selectedJobId);

  const retry = async () => {
    if (!selectedGeneration || isRetrying) return;

    setIsRetrying(true);

    try {
      const originalPrompt = selectedGeneration.user_prompt;
      const originalModelParams = (selectedGeneration.model_params || {}) as Record<string, unknown>;
      const originalType = selectedGeneration.type;
      const originalModelName = selectedGeneration.model;

      const originalModelConfig = ALL_MODELS.find(m => m.displayName === originalModelName);
      if (!originalModelConfig) {
        toast.error('Could not find model configuration');
        setIsRetrying(false);
        return;
      }

      const requestId = generateJobId();
      const isImageToImage = originalModelParams?.image_urls &&
        Array.isArray(originalModelParams.image_urls) &&
        (originalModelParams.image_urls as string[]).length > 0;

      const dbGeneration = await createGeneration({
        request_id: requestId,
        type: originalType as 'image' | 'video',
        model: originalModelName,
        user_prompt: originalPrompt,
        final_prompt: null,
        status: 'queued',
        output_url: null,
        error_message: null,
        model_params: originalModelParams,
      });

      setSelectedJobId(dbGeneration.id);
      addActiveGeneration(dbGeneration.id);
      setCurrentOutput(null);
      setPendingRating(false);

      toast.success('Retry started');
      setIsRetrying(false);

      // Process via edge function in background
      processRetry(
        dbGeneration.id,
        originalPrompt,
        originalModelParams,
        originalModelConfig.id as Model,
        originalModelConfig.generationTypes[0] || 'text-to-image',
        isImageToImage ? (originalModelParams.image_urls as string[]) : undefined,
      );

    } catch (error) {
      console.error('Failed to retry:', error);
      toast.error('Retry failed');
      setIsRetrying(false);
    }
  };

  const processRetry = async (
    generationId: string,
    prompt: string,
    modelParams: Record<string, unknown>,
    modelId: Model,
    generationType: string,
    imageUrls?: string[],
  ) => {
    try {
      const cost = calculateCost(modelId, modelParams);

      const { data, error } = await supabase.functions.invoke('generate', {
        body: {
          prompt,
          model: modelId,
          type: generationType,
          controls: {
            ...modelParams,
            cost_credits: cost.credits,
          },
          generationId,
          enhancePromptEnabled,
          imageUrls,
        },
      });

      if (error) {
        throw new Error(error.message || 'Edge function call failed');
      }

      if (data?.output_url) {
        const currentSelectedId = useGenerationStore.getState().selectedJobId;
        if (currentSelectedId === generationId) {
          setCurrentOutput({
            jobId: generationId,
            outputUrl: data.output_url,
            refinedPrompt: data.enhanced_prompt || '',
          });
          setPendingRating(true);
        }
        toast.success('Generation complete');
      } else if (data?.task_id) {
        toast.info('Retry submitted, waiting for results...');
        return;
      } else if (data?.error) {
        toast.error(`Retry failed: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[retry] Error:', errorMessage);

      await updateGeneration({
        id: generationId,
        updates: { status: 'error', error_message: errorMessage },
      });

      toast.error('Retry failed');
    } finally {
      removeActiveGeneration(generationId);
    }
  };

  const canRetry = selectedGeneration?.status === 'error' || selectedGeneration?.status === 'done';

  return {
    retry,
    isRetrying,
    canRetry,
  };
}
