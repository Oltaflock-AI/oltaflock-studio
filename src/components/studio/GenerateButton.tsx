import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buttonTap, buttonHover } from '@/lib/motion';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { useUserCredits } from '@/hooks/useUserCredits';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { Model } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateCost } from '@/config/pricing';

export function GenerateButton() {
  const { createGeneration, updateGeneration, generations } = useGenerations();
  const { balance, deductCredits } = useUserCredits();
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

    // Calculate cost for this generation
    const cost = calculateCost(selectedModel, modelParams);

    // Check if user has enough credits
    if (balance !== null && cost.credits > 0 && balance < cost.credits) {
      toast.error(`Insufficient credits. You have ${balance} but need ${cost.credits}.`);
      setIsSubmitting(false);
      return;
    }

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
          cost_credits: cost.credits,
          cost_usd: cost.usd,
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

    // Call edge function in background (fire and forget)
    processGeneration(dbGeneration.id, modelParams);
  };

  // Call the generate edge function
  const processGeneration = async (
    generationId: string,
    modelParams: Record<string, unknown>,
  ) => {
    try {
      const { enhancePromptEnabled } = useGenerationStore.getState();

      console.log('[generate] Invoking edge function:', { model: selectedModel, generationId });

      // Clean controls - remove undefined values that break JSON serialization
      const cleanControls: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(modelParams)) {
        if (v !== undefined) cleanControls[k] = v;
      }
      cleanControls.cost_credits = calculateCost(selectedModel!, modelParams).credits;

      const invokeBody = {
        prompt: rawPrompt,
        model: selectedModel,
        type: generationType,
        controls: cleanControls,
        generationId,
        enhancePromptEnabled,
        ...(mode === 'image-to-image' && uploadedImageUrls.length > 0
          ? { imageUrls: uploadedImageUrls }
          : {}),
      };

      console.log('[generate] Invoke body:', JSON.stringify(invokeBody).slice(0, 500));

      const { data, error } = await supabase.functions.invoke('generate', {
        body: invokeBody,
      });

      // supabase-js wraps non-2xx as error but real details may be in data
      if (error) {
        const detail = data?.error || data?.detail || error.message || 'Edge function call failed';
        console.error('[generate] Edge function error:', { error, data });
        throw new Error(detail);
      }

      console.log('[generate] Edge function response:', data);

      // Edge function handles DB updates (status, output_url, credits)
      // Client just needs to handle UI state
      if (data?.output_url) {
        // Sync result - already saved to DB by edge function
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
        if (mode === 'image-to-image') {
          clearUploadedImageUrls();
        }
      } else if (data?.task_id) {
        // Async result - edge function stored task_id, polling will pick it up
        toast.info('Generation submitted, waiting for results...');
        return; // Don't remove from active set
      } else if (data?.error) {
        toast.error(`Generation failed: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[generate] Error:', errorMessage);

      // Update DB with error (edge function may not have done it if it crashed)
      await updateGeneration({
        id: generationId,
        updates: { status: 'error', error_message: errorMessage },
      });

      toast.error('Generation failed');
    } finally {
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

  // Process regeneration via edge function (mirrors processGeneration flow)
  const processRegenerationFromJob = async (
    generationId: string,
    _requestId: string,
    prompt: string,
    modelParams: Record<string, unknown>,
    _apiModelName: string,
    modelConfig: typeof ALL_MODELS[0],
    isImageToImage: boolean
  ) => {
    try {
      const { enhancePromptEnabled } = useGenerationStore.getState();
      const cost = calculateCost(modelConfig.id, modelParams);

      // Clean undefined values + extract image_urls separately
      const cleanControls: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(modelParams)) {
        if (v !== undefined && k !== 'image_urls') cleanControls[k] = v;
      }
      cleanControls.cost_credits = cost.credits;

      const imageUrls = isImageToImage ? (modelParams.image_urls as string[]) : undefined;

      console.log('[regenerate] Invoking edge function:', { model: modelConfig.id, generationId });

      const { data, error } = await supabase.functions.invoke('generate', {
        body: {
          prompt,
          model: modelConfig.id,
          type: modelConfig.generationTypes[0] || 'text-to-image',
          controls: cleanControls,
          generationId,
          enhancePromptEnabled,
          ...(imageUrls && imageUrls.length > 0 ? { imageUrls } : {}),
        },
      });

      if (error) {
        const detail = (data as { error?: string; detail?: string } | null)?.error
          ?? (data as { error?: string; detail?: string } | null)?.detail
          ?? error.message
          ?? 'Edge function call failed';
        console.error('[regenerate] Edge function error:', { error, data });
        throw new Error(detail);
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
        toast.success('Regeneration complete');
      } else if (data?.task_id) {
        toast.info('Regeneration submitted, waiting for results...');
        return;
      } else if (data?.error) {
        toast.error(`Regeneration failed: ${data.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[regenerate] Error:', errorMessage);
      await updateGeneration({
        id: generationId,
        updates: { status: 'error', error_message: errorMessage },
      });
      toast.error('Regeneration failed');
    } finally {
      removeActiveGeneration(generationId);
    }
  };

  // Check if there's a completed output to show regenerate option
  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  const hasCompletedOutput = selectedGeneration?.status === 'done' && selectedGeneration?.output_url;

  return (
    <div className="space-y-3">
      <motion.div whileTap={canGenerate ? buttonTap : undefined} whileHover={canGenerate ? buttonHover : undefined}>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "w-full h-12 text-base font-bold tracking-wide",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "shadow-md hover:shadow-lg transition-all duration-200",
            "disabled:opacity-50 disabled:shadow-none"
          )}
          size="lg"
        >
        <AnimatePresence mode="wait" initial={false}>
          {isSubmitting ? (
            <motion.span
              key="submitting"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center"
            >
              <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
              Starting...
            </motion.span>
          ) : (
            <motion.span
              key="generate"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center"
            >
              <Play className="h-4 w-4 mr-2.5 fill-current" />
              {mode === 'image-to-image' ? 'Transform' : 'Generate'}
            </motion.span>
          )}
        </AnimatePresence>
        </Button>
      </motion.div>

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
