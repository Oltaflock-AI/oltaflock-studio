import { useGenerations, type DbGeneration, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Image as ImageIcon, Video, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { formatCredits } from '@/config/pricing';

const statusDotColors: Record<GenerationStatus, string> = {
  queued: 'bg-muted-foreground animate-pulse',
  running: 'bg-primary animate-pulse',
  done: 'bg-green-500',
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
        <p className="text-xs">Loading...</p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-3 opacity-30" />
        <p className="text-xs font-medium mb-1">No requests yet</p>
        <p className="text-xs text-center text-muted-foreground/60 leading-relaxed">
          Generate to see history
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1.5 p-2">
        {generations.map((generation) => {
          const status = generation.status as GenerationStatus;
          const isSelected = selectedJobId === generation.id;
          const isActive = status === 'queued' || status === 'running';
          const progress = progressMap.get(generation.id) || 0;
          const ModeIcon = generation.type === 'image' ? ImageIcon : Video;
          const promptPreview = generation.user_prompt.length > 50 
            ? generation.user_prompt.slice(0, 50) + '...' 
            : generation.user_prompt;
          const createdAt = new Date(generation.created_at);

          return (
            <div
              key={generation.id}
              onClick={() => handleSelectGeneration(generation)}
              className={cn(
                'px-3 py-2.5 rounded-xl cursor-pointer transition-smooth group',
                isSelected 
                  ? 'bg-primary/8 ring-1 ring-primary/20' 
                  : 'hover:bg-accent/40'
              )}
            >
              {/* Header: Status + Time */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', statusDotColors[status])} />
                  <ModeIcon className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {format(createdAt, 'HH:mm')}
                </span>
              </div>
              
              {/* Prompt preview */}
              <p className="text-xs leading-relaxed line-clamp-2 text-foreground/80 mb-2">
                {promptPreview}
              </p>
              
              {/* Progress bar for active jobs */}
              {isActive && (
                <div className="flex items-center gap-2 mb-1.5">
                  <Progress value={progress} className="h-1 flex-1" />
                  <span className="text-[9px] text-primary font-semibold tabular-nums w-7 text-right">
                    {progress}%
                  </span>
                </div>
              )}
              
              {/* Footer: Model name + Cost + Delete */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {generation.model}
                  </span>
                  {(generation.model_params as Record<string, unknown> | null)?.cost_credits && (
                    <span className="text-[9px] text-primary/70 font-medium tabular-nums shrink-0">
                      {formatCredits((generation.model_params as Record<string, unknown>).cost_credits as number)} cr
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => handleDelete(e, generation.id)}
                  disabled={isActive}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
