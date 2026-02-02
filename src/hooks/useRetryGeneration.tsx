import { useState } from 'react';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { Model } from '@/types/generation';
import { toast } from 'sonner';

const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';
const IMAGE_TO_IMAGE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/image-to-video';

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
      
      const apiModelName = MODEL_API_NAMES[originalModelConfig.id as Model];
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
      
      // Process in background
      processRetry(
        dbGeneration.id, 
        requestId, 
        originalPrompt,
        originalModelParams,
        apiModelName,
        originalModelConfig,
        isImageToImage
      );
      
    } catch (error) {
      console.error('Failed to retry:', error);
      toast.error('Retry failed');
      setIsRetrying(false);
    }
  };

  const processRetry = async (
    generationId: string,
    requestId: string,
    prompt: string,
    modelParams: Record<string, unknown>,
    apiModelName: string,
    modelConfig: typeof ALL_MODELS[0],
    isImageToImage: boolean
  ) => {
    try {
      await updateGeneration({
        id: generationId,
        updates: { status: 'running', progress: 25 },
      });
      
      const webhookUrl = isImageToImage ? IMAGE_TO_IMAGE_WEBHOOK_URL : WEBHOOK_URL;
      
      let webhookPayload: Record<string, unknown>;
      
      if (isImageToImage) {
        const imageUrls = modelParams.image_urls || [];
        const controls = { ...modelParams };
        delete controls.image_urls;
        
        webhookPayload = {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          generation_type: 'IMAGE_2_IMAGE',
          model: apiModelName,
          raw_prompt: prompt,
          controls,
          image_urls: imageUrls,
        };
      } else {
        const genType = modelConfig.generationTypes[0] || 'text-to-image';
        
        webhookPayload = {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model: `${apiModelName}-${genType}`,
          generation_type: genType === 'text-to-image' ? 'TEXT_2_IMAGE' : 'TEXT_2_VIDEO',
          raw_prompt: prompt,
          controls: modelParams,
        };
      }
      
      console.log('Sending retry webhook payload:', webhookPayload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      let outputUrl = '';
      let finalPrompt = '';
      
      if (data.data?.resultJson) {
        try {
          const resultJson = typeof data.data.resultJson === 'string' 
            ? JSON.parse(data.data.resultJson) 
            : data.data.resultJson;
          
          if (resultJson.resultUrls && resultJson.resultUrls.length > 0) {
            outputUrl = resultJson.resultUrls[0];
          }
        } catch (e) {
          console.error('Failed to parse resultJson:', e);
        }
      }
      
      if (!outputUrl && data.output_url) {
        outputUrl = data.output_url;
      }
      
      finalPrompt = data.refined_prompt || data.data?.refined_prompt || '';
      
      // Check for external taskId
      const externalTaskId = data.taskId || data.data?.taskId || data.task_id;

      // Decision logic for how to handle the response
      if (outputUrl) {
        const output = {
          jobId: requestId,
          outputUrl,
          refinedPrompt: finalPrompt,
        };

        const currentSelectedId = useGenerationStore.getState().selectedJobId;
        if (currentSelectedId === generationId) {
          setCurrentOutput(output);
        }
        
        await updateGeneration({
          id: generationId,
          updates: {
            status: 'done',
            final_prompt: finalPrompt || null,
            output_url: outputUrl,
            progress: 100,
          },
        });

        toast.success('Generation complete');
        if (currentSelectedId === generationId) {
          setPendingRating(true);
        }
      } else if (externalTaskId) {
        await updateGeneration({
          id: generationId,
          updates: {
            status: 'running',
            progress: 50,
            external_task_id: externalTaskId,
            final_prompt: finalPrompt || null,
          },
        });
        
        toast.info('Retry submitted, waiting for results...');
        return;
      } else {
        await updateGeneration({
          id: generationId,
          updates: {
            status: 'error',
            error_message: 'No task ID or output URL in response',
          },
        });
        toast.error('Retry failed - no task assigned');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateGeneration({
        id: generationId,
        updates: {
          status: 'error',
          error_message: errorMessage,
        },
      });
      
      toast.error('Generation failed');
      console.error(error);
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
