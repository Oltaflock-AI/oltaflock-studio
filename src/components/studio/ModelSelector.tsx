import { useGenerationStore } from '@/store/generationStore';
import { IMAGE_MODELS, VIDEO_MODELS, type Model, type ModelConfig } from '@/types/generation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Video } from 'lucide-react';

const MODEL_DESCRIPTIONS: Record<Model, string> = {
  'nano-banana-pro': 'Fast, high-quality image generation',
  'seedream-4.5': 'Photorealistic image synthesis',
  'veo-3': 'High-fidelity video generation',
  'veo-3.1': 'Enhanced video with better motion',
  'sora-2-pro': 'Cinematic video generation',
  'kling-2.6': 'Efficient video with sound support',
  'seedance-1.0': 'Motion-focused video generation',
};

export function ModelSelector() {
  const { mode, selectedModel, setSelectedModel, setGenerationType, pendingRating } = useGenerationStore();

  const handleModelChange = (value: string) => {
    const model = value as Model;
    setSelectedModel(model);
    
    // Auto-set generation type based on mode
    if (mode === 'image') {
      setGenerationType('text-to-image');
    } else {
      setGenerationType('text-to-video');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Model
      </Label>
      <Select
        value={selectedModel || ''}
        onValueChange={handleModelChange}
        disabled={pendingRating}
      >
        <SelectTrigger className="w-full bg-input border-border">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {/* Image Models */}
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-xs">
              <ImageIcon className="h-3 w-3" />
              Image Models
            </SelectLabel>
            {IMAGE_MODELS.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id}
                disabled={mode === 'video'}
                className="py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{model.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {MODEL_DESCRIPTIONS[model.id]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
          
          {/* Video Models */}
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-xs">
              <Video className="h-3 w-3" />
              Video Models
            </SelectLabel>
            {VIDEO_MODELS.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id}
                disabled={mode === 'image'}
                className="py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{model.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {MODEL_DESCRIPTIONS[model.id]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
