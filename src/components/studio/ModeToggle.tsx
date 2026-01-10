import { useGenerationStore } from '@/store/generationStore';
import { cn } from '@/lib/utils';
import { Image, Video } from 'lucide-react';

export function ModeToggle() {
  const { mode, setMode, pendingRating } = useGenerationStore();

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-md">
      <button
        onClick={() => setMode('image')}
        disabled={pendingRating}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-all',
          mode === 'image'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
          pendingRating && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Image className="h-4 w-4" />
        Image
      </button>
      <button
        onClick={() => setMode('video')}
        disabled={pendingRating}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-all',
          mode === 'video'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
          pendingRating && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Video className="h-4 w-4" />
        Video
      </button>
    </div>
  );
}
