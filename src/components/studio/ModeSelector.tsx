import { useGenerationStore } from '@/store/generationStore';
import { Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationMode } from '@/types/generation';

interface ModeOption {
  value: GenerationMode;
  label: string;
  icon: React.ElementType;
}

const modes: ModeOption[] = [
  { value: 'image', label: 'Image Generation', icon: ImageIcon },
  { value: 'video', label: 'Video Generation', icon: Video },
];

export function ModeSelector() {
  const { mode, setMode, pendingRating, isGenerating } = useGenerationStore();

  return (
    <div className="space-y-1">
      {modes.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => setMode(option.value)}
            disabled={pendingRating || isGenerating}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
              isActive 
                ? 'bg-accent text-accent-foreground' 
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              (pendingRating || isGenerating) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
            <span className="font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
