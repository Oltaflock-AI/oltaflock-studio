import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, TYPE_LABELS, type GenerationType } from '@/types/generation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function GenerationTypeSelector() {
  const { selectedModel, generationType, setGenerationType, pendingRating } = useGenerationStore();
  
  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);
  
  if (!modelConfig) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Generation Type
      </Label>
      <Select
        value={generationType || ''}
        onValueChange={(value) => setGenerationType(value as GenerationType)}
        disabled={pendingRating}
      >
        <SelectTrigger className="w-full bg-input border-border">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {modelConfig.generationTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
