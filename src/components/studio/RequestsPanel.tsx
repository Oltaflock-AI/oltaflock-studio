import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, listItem } from '@/lib/motion';
import { useGenerations, type DbGeneration, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Image as ImageIcon, Video, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SensitiveMedia } from '@/components/SensitiveMedia';

/** "$0.015" for Higgsfield rows, "0.8 cr" for kie.ai rows. */
function costLabel(params: Record<string, unknown> | null): string | null {
  if (!params) return null;
  if (params.backend === 'higgsfield') {
    return typeof params.cost_usd === 'number' ? `$${params.cost_usd.toFixed(3)}` : null;
  }
  const cr = params.cost_credits;
  return typeof cr === 'number' && cr > 0 ? `${formatCredits(cr)} cr` : null;
}
import { useMemo } from 'react';
import { formatCredits } from '@/config/pricing';
import { StarButton } from '@/components/library/StarButton';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { resolveBadgeModelId } from '@/components/studio/resolveBadgeModelId';

const statusDotColors: Record<GenerationStatus, string> = {
  queued: 'bg-muted-foreground animate-pulse',
  running: 'bg-primary animate-pulse',
  done: 'bg-success',
  error: 'bg-destructive',
};

export function RequestsPanel() {
  const { generations, isLoading, deleteGeneration } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();

  // Get IDs of active generations for progress tracking
  const activeGenerationIds = useMemo(() => 
    generations
      .filter(g => g.status === 'queued' || g.status === 'running')
      .map(g => g.id),
    [generations]
  );
  
  const progressMap = useMultipleGenerationProgress(activeGenerationIds);

  const handleSelectGeneration = (generation: DbGeneration) => {
    setSelectedJobId(generation.id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteGeneration(id);
    } catch (error) {
      console.error('Failed to delete generation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-[13px]">Loading…</p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-3 opacity-30" />
        <p className="text-[13.5px] font-medium text-foreground mb-1">No generations yet</p>
        <p className="text-[12.5px] text-center text-muted-foreground leading-relaxed">
          Generate to see history
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-1 p-2"
      >
        <AnimatePresence>
        {generations.map((generation) => {
          const status = generation.status as GenerationStatus;
          const isSelected = selectedJobId === generation.id;
          const isActive = status === 'queued' || status === 'running';
          const progress = progressMap.get(generation.id) || 0;
          const ModeIcon = generation.type === 'image' ? ImageIcon : Video;
          const promptPreview = generation.user_prompt.length > 90
            ? generation.user_prompt.slice(0, 90) + '…'
            : generation.user_prompt;
          const createdAt = new Date(generation.created_at);

          return (
            <motion.div
              key={generation.id}
              variants={listItem}
              layout
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Show request: ${promptPreview}`}
              onClick={() => handleSelectGeneration(generation)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectGeneration(generation);
                }
              }}
              className={cn(
                'p-2 rounded-[12px] cursor-pointer transition-smooth group',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-accent ring-1 ring-primary/30'
                  : 'hover:bg-secondary/80'
              )}
            >
              <div className="flex gap-3">
                <div className="relative h-12 w-12 shrink-0 rounded-[9px] overflow-hidden bg-secondary border border-border/60">
                  {generation.status === 'done' && generation.output_url ? (
                    <SensitiveMedia sensitive={generation.is_nsfw} size="sm" className="absolute inset-0">
                      {generation.type === 'video' ? (
                        <video src={generation.output_url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
                      ) : (
                        <img src={generation.output_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </SensitiveMedia>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <ModeIcon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  )}
                  <span className={cn('absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-card', statusDotColors[status])} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug line-clamp-2 text-foreground">
                    {promptPreview}
                  </p>

                  {isActive && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={progress} className="h-1 flex-1" />
                      <span className="font-mono text-[10.5px] text-primary tabular-nums w-8 text-right">{progress}%</span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0">
                    <span className="truncate">{generation.model}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums shrink-0">{format(createdAt, 'HH:mm')}</span>
                    {costLabel(generation.model_params as Record<string, unknown> | null) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums shrink-0">{costLabel(generation.model_params as Record<string, unknown> | null)}</span>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-0.5 shrink-0">
                      {generation.status === 'done' && generation.output_url && (
                        <StarButton generation={generation} size="sm" className="h-6 w-6" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDelete(e, generation.id)}
                        disabled={isActive}
                        aria-label="Delete request"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                      </Button>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
    </ScrollArea>
  );
}
