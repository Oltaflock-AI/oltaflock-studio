import { motion } from 'framer-motion';
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
    enabled: true,
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
    if (mode === 'image-to-video' && generationType === 'image-to-video') return 'image-to-video';
    // Default based on mode
    if (mode === 'image') return 'text-to-image';
    if (mode === 'video') return 'text-to-video';
    if (mode === 'image-to-image') return 'image-to-image';
    if (mode === 'image-to-video') return 'image-to-video';
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
    } else if (option.value === 'image-to-video') {
      setMode('image-to-video');
      setGenerationType('image-to-video');
    }
  };

  const activeMode = getActiveMode();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Generation mode">
      {modes.map((option) => {
        const Icon = option.icon;
        const isActive = activeMode === option.value;
        const isDisabled = !option.enabled || pendingRating || isGenerating;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => handleModeClick(option)}
            disabled={isDisabled}
            aria-pressed={isActive}
            whileTap={!isDisabled ? { scale: 0.97 } : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] whitespace-nowrap transition-smooth',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-[0_4px_12px_hsl(var(--primary)/0.25)]'
                : option.enabled
                  ? 'bg-muted text-muted-foreground hover:text-foreground hover:brightness-95 dark:hover:brightness-125'
                  : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed',
              isDisabled && option.enabled && !isActive && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {option.label}
            {!option.enabled && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground/50 border-muted-foreground/30">
                <Lock className="h-2 w-2 mr-0.5" />
                Soon
              </Badge>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
