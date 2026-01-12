import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, generateJobId, MODEL_API_NAMES } from '@/types/generation';
import type { JobEntry, Model } from '@/types/generation';
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

  // Text-to-image and text-to-video don't require reference media
  const hasRequiredFiles = true;

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

    // Build controls object
    const submittedControls = { ...controls };
    
    // Get API model name (e.g., "seedream/4.5-text-to-image")
    const apiModelName = `${MODEL_API_NAMES[selectedModel as Model]}-${generationType}`;


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
      deleted: false,
    };
    
    addJob(jobEntry);

    try {
      let response: Response;

      // Send as JSON with job_id and proper model name format
      response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          mode,
          model: apiModelName,
          generation_type: generationType,
          raw_prompt: rawPrompt,
          controls: submittedControls,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response - handle nested resultJson structure
      let outputUrl = '';
      let refinedPrompt = '';
      
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
      
      // Get refined prompt from response
      refinedPrompt = data.refined_prompt || data.data?.refined_prompt || '';
      
      const output = {
        jobId: jobId,
        outputUrl,
        refinedPrompt,
      };

      setCurrentOutput(output);
      
      // Update job with completed status and data
      updateJob(entryId, {
        status: outputUrl ? 'completed' : 'failed',
        refinedPrompt: output.refinedPrompt,
        outputUrl: output.outputUrl,
        error: outputUrl ? undefined : 'No output URL in response',
      });

      if (outputUrl) {
        setPendingRating(true);
        toast.success('Generation complete');
      } else {
        toast.error('No image received');
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
