import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, generateJobId } from '@/types/generation';
import type { JobEntry } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';

export function GenerateButton() {
  const {
    mode,
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    referenceFiles,
    characterIds,
    isGenerating,
    setIsGenerating,
    setCurrentOutput,
    addJob,
    updateJob,
    setPendingRating,
    pendingRating,
    currentOutput,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  // Check if reference media is required but not provided
  const requiresReferenceMedia = 
    // Image models
    (selectedModel === 'nano-banana-pro' && generationType === 'image-edit') ||
    (selectedModel === 'seedream-4.5' && generationType === 'image-to-image') ||
    // Video models
    (selectedModel && generationType && ['image-to-video', 'reference-to-video', 'storyboard'].includes(generationType));
  
  const hasRequiredFiles = !requiresReferenceMedia || referenceFiles.length > 0;

  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    hasRequiredFiles &&
    !isGenerating &&
    !pendingRating;

  const handleGenerate = async () => {
    if (!canGenerate || !modelConfig) return;

    setIsGenerating(true);
    setCurrentOutput(null);

    // Generate unique job_id with required format
    const jobId = generateJobId();
    const entryId = uuidv4();

    // Build controls object including character IDs for Sora 2 Pro
    const submittedControls = selectedModel === 'sora-2-pro' && characterIds.length > 0
      ? { ...controls, characterIds }
      : { ...controls };

    // Store reference file names for display
    const referenceFileNames = referenceFiles.map((f) => f.name);

    // Create job entry with processing status
    const jobEntry: JobEntry = {
      id: entryId,
      jobId,
      timestamp: new Date(),
      mode,
      model: modelConfig.displayName,
      modelId: selectedModel,
      generationType,
      rawPrompt,
      refinedPrompt: '',
      outputUrl: '',
      controls: submittedControls,
      status: 'processing',
      referenceFiles: referenceFileNames,
      deleted: false,
    };
    
    addJob(jobEntry);

    try {
      let response: Response;

      if (referenceFiles.length > 0) {
        // Send as multipart/form-data
        const formData = new FormData();
        formData.append('job_id', jobId);
        formData.append('mode', mode);
        formData.append('model', modelConfig.displayName);
        formData.append('generation_type', generationType);
        formData.append('raw_prompt', rawPrompt);
        formData.append('controls', JSON.stringify(submittedControls));
        
        const fileFieldName = mode === 'video' ? 'video_input[]' : 'image_input[]';
        referenceFiles.forEach((file) => {
          formData.append(fileFieldName, file);
        });

        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send as JSON with job_id
        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_id: jobId,
            mode,
            model: modelConfig.displayName,
            generation_type: generationType,
            raw_prompt: rawPrompt,
            controls: submittedControls,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Match response job_id with our job
      const responseJobId = data.job_id;
      
      // Only update if job_id matches (or use our generated one if not returned)
      if (!responseJobId || responseJobId === jobId) {
        const output = {
          jobId: responseJobId || jobId,
          outputUrl: data.output_url,
          refinedPrompt: data.refined_prompt || '',
        };

        setCurrentOutput(output);
        
        // Update job with completed status and data
        updateJob(entryId, {
          status: 'completed',
          refinedPrompt: output.refinedPrompt,
          outputUrl: output.outputUrl,
        });

        setPendingRating(true);
        toast.success('Generation complete');
      } else {
        // Job ID mismatch - log warning but still update our job
        console.warn(`Job ID mismatch: expected ${jobId}, got ${responseJobId}`);
        const output = {
          jobId: responseJobId,
          outputUrl: data.output_url,
          refinedPrompt: data.refined_prompt || '',
        };

        setCurrentOutput(output);
        updateJob(entryId, {
          status: 'completed',
          refinedPrompt: output.refinedPrompt,
          outputUrl: output.outputUrl,
          jobId: responseJobId,
        });

        setPendingRating(true);
        toast.success('Generation complete');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateJob(entryId, { 
        status: 'failed', 
        error: errorMessage 
      });
      toast.error('Generation failed');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!canGenerate) return;
    // Regenerate creates a NEW job_id
    await handleGenerate();
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="flex-1"
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
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      )}
    </div>
  );
}
