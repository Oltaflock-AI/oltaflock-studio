import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { Model } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';
const GPT4O_API_URL = 'https://api.kie.ai/api/v1/gpt4o-image/generate';
const N8N_CALLBACK_URL = 'https://directive-ai.app.n8n.cloud/webhook/gpt4o-callback';

export function GenerateButton() {
  const { createGeneration, updateGeneration } = useGenerations();
  const {
    mode,
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    isGenerating,
    setIsGenerating,
    setCurrentOutput,
    setPendingRating,
    pendingRating,
    currentOutput,
    setSelectedJobId,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  // Text-to-image and text-to-video don't require reference media
  const hasRequiredFiles = true;

  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    hasRequiredFiles &&
    !isGenerating;

  const handleGPT4oGenerate = async (requestId: string, dbGenerationId: string) => {
    // GPT-4o uses dedicated KIE API
    const response = await fetch(GPT4O_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: KIE_API_KEY should be configured in edge function for production
        // For now, the callback will be used for result retrieval
      },
      body: JSON.stringify({
        prompt: rawPrompt,
        size: (controls.size as string) || '1:1',
        callBackUrl: N8N_CALLBACK_URL,
        isEnhance: (controls.isEnhance as boolean) || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`GPT-4o API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // GPT-4o returns task_id, result comes via callback
    // Update status to running - n8n callback will update to done
    if (data.taskId || data.data?.taskId) {
      toast.info('GPT-4o generation started - waiting for callback');
      return { outputUrl: '', finalPrompt: '' };
    }
    
    // Direct result (if API returns immediately)
    let outputUrl = '';
    if (data.data?.info?.result_urls && data.data.info.result_urls.length > 0) {
      outputUrl = data.data.info.result_urls[0];
    } else if (data.result_urls && data.result_urls.length > 0) {
      outputUrl = data.result_urls[0];
    }
    
    return { outputUrl, finalPrompt: '' };
  };

  const handleStandardGenerate = async (requestId: string, apiModelName: string, modelParams: Record<string, unknown>) => {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: requestId,
        mode,
        model: apiModelName,
        generation_type: generationType,
        raw_prompt: rawPrompt,
        controls: modelParams,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the response - handle nested resultJson structure
    let outputUrl = '';
    let finalPrompt = '';
    
    // Check for nested resultJson (from n8n webhook)
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
    
    // Fallback to direct output_url if present
    if (!outputUrl && data.output_url) {
      outputUrl = data.output_url;
    }
    
    // Get final prompt from response
    finalPrompt = data.refined_prompt || data.data?.refined_prompt || '';
    
    return { outputUrl, finalPrompt };
  };

  const handleGenerate = async () => {
    if (!canGenerate || !modelConfig) return;

    setIsGenerating(true);
    setCurrentOutput(null);

    // Generate unique request_id with required format
    const requestId = generateJobId();
    
    // Build model_params object from controls
    const modelParams = { ...controls };
    
    // Get API model name (e.g., "seedream/4.5-text-to-image")
    const apiModelName = `${MODEL_API_NAMES[selectedModel as Model]}-${generationType}`;

    // Create generation in database with 'queued' status
    let dbGeneration;
    try {
      dbGeneration = await createGeneration({
        request_id: requestId,
        type: mode,
        model: modelConfig.displayName,
        user_prompt: rawPrompt,
        final_prompt: null,
        status: 'queued',
        output_url: null,
        error_message: null,
        model_params: modelParams,
      });
      
      setSelectedJobId(dbGeneration.id);
    } catch (error) {
      console.error('Failed to create generation:', error);
      toast.error('Failed to create generation');
      setIsGenerating(false);
      return;
    }

    try {
      // Update status to 'running' before making the request
      await updateGeneration({
        id: dbGeneration.id,
        updates: { status: 'running' },
      });

      let outputUrl = '';
      let finalPrompt = '';

      // Route to appropriate API based on model
      if (selectedModel === 'gpt-4o') {
        const result = await handleGPT4oGenerate(requestId, dbGeneration.id);
        outputUrl = result.outputUrl;
        finalPrompt = result.finalPrompt;
      } else {
        const result = await handleStandardGenerate(requestId, apiModelName, modelParams);
        outputUrl = result.outputUrl;
        finalPrompt = result.finalPrompt;
      }
      
      const output = {
        jobId: requestId,
        outputUrl,
        refinedPrompt: finalPrompt,
      };

      setCurrentOutput(output);
      
      // Update generation in database
      // For GPT-4o with callback, status stays 'running' until callback updates it
      if (selectedModel === 'gpt-4o' && !outputUrl) {
        // GPT-4o is async via callback - keep status as running
        toast.info('Generation in progress - results will appear when ready');
      } else {
        await updateGeneration({
          id: dbGeneration.id,
          updates: {
            status: outputUrl ? 'done' : 'error',
            final_prompt: finalPrompt || null,
            output_url: outputUrl || null,
            error_message: outputUrl ? null : 'No output URL in response',
          },
        });

        if (outputUrl) {
          toast.success('Generation complete');
        } else {
          toast.error('No output received');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateGeneration({
        id: dbGeneration.id,
        updates: {
          status: 'error',
          error_message: errorMessage,
        },
      });
      
      toast.error('Generation failed');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!canGenerate) return;
    // Regenerate creates a NEW request_id
    await handleGenerate();
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="flex-1"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Generate
          </>
        )}
      </Button>
      
      {currentOutput && !pendingRating && (
        <Button
          variant="secondary"
          onClick={handleRegenerate}
          disabled={isGenerating}
          size="lg"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      )}
    </div>
  );
}
