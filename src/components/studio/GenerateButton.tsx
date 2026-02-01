import { useState } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { Model } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';
const IMAGE_TO_IMAGE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/image-to-video';

export function GenerateButton() {
  const { createGeneration, updateGeneration, generations } = useGenerations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    mode,
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    uploadedImageUrls,
    addActiveGeneration,
    removeActiveGeneration,
    setCurrentOutput,
    setPendingRating,
    pendingRating,
    currentOutput,
    selectedJobId,
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

  // Note: No global isGenerating check - allows multiple concurrent generations
  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    hasRequiredImages &&
    !isSubmitting; // Only block during the brief submission phase

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

    // Brief submission lock - only while creating DB record
    setIsSubmitting(true);

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
      
      // Immediately select the new job and add to active set
      setSelectedJobId(dbGeneration.id);
      addActiveGeneration(dbGeneration.id);
      
      // Clear previous output state for fresh view
      setCurrentOutput(null);
      setPendingRating(false);
      
      toast.success('Generation started');
    } catch (error) {
      console.error('Failed to create generation:', error);
      const errorDetails = error instanceof Error 
        ? error.message 
        : JSON.stringify(error);
      toast.error(`Generation failed: ${errorDetails}`, { 
        duration: 5000,
        description: 'Check console for details'
      });
      setIsSubmitting(false);
      return;
    }

    // Unlock button immediately after DB record created
    setIsSubmitting(false);

    // Continue with webhook call in background (fire and forget pattern)
    // This allows user to start new generations immediately
    processGeneration(dbGeneration.id, requestId, modelParams, apiModelName);
  };

  // Separate async function for the actual generation processing
  const processGeneration = async (
    generationId: string,
    requestId: string,
    modelParams: Record<string, unknown>,
    apiModelName: string
  ) => {
    try {
      // Update status to 'running' before making the request
      await updateGeneration({
        id: generationId,
        updates: { status: 'running', progress: 25 },
      });

      // Determine webhook URL based on mode
      const webhookUrl = mode === 'image-to-image' ? IMAGE_TO_IMAGE_WEBHOOK_URL : WEBHOOK_URL;

      // Build the webhook payload based on mode
      let webhookPayload: Record<string, unknown>;
      
      if (mode === 'image-to-image') {
        // Build controls based on the specific model
        let imageToImageControls: Record<string, unknown> = { ...modelParams };
        
        // Add default values for Nano Banana Pro I2I
        if (selectedModel === 'nano-banana-pro-i2i') {
          imageToImageControls = {
            aspect_ratio: modelParams.aspect_ratio || '1:1',
            resolution: modelParams.resolution || '1K',
            output_format: modelParams.output_format || 'PNG',
          };
        }
        
        // Image-to-Image payload format
        webhookPayload = {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          generation_type: 'IMAGE_2_IMAGE',
          model: apiModelName,
          raw_prompt: rawPrompt,
          controls: imageToImageControls,
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

      // Only update currentOutput if this is still the selected job
      const currentSelectedId = useGenerationStore.getState().selectedJobId;
      if (currentSelectedId === generationId) {
        setCurrentOutput(output);
      }
      
      // Update generation in database
      await updateGeneration({
        id: generationId,
        updates: {
          status: outputUrl ? 'done' : 'error',
          final_prompt: finalPrompt || null,
          output_url: outputUrl || null,
          error_message: outputUrl ? null : 'No output URL in response',
          progress: outputUrl ? 100 : 0,
        },
      });

      if (outputUrl) {
        toast.success('Generation complete');
        // Show rating panel after successful generation (only if still selected)
        if (currentSelectedId === generationId) {
          setPendingRating(true);
        }
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
        id: generationId,
        updates: {
          status: 'error',
          error_message: errorMessage,
        },
      });
      
      toast.error('Generation failed');
      console.error(error);
    } finally {
      // Remove from active set when done (success or error)
      removeActiveGeneration(generationId);
    }
  };

  // Regenerate using stored data from the selected completed generation
  const handleRegenerateFromJob = async () => {
    if (!selectedGeneration || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Extract original settings from the completed generation
      const originalPrompt = selectedGeneration.user_prompt;
      const originalModelParams = (selectedGeneration.model_params || {}) as Record<string, unknown>;
      const originalType = selectedGeneration.type; // 'image' or 'video'
      const originalModelName = selectedGeneration.model;
      
      // Find the model config by display name
      const originalModelConfig = ALL_MODELS.find(m => m.displayName === originalModelName);
      if (!originalModelConfig) {
        toast.error('Could not find model configuration');
        setIsSubmitting(false);
        return;
      }
      
      // Get API model name
      const apiModelName = MODEL_API_NAMES[originalModelConfig.id];
      
      // Generate new request_id
      const requestId = generateJobId();
      
      // Determine if this was an image-to-image generation
      const isImageToImage = originalModelParams?.image_urls && 
        Array.isArray(originalModelParams.image_urls) && 
        (originalModelParams.image_urls as string[]).length > 0;
      
      // Create new generation in database
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
      
      toast.success('Regeneration started');
      setIsSubmitting(false);
      
      // Process generation with original settings
      processRegenerationFromJob(
        dbGeneration.id, 
        requestId, 
        originalPrompt,
        originalModelParams,
        apiModelName,
        originalModelConfig,
        isImageToImage
      );
      
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast.error('Regeneration failed');
      setIsSubmitting(false);
    }
  };

  // Separate function for processing regeneration with stored settings
  const processRegenerationFromJob = async (
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
        // Determine generation type from model config
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
      
      console.log('Sending regeneration webhook payload:', webhookPayload);

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
          status: outputUrl ? 'done' : 'error',
          final_prompt: finalPrompt || null,
          output_url: outputUrl || null,
          error_message: outputUrl ? null : 'No output URL in response',
          progress: outputUrl ? 100 : 0,
        },
      });

      if (outputUrl) {
        toast.success('Regeneration complete');
        if (currentSelectedId === generationId) {
          setPendingRating(true);
        }
      } else {
        toast.error('No output received');
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
      
      toast.error('Regeneration failed');
      console.error(error);
    } finally {
      removeActiveGeneration(generationId);
    }
  };

  // Check if there's a completed output to show regenerate option
  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  const hasCompletedOutput = selectedGeneration?.status === 'done' && selectedGeneration?.output_url;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={cn(
          "w-full h-12 text-sm font-semibold tracking-wide",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "shadow-md hover:shadow-lg transition-all duration-200",
          "disabled:opacity-50 disabled:shadow-none",
          "rounded-xl"
        )}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
            <span>Starting...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2.5 fill-current" />
            <span>{mode === 'image-to-image' ? 'Transform' : 'Generate'}</span>
          </>
        )}
      </Button>
      
      {hasCompletedOutput && !pendingRating && !isSubmitting && (
        <Button
          variant="ghost"
          onClick={handleRegenerateFromJob}
          disabled={isSubmitting}
          className="w-full h-9 text-xs text-muted-foreground hover:text-foreground transition-smooth"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
          Regenerate with Same Settings
        </Button>
      )}
    </div>
  );
}
