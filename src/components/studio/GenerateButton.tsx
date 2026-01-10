import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS } from '@/types/generation';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Mock generation function - replace with actual API call
async function mockGenerate(): Promise<{ jobId: string; outputUrl: string; refinedPrompt: string }> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const isImage = Math.random() > 0.5;
  return {
    jobId: `job_${uuidv4().slice(0, 8)}`,
    outputUrl: isImage 
      ? 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
      : 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    refinedPrompt: 'Backend-optimized prompt with enhanced parameters and style tokens applied.',
  };
}

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
    addHistoryEntry,
    setPendingRating,
    pendingRating,
    currentOutput,
  } = useGenerationStore();

  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  const canGenerate = 
    selectedModel && 
    generationType && 
    rawPrompt.trim() && 
    !isGenerating &&
    !pendingRating;

  const handleGenerate = async () => {
    if (!canGenerate || !modelConfig) return;

    setIsGenerating(true);
    setCurrentOutput(null);

    try {
      // In production, this would call the backend webhook
      const response = await mockGenerate();

      setCurrentOutput(response);
      
      // Add to history
      const entry = {
        id: uuidv4(),
        timestamp: new Date(),
        mode,
        model: modelConfig.displayName,
        generationType,
        rawPrompt,
        refinedPrompt: response.refinedPrompt,
        outputUrl: response.outputUrl,
        controls: { ...controls, characterIds },
        jobId: response.jobId,
      };
      
      addHistoryEntry(entry);
      setPendingRating(true);
      
      toast.success('Generation complete');
    } catch (error) {
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
