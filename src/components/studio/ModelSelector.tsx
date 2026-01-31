import { useGenerationStore } from '@/store/generationStore';
import { IMAGE_MODELS, VIDEO_MODELS, IMAGE_TO_IMAGE_MODELS, type Model, type ModelConfig } from '@/types/generation';
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
import { Image as ImageIcon, Video, ImagePlus } from 'lucide-react';

const MODEL_DESCRIPTIONS: Record<Model, string> = {
  // Text-to-Image
  'nano-banana-pro': 'Fast, high-quality image generation',
  'seedream-4.5': 'Photorealistic image synthesis',
  'flux-flex': 'Flux Flex fast image generation',
  'flux-flex-pro': 'Flux Flex Pro high-quality generation',
  'gpt-4o': 'GPT-4o powered image generation',
  'z-image': 'Z Image text-to-image generation',
  // Text-to-Video
  'veo-3.1': 'Enhanced video with better motion',
  'sora-2-pro': 'Cinematic video generation',
  'kling-2.6': 'Efficient video with sound support',
  'seedance-1.0': 'Motion-focused video generation',
  'grok-imagine': 'Grok-powered video generation',
  // Image-to-Image
  'nano-banana-pro-i2i': 'Transform images with Nano Banana Pro',
  'seedream-4.5-edit': 'Edit images with Seedream 4.5',
  'flux-flex-i2i': 'Transform images with Flux Flex',
  'flux-pro-i2i': 'High-quality image transformation',
  'qwen-image-edit': 'Advanced image editing with Qwen',
};

export function ModelSelector() {
  const { mode, selectedModel, setSelectedModel, setGenerationType, pendingRating } = useGenerationStore();

  const handleModelChange = (value: string) => {
    const model = value as Model;
    setSelectedModel(model);
    
    // Auto-set generation type based on mode
    if (mode === 'image') {
      setGenerationType('text-to-image');
    } else if (mode === 'video') {
      setGenerationType('text-to-video');
    } else if (mode === 'image-to-image') {
      setGenerationType('image-to-image');
    }
  };

  // Get models to display based on current mode
  const getModelsForMode = () => {
    if (mode === 'image') return IMAGE_MODELS;
    if (mode === 'video') return VIDEO_MODELS;
    if (mode === 'image-to-image') return IMAGE_TO_IMAGE_MODELS;
    return IMAGE_MODELS;
  };

  const modelsToDisplay = getModelsForMode();

  // Get icon and label for current mode
  const getModeInfo = () => {
    if (mode === 'image') return { icon: ImageIcon, label: 'Image Models' };
    if (mode === 'video') return { icon: Video, label: 'Video Models' };
    if (mode === 'image-to-image') return { icon: ImagePlus, label: 'Image → Image Models' };
    return { icon: ImageIcon, label: 'Models' };
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

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
        <SelectTrigger className="w-full bg-input border-border h-10 [&>span]:truncate">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-xs">
              <ModeIcon className="h-3 w-3" />
              {modeInfo.label}
            </SelectLabel>
            {modelsToDisplay.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id}
                className="py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{model.displayName}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
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
