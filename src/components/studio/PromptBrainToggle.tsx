import { useGenerationStore } from '@/store/generationStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

export function PromptBrainToggle() {
  const { enhancePromptEnabled, setEnhancePromptEnabled } = useGenerationStore();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <Label className="text-xs font-medium cursor-pointer" htmlFor="brain-toggle">
          Prompt Brain
        </Label>
      </div>
      <Switch
        id="brain-toggle"
        checked={enhancePromptEnabled}
        onCheckedChange={setEnhancePromptEnabled}
      />
    </div>
  );
}
