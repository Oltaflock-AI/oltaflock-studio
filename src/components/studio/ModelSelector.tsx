import { useGenerationStore } from '@/store/generationStore';
import { IMAGE_MODELS, VIDEO_MODELS, IMAGE_TO_IMAGE_MODELS, IMAGE_TO_VIDEO_MODELS, type Model, type ModelConfig } from '@/types/generation';
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
import { Image as ImageIcon, Video, ImagePlus, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODEL_DESCRIPTIONS: Record<Model, string> = {
  // Text-to-Image
  'nano-banana-pro': 'Fast, high-quality image generation',
  'seedream-4.5': 'Photorealistic image synthesis',
  'flux-flex': 'Flux Flex fast image generation',
  'flux-flex-pro': 'Flux Flex Pro high-quality generation',
  'gpt-4o': 'GPT-4o powered image generation',
  'z-image': 'Z Image text-to-image generation',
  // Text-to-Video
  'kling-3.0': 'Multi-shot video with element refs (std/pro/4K)',
  'seedance-2.0': 'Latest Seedance with audio + 1080p output',
  'grok-imagine': 'Grok-powered video generation',
  // Image-to-Image
  'nano-banana-pro-i2i': 'Transform images with Nano Banana Pro',
  'seedream-4.5-edit': 'Edit images with Seedream 4.5',
  'flux-flex-i2i': 'Transform images with Flux Flex',
  'flux-pro-i2i': 'High-quality image transformation',
  'qwen-image-edit': 'Advanced image editing with Qwen',
  // Image-to-Video
  'kling-3.0-i2v': 'Animate images with Kling 3.0 (multi-shot, 4K)',
  'seedance-2.0-i2v': 'Latest Seedance image-to-video with audio',
  'grok-imagine-i2v': 'Grok image-to-video with motion control',
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
    if (mode === 'image-to-video') return IMAGE_TO_VIDEO_MODELS;
    return IMAGE_MODELS;
  };

  const modelsToDisplay = getModelsForMode();

  // Get icon and label for current mode
  const getModeInfo = () => {
    if (mode === 'image') return { icon: ImageIcon, label: 'Image Models' };
    if (mode === 'video') return { icon: Video, label: 'Video Models' };
    if (mode === 'image-to-image') return { icon: ImagePlus, label: 'Image → Image Models' };
    if (mode === 'image-to-video') return { icon: Film, label: 'Image → Video Models' };
    return { icon: ImageIcon, label: 'Models' };
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Model
      </Label>
      <Select
        value={selectedModel || ''}
        onValueChange={handleModelChange}
        disabled={pendingRating}
      >
        <SelectTrigger className={cn(
          "w-full bg-background border-border/60 h-11 rounded-lg",
          "hover:border-border transition-smooth",
          "[&>span]:truncate [&>span]:block [&>span]:max-w-[200px]"
        )}>
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-2">
              <ModeIcon className="h-3.5 w-3.5" />
              {modeInfo.label}
            </SelectLabel>
            {modelsToDisplay.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id}
                className="py-3 px-3 cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm truncate max-w-[220px]">
                    {model.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
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
