import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { Model } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';
const IMAGE_TO_IMAGE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/image-to-video';

export function GenerateButton() {
  const { createGeneration, updateGeneration } = useGenerations();
  const {
    mode,
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    uploadedImageUrls,
    isGenerating,
    setIsGenerating,
    setCurrentOutput,
    setPendingRating,
    pendingRating,
    currentOutput,
    setSelectedJobId,
    clearUploadedImageUrls,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  // Image-to-Image requires uploaded images
  const hasRequiredImages = mode === 'image-to-image' ? uploadedImageUrls.length > 0 : true;
  
  // Validate specific model requirements for Image-to-Image
  const validateImageRequirements = () => {
    if (mode !== 'image-to-image') return true;
    
    if (selectedModel === 'qwen-image-edit' && uploadedImageUrls.length !== 1) {
      toast.error('Qwen Image Edit requires exactly 1 image');
      return false;
    }
    
    if ((selectedModel === 'flux-flex-i2i' || selectedModel === 'flux-pro-i2i') && 
        (uploadedImageUrls.length < 1 || uploadedImageUrls.length > 8)) {
      toast.error('Flux requires 1-8 images');
      return false;
    }
    
    return true;
  };

  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    hasRequiredImages &&
    !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate || !modelConfig) return;
    
    if (!validateImageRequirements()) return;

    // Validate required fields for specific models
    if (selectedModel === 'veo-3.1') {
      if (!controls.variant) {
        toast.error('Variant is required for Veo 3.1');
        return;
      }
      if (!controls.aspectRatio) {
        toast.error('Aspect ratio is required for Veo 3.1');
        return;
      }
    }

    if (selectedModel === 'z-image' && !controls.aspectRatio) {
      toast.error('Aspect ratio is required for Z Image');
      return;
    }

    if ((selectedModel === 'flux-flex' || selectedModel === 'flux-flex-pro')) {
      if (!controls.aspectRatio) {
        toast.error('Aspect ratio is required for Flux');
        return;
      }
      if (!controls.resolution) {
        toast.error('Resolution is required for Flux');
        return;
      }
    }

    // Validate Image-to-Image model controls
    if (selectedModel === 'seedream-4.5-edit') {
      if (!controls.aspect_ratio) {
        toast.error('Aspect ratio is required for Seedream 4.5 Edit');
        return;
      }
      if (!controls.quality) {
        toast.error('Quality is required for Seedream 4.5 Edit');
        return;
      }
    }

    if (selectedModel === 'flux-flex-i2i' || selectedModel === 'flux-pro-i2i') {
      if (!controls.aspect_ratio) {
        toast.error('Aspect ratio is required');
        return;
      }
      if (!controls.resolution) {
        toast.error('Resolution is required');
        return;
      }
    }

    // Clear previous state immediately for blank screen
    setSelectedJobId(null);
    setCurrentOutput(null);
    setPendingRating(false);
    setIsGenerating(true);

    // Generate unique request_id with required format
    const requestId = generateJobId();
    
    // Build model_params object from controls
    const modelParams = { ...controls };
    
    // Get API model name
    const apiModelName = MODEL_API_NAMES[selectedModel as Model];

    // Determine the correct type for database
    const dbType = mode === 'image-to-image' ? 'image' : mode;

    // Create generation in database with 'queued' status
    let dbGeneration;
    try {
      dbGeneration = await createGeneration({
        request_id: requestId,
        type: dbType as 'image' | 'video',
        model: modelConfig.displayName,
        user_prompt: rawPrompt,
        final_prompt: null,
        status: 'queued',
        output_url: null,
        error_message: null,
        model_params: {
          ...modelParams,
          image_urls: mode === 'image-to-image' ? uploadedImageUrls : undefined,
        },
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

      // Determine webhook URL based on mode
      const webhookUrl = mode === 'image-to-image' ? IMAGE_TO_IMAGE_WEBHOOK_URL : WEBHOOK_URL;

      // Build the webhook payload based on mode
      let webhookPayload: Record<string, unknown>;
      
      if (mode === 'image-to-image') {
        // Image-to-Image payload format
        webhookPayload = {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          generation_type: 'IMAGE_2_IMAGE',
          model: apiModelName,
          raw_prompt: rawPrompt,
          controls: modelParams,
          image_urls: uploadedImageUrls,
        };
      } else {
        // Text-to-Image / Text-to-Video payload format
        webhookPayload = {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model: `${apiModelName}-${generationType}`,
          generation_type: generationType === 'text-to-image' ? 'TEXT_2_IMAGE' : 'TEXT_2_VIDEO',
          raw_prompt: rawPrompt,
          controls: modelParams,
        };
      }

      console.log('Sending generation webhook payload:', webhookPayload);

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
      
      const output = {
        jobId: requestId,
        outputUrl,
        refinedPrompt: finalPrompt,
      };

      setCurrentOutput(output);
      
      // Update generation in database
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
        // Show rating panel after successful generation
        setPendingRating(true);
        // Clear uploaded images after successful generation
        if (mode === 'image-to-image') {
          clearUploadedImageUrls();
        }
      } else {
        toast.error('No output received');
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

  // Get button text based on mode
  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (mode === 'image-to-image') return 'Transform';
    return 'Generate';
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
            {getButtonText()}
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            {getButtonText()}
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
