import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/Image-Gen-GPT';

export function GenerateButton() {
  const {
    selectedModel,
    generationType,
    rawPrompt,
    controls,
    referenceFiles,
    isGenerating,
    setIsGenerating,
    setCurrentOutput,
    addHistoryEntry,
    updateHistoryStatus,
    setPendingRating,
    pendingRating,
    currentOutput,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  // Check if reference image is required but not provided
  const requiresReferenceImage = 
    (selectedModel === 'nano-banana-pro' && generationType === 'image-edit') ||
    (selectedModel === 'seedream-4.5' && generationType === 'image-to-image');
  
  const hasRequiredFiles = !requiresReferenceImage || referenceFiles.length > 0;

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

    const jobId = `job_${uuidv4().slice(0, 8)}`;
    const entryId = uuidv4();

    // Add entry with processing status
    const entry = {
      id: entryId,
      timestamp: new Date(),
      mode: 'image' as const,
      model: modelConfig.displayName,
      modelId: selectedModel,
      generationType,
      rawPrompt,
      refinedPrompt: '',
      outputUrl: '',
      controls: { ...controls },
      jobId,
      status: 'processing' as const,
    };
    
    addHistoryEntry(entry);

    try {
      let response: Response;

      if (referenceFiles.length > 0) {
        // Send as multipart/form-data
        const formData = new FormData();
        formData.append('mode', 'image');
        formData.append('model', modelConfig.displayName);
        formData.append('generation_type', generationType);
        formData.append('raw_prompt', rawPrompt);
        formData.append('controls', JSON.stringify(controls));
        
        referenceFiles.forEach((file) => {
          formData.append('image_input[]', file);
        });

        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send as JSON
        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'image',
            model: modelConfig.displayName,
            generation_type: generationType,
            raw_prompt: rawPrompt,
            controls,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      const output = {
        jobId: data.job_id || jobId,
        outputUrl: data.output_url,
        refinedPrompt: data.refined_prompt || '',
      };

      setCurrentOutput(output);
      updateHistoryStatus(entryId, 'success');
      
      // Update the history entry with full data
      useGenerationStore.setState((state) => ({
        history: state.history.map((e) =>
          e.id === entryId
            ? { ...e, refinedPrompt: output.refinedPrompt, outputUrl: output.outputUrl, jobId: output.jobId }
            : e
        ),
      }));

      setPendingRating(true);
      toast.success('Generation complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateHistoryStatus(entryId, 'failed', errorMessage);
      toast.error('Generation failed');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!canGenerate) return;
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
