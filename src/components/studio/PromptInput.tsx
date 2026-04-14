import { useGenerationStore } from '@/store/generationStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Prompt
      </Label>
      <div className="relative group focus-glow rounded-xl">
        <Textarea
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder="Describe your creative vision..."
          className={cn(
            "min-h-[160px] bg-background border-border/60 resize-none",
            "text-sm leading-relaxed tracking-normal",
            "placeholder:text-muted-foreground/40 placeholder:italic",
            "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
            "transition-smooth rounded-xl p-4"
          )}
          disabled={pendingRating}
        />
        {/* Floating character counter */}
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50 font-mono tabular-nums">
          {rawPrompt.length}
        </div>
      </div>
    </div>
  );
}
