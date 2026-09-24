import { Sparkles } from 'lucide-react';
import { useGenerationStore } from '@/store/generationStore';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Auto-optimize: runs the Prompt Brain on submit for the selected model + use case. */
export function PromptBrainToggle() {
  const { enhancePromptEnabled, setEnhancePromptEnabled } = useGenerationStore();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <label htmlFor="brain-toggle" className="flex items-center gap-2 cursor-pointer select-none">
          <Switch id="brain-toggle" checked={enhancePromptEnabled} onCheckedChange={setEnhancePromptEnabled} />
          <span className="flex items-center gap-1 text-[12.5px] font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Auto-optimize
          </span>
        </label>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        Prompt Brain rewrites your prompt for the selected model when you hit Generate. Your original is kept in history.
      </TooltipContent>
    </Tooltip>
  );
}
