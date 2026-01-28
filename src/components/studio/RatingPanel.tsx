import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RatingPanel() {
  const { selectedJobId, pendingRating, setPendingRating } = useGenerationStore();
  const { generations, updateGeneration } = useGenerations();

  // Find selected generation from database
  const selectedGeneration = generations.find(g => g.id === selectedJobId);

  // Only show if:
  // 1. pendingRating is true (just completed a generation)
  // 2. Generation exists and is done
  // 3. Generation has no rating yet
  if (!pendingRating || !selectedGeneration || selectedGeneration.status !== 'done' || selectedGeneration.rating) {
    return null;
  }

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    try {
      await updateGeneration({
        id: selectedGeneration.id,
        updates: { rating },
      });
      setPendingRating(false);
      toast.success(`Rated ${rating} star${rating > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to save rating:', error);
      toast.error('Failed to save rating');
    }
  };

  return (
    <div className="bg-card border border-primary/50 rounded-lg p-4">
      <p className="text-sm font-medium text-foreground mb-3">
        Rate this generation
      </p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <Button
            key={rating}
            variant="outline"
            size="sm"
            onClick={() => handleRating(rating)}
            className="flex items-center gap-1 transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <Star className="h-4 w-4" />
            {rating}
          </Button>
        ))}
      </div>
    </div>
  );
}
