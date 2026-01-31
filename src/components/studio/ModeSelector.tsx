import { useGenerationStore } from '@/store/generationStore';
import { Image as ImageIcon, Video, ImagePlus, Film, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ModeOption {
  value: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
}

const modes: ModeOption[] = [
  { 
    value: 'text-to-image', 
    label: 'Text → Image', 
    icon: ImageIcon, 
    enabled: true,
  },
  { 
    value: 'image-to-image', 
    label: 'Image → Image', 
    icon: ImagePlus, 
    enabled: true,
  },
  { 
    value: 'image-to-video', 
    label: 'Image → Video', 
    icon: Film, 
    enabled: false,
  },
  { 
    value: 'text-to-video', 
    label: 'Text → Video', 
    icon: Video, 
    enabled: true,
  },
];

export function ModeSelector() {
  const { mode, setMode, pendingRating, isGenerating, setGenerationType } = useGenerationStore();

  // Map mode + generationType to composite mode
  const getActiveMode = () => {
    const { generationType } = useGenerationStore.getState();
    if (mode === 'image' && generationType === 'text-to-image') return 'text-to-image';
    if (mode === 'video' && generationType === 'text-to-video') return 'text-to-video';
    if (mode === 'image-to-image' && generationType === 'image-to-image') return 'image-to-image';
    // Default based on mode
    if (mode === 'image') return 'text-to-image';
    if (mode === 'video') return 'text-to-video';
    if (mode === 'image-to-image') return 'image-to-image';
    return 'text-to-image';
  };

  const handleModeClick = (option: ModeOption) => {
    if (!option.enabled || pendingRating || isGenerating) return;
    
    if (option.value === 'text-to-image') {
      setMode('image');
      setGenerationType('text-to-image');
    } else if (option.value === 'image-to-image') {
      setMode('image-to-image');
      setGenerationType('image-to-image');
    } else if (option.value === 'text-to-video') {
      setMode('video');
      setGenerationType('text-to-video');
    }
  };

  const activeMode = getActiveMode();

  return (
    <div className="space-y-0.5">
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
              'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-all',
              isActive 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : option.enabled
                  ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  : 'text-muted-foreground/40 cursor-not-allowed',
              isDisabled && option.enabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn(
              'h-4 w-4 shrink-0',
              !option.enabled && 'text-muted-foreground/40'
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'font-medium text-xs',
                  !option.enabled && 'text-muted-foreground/50'
                )}>
                  {option.label}
                </span>
                {!option.enabled && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 text-muted-foreground/50 border-muted-foreground/30">
                    <Lock className="h-2 w-2 mr-0.5" />
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
