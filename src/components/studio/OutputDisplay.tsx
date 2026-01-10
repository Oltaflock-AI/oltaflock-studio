import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Image as ImageIcon } from 'lucide-react';

export function OutputDisplay() {
  const { currentOutput, isGenerating } = useGenerationStore();

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Generating...</p>
      </div>
    );
  }

  if (!currentOutput) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Output will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Output Preview */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
        <img
          src={currentOutput.outputUrl}
          alt="Generated output"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Refined Prompt */}
      {currentOutput.refinedPrompt && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Refined Prompt (Read-Only)
          </Label>
          <Textarea
            value={currentOutput.refinedPrompt}
            readOnly
            className="min-h-[80px] bg-muted border-border resize-none font-mono text-xs opacity-80"
          />
        </div>
      )}

      {/* Job ID */}
      <div className="text-xs text-muted-foreground font-mono">
        Job ID: {currentOutput.jobId}
      </div>
    </div>
  );
}
