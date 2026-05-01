import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import type { DbGeneration } from '@/hooks/useGenerations';

interface Props {
  generation: DbGeneration;
  size?: 'sm' | 'md';
  className?: string;
  stopPropagation?: boolean;
}

export function StarButton({
  generation,
  size = 'sm',
  className,
  stopPropagation = true,
}: Props) {
  const { findByGenerationId, quickStar, isStarToggling } = usePromptLibrary();
  const starred = !!findByGenerationId(generation.id);
  const disabled = !generation.output_url || generation.status !== 'done' || isStarToggling;

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    if (disabled) return;
    try {
      const res = await quickStar(generation);
      toast.success(res.starred ? 'Added to library' : 'Removed from library');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg);
    }
  };

  const dim = size === 'md' ? 'h-9 w-9' : 'h-6 w-6';
  const iconDim = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      title={starred ? 'Remove from library' : 'Add to library'}
      className={cn(dim, 'shrink-0', className)}
    >
      {isStarToggling ? (
        <Loader2 className={cn(iconDim, 'animate-spin')} />
      ) : (
        <Star
          className={cn(
            iconDim,
            'transition-colors',
            starred
              ? 'fill-yellow-400 text-yellow-500'
              : 'text-muted-foreground hover:text-foreground'
          )}
        />
      )}
    </Button>
  );
}
