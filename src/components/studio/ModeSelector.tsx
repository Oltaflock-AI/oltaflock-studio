import { useGenerationStore } from '@/store/generationStore';
import { Image as ImageIcon, Video, ImagePlus, Film, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ModeOption {
  value: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  description: string;
}

const modes: ModeOption[] = [
  { 
    value: 'text-to-image', 
    label: 'Text → Image', 
    icon: ImageIcon, 
    enabled: true,
    description: 'Generate images from text prompts',
  },
  { 
    value: 'image-to-image', 
    label: 'Image → Image', 
    icon: ImagePlus, 
    enabled: false,
    description: 'Transform existing images',
  },
  { 
    value: 'image-to-video', 
    label: 'Image → Video', 
    icon: Film, 
    enabled: false,
    description: 'Animate images into videos',
  },
  { 
    value: 'text-to-video', 
    label: 'Text → Video', 
    icon: Video, 
    enabled: true,
    description: 'Generate videos from text prompts',
  },
];

export function ModeSelector() {
  const { mode, setMode, pendingRating, isGenerating } = useGenerationStore();

  // Map mode + generationType to composite mode
  const getActiveMode = () => {
    const { generationType } = useGenerationStore.getState();
    if (mode === 'image' && generationType === 'text-to-image') return 'text-to-image';
    if (mode === 'video' && generationType === 'text-to-video') return 'text-to-video';
    return mode === 'image' ? 'text-to-image' : 'text-to-video';
  };

  const handleModeClick = (option: ModeOption) => {
    if (!option.enabled || pendingRating || isGenerating) return;
    
    if (option.value === 'text-to-image' || option.value === 'image-to-image') {
      setMode('image');
    } else {
      setMode('video');
    }
  };

  const activeMode = getActiveMode();

  return (
    <div className="space-y-1">
      {modes.map((option) => {
        const Icon = option.icon;
        const isActive = activeMode === option.value;
        const isDisabled = !option.enabled || pendingRating || isGenerating;
        
        return (
          <button
            key={option.value}
            onClick={() => handleModeClick(option)}
            disabled={isDisabled}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left group',
              isActive 
                ? 'bg-accent text-accent-foreground' 
                : option.enabled
                  ? 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  : 'text-muted-foreground/50 cursor-not-allowed',
              isDisabled && option.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn(
              'h-4 w-4 shrink-0',
              isActive && 'text-primary',
              !option.enabled && 'text-muted-foreground/40'
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium',
                  !option.enabled && 'text-muted-foreground/50'
                )}>
                  {option.label}
                </span>
                {!option.enabled && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground/50 border-muted-foreground/30">
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    Soon
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
