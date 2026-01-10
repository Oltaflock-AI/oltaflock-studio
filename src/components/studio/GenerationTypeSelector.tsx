import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, type GenerationType } from '@/types/generation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TYPE_LABELS: Record<GenerationType, string> = {
  'text-to-image': 'Text to Image',
  'image-edit': 'Image Edit (Reference Image)',
  'text-to-video': 'Text to Video',
  'image-to-video': 'Image to Video',
  'reference-to-video': 'Reference to Video',
  'storyboard': 'Storyboard',
};

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
