import { useGenerationStore } from '@/store/generationStore';
import { IMAGE_MODELS, VIDEO_MODELS, type Model } from '@/types/generation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ModelSelector() {
  const { mode, selectedModel, setSelectedModel, pendingRating } = useGenerationStore();

  const models = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Model
      </Label>
      <Select
        value={selectedModel || ''}
        onValueChange={(value) => setSelectedModel(value as Model)}
        disabled={pendingRating}
      >
        <SelectTrigger className="w-full bg-input border-border">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
