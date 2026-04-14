import { motion } from 'framer-motion';
import { scaleIn } from '@/lib/motion';
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
      if (rating >= 4) {
        toast.success(`Rated ${rating} stars — the AI will generate more like this`);
      } else if (rating <= 2) {
        toast.success(`Rated ${rating} stars — the AI will avoid this style next time`);
      } else {
        toast.success(`Rated ${rating} stars`);
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
      toast.error('Failed to save rating');
    }
  };

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-card/50 border border-primary/20 rounded-xl p-4 backdrop-blur-sm"
    >
      <p className="text-base font-bold text-foreground mb-3">
        Rate this generation
      </p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <Button
            key={rating}
            variant="outline"
            size="sm"
            onClick={() => handleRating(rating)}
            className={cn(
              "flex items-center gap-1.5 transition-smooth",
              "hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
            )}
          >
            <Star className="h-3.5 w-3.5" />
            {rating}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
