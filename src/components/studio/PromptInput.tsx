import { useGenerationStore } from '@/store/generationStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Prompt
      </Label>
      <Textarea
        value={rawPrompt}
        onChange={(e) => setRawPrompt(e.target.value)}
        placeholder="Describe what you want to generate..."
        className="min-h-[140px] bg-input border-border resize-none text-sm leading-relaxed"
        disabled={pendingRating}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Sent as-is to backend</span>
        </div>
        <span className="font-mono">{rawPrompt.length} chars</span>
      </div>
    </div>
  );
}
