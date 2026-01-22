import { useGenerationStore } from '@/store/generationStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Raw Prompt (sent to backend as-is)
      </Label>
      <Textarea
        value={rawPrompt}
        onChange={(e) => setRawPrompt(e.target.value)}
        placeholder="Describe what you want to generate..."
        className="min-h-[160px] bg-input border-border resize-none text-sm"
        disabled={pendingRating}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          <span>No prompt rewriting happens here</span>
        </div>
        <span className="font-mono">{rawPrompt.length} chars</span>
      </div>
    </div>
  );
}
