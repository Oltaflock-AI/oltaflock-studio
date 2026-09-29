import { useEffect, useRef, useState } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_MODELS, findModelConfig, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import { getSpec } from '@catalog/index.ts';
import { validateSpecInput } from '@catalog/adapters.ts';
import type { Model } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHiggsfieldEstimate } from '@/hooks/useHiggsfield';
import { calculateCost } from '@/config/pricing';
import { autoNameGeneration } from '@/hooks/useGenerationTitles';
import { composeStylePrompt, getStyle, styleAppliesTo } from '@/config/stylePresets';
import { elementsInPrompt, expandElements, useElements } from '@/hooks/useElements';
import { referenceElement } from '@/components/studio/stage/generationActions';

/**
 * Everything behind the Generate button: validation, the DB row, the edge
 * function call, regenerate-from-job and the global Cmd/Ctrl+Enter shortcut.
 * Shared by the console button and the Studio prompt dock.
 */
export function useGenerate({ shortcut = false }: { shortcut?: boolean } = {}) {
  const { createGeneration, updateGeneration, generations } = useGenerations();
  const { balance } = useUserCredits();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { elements } = useElements();
  
  const {
    mode,
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    addActiveGeneration,
    removeActiveGeneration,
    setCurrentOutput,
    setPendingRating,
    pendingRating,
    currentOutput,
    selectedJobId,
    setSelectedJobId,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  const { data: hfEstimate } = useHiggsfieldEstimate(spec, rawPrompt, controls);
  const isMultiShot = controls.multi_shots === true;

  // Note: No global isGenerating check - allows multiple concurrent generations
  const canGenerate =
    selectedModel &&
    generationType &&
    (rawPrompt.trim() || isMultiShot || spec?.promptRequired === false || spec?.noPrompt) &&
    !isSubmitting; // Only block during the brief submission phase

  const handleGenerate = async () => {
    if (!canGenerate || !modelConfig || !spec) return;

    // "@Name" elements: make sure their images ride along as references.
    const used = elementsInPrompt(rawPrompt, elements);
    if (used.length > 0) {
      if (!spec.media.some((m) => m.kind === 'image')) {
        // Switches to a model that takes references; let the user check it before spending credits.
        if (referenceElement(used[0])) {
          used.slice(1).forEach((e) => referenceElement(e, { quiet: true }));
          toast.info(`${spec.name} can't use reference images, so I switched models for @${used[0].name}. Check the settings, then generate.`);
        }
        return;
      }
      used.forEach((e) => referenceElement(e, { quiet: true }));
    }
    const controls = useGenerationStore.getState().controls;

    const problem = validateSpecInput(spec, rawPrompt, controls);
    if (problem) {
      toast.error(problem);
      return;
    }

    // Brief submission lock - only while creating DB record
    setIsSubmitting(true);

    // Generate unique request_id with required format
    const requestId = generateJobId();
    
    // Build model_params object from controls
    const picked = getStyle(useGenerationStore.getState().stylePresetId);
    const style = picked && styleAppliesTo(picked, spec.output) ? picked : undefined;
    const modelParams: Record<string, unknown> = {
      ...controls,
      ...(style ? { style_preset: style.id } : {}),
      ...(used.length ? { elements: used.map((e) => e.name) } : {}),
    };
    
    const dbType = spec.output;

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
          model_id: selectedModel,
          use_case: useGenerationStore.getState().brainUseCase,
          cost_credits: cost.credits,
          cost_usd: spec.api === 'higgsfield' ? (hfEstimate?.usd ?? null) : cost.usd,
          backend: spec.backend ?? 'kie',
          ...(spec.api === 'higgsfield' && hfEstimate?.credits !== undefined ? { hf_credits: hfEstimate.credits } : {}),
        },
      });
      
      // Immediately select the new job and add to active set
      setSelectedJobId(dbGeneration.id);
      addActiveGeneration(dbGeneration.id);

      // Clear previous output state for fresh view
      setCurrentOutput(null);
      setPendingRating(false);

      toast.success('Generation started');

      // Name it from the prompt in the background; the list refreshes when it lands.
      autoNameGeneration(dbGeneration)
        .then((title) => title && queryClient.invalidateQueries({ queryKey: ['generations'] }))
        .catch(() => undefined);
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
      const { enhancePromptEnabled, brainUseCase } = useGenerationStore.getState();

      console.log('[generate] Invoking edge function:', { model: selectedModel, generationId });

      // Clean controls - remove undefined values that break JSON serialization
      const cleanControls: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(modelParams)) {
        if (v !== undefined) cleanControls[k] = v;
      }
      cleanControls.cost_credits = calculateCost(selectedModel!, modelParams).credits;

      const invokeBody = {
        prompt: composeStylePrompt(expandElements(rawPrompt, elements), modelParams.style_preset as string | undefined),
        model: selectedModel,
        type: generationType,
        controls: cleanControls,
        generationId,
        enhancePromptEnabled,
        useCase: brainUseCase,
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
      // kie.ai charges when the task is created — refresh the live balance.
      queryClient.invalidateQueries({ queryKey: ['live-credit-balance'] });

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
      
      const originalModelConfig = findModelConfig(originalModelName, originalModelParams);
      if (!originalModelConfig) {
        toast.error('Could not find model configuration');
        setIsSubmitting(false);
        return;
      }
      
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
        title: selectedGeneration.title ?? null,
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
        if (v !== undefined) cleanControls[k] = v;
      }
      cleanControls.cost_credits = cost.credits;

      const imageUrls = isImageToImage ? (modelParams.image_urls as string[]) : undefined;

      console.log('[regenerate] Invoking edge function:', { model: modelConfig.id, generationId });

      const { data, error } = await supabase.functions.invoke('generate', {
        body: {
          prompt: composeStylePrompt(expandElements(prompt, elements), modelParams.style_preset as string | undefined),
          model: modelConfig.id,
          type: modelConfig.generationTypes[0] || 'text-to-image',
          controls: cleanControls,
          generationId,
          enhancePromptEnabled,
          useCase: modelParams.use_case,
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

  // ⌘/Ctrl+Enter generates from anywhere in the Studio.
  const generateRef = useRef(handleGenerate);
  generateRef.current = handleGenerate;
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        generateRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);
  const actionLabel =
    mode === 'image-to-image' || mode === 'video-to-video' ? 'Transform' : mode === 'image-to-video' ? 'Animate' : 'Generate';

  return {
    canGenerate: !!canGenerate,
    isSubmitting,
    handleGenerate,
    handleRegenerateFromJob,
    hasCompletedOutput: !!hasCompletedOutput,
    pendingRating,
    actionLabel,
  };
}
