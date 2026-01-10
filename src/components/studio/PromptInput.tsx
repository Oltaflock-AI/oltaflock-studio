import { useGenerationStore } from '@/store/generationStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Raw Prompt
      </Label>
      <Textarea
        value={rawPrompt}
        onChange={(e) => setRawPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        className="min-h-[120px] bg-input border-border resize-none font-mono text-sm"
        disabled={pendingRating}
      />
      <p className="text-xs text-muted-foreground">
        {rawPrompt.length} characters
      </p>
    </div>
  );
}
