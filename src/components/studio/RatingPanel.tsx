import { useGenerationStore } from '@/store/generationStore';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingPanel() {
  const { 
    pendingRating, 
    history, 
    updateHistoryRating,
    currentOutput 
  } = useGenerationStore();

  if (!pendingRating || !currentOutput) return null;

  const latestEntry = history.find((e) => e.jobId === currentOutput.jobId);
  
  if (!latestEntry) return null;

  const handleRating = (rating: 1 | 2 | 3 | 4 | 5) => {
    updateHistoryRating(latestEntry.id, rating);
  };

  return (
    <div className="bg-card border border-primary/50 rounded-lg p-4">
      <p className="text-sm font-medium text-foreground mb-3">
        Rate this generation before continuing
      </p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <Button
            key={rating}
            variant="outline"
            size="sm"
            onClick={() => handleRating(rating)}
            className={cn(
              'flex items-center gap-1 transition-all',
              latestEntry.rating === rating && 'bg-primary text-primary-foreground'
            )}
          >
            <Star className={cn(
              'h-4 w-4',
              rating <= (latestEntry.rating || 0) ? 'fill-current' : ''
            )} />
            {rating}
          </Button>
        ))}
      </div>
    </div>
  );
}
