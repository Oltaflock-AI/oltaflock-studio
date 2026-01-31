import { useGenerations, type DbGeneration, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Video, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusDotColors: Record<GenerationStatus, string> = {
  queued: 'bg-muted-foreground',
  running: 'bg-primary animate-pulse',
  done: 'bg-green-500',
  error: 'bg-destructive',
};

export function RequestsPanel() {
  const { generations, isLoading, deleteGeneration } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();

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
        <FileText className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs font-medium mb-0.5">No requests yet</p>
        <p className="text-[10px] text-center text-muted-foreground/70">
          Generate to see history
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-1.5">
        {generations.map((generation) => {
          const status = generation.status;
          const isSelected = selectedJobId === generation.id;
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
                'px-2 py-2 rounded-lg cursor-pointer transition-all group',
                isSelected 
                  ? 'bg-accent border border-primary/30 shadow-sm' 
                  : 'hover:bg-accent/50 border border-transparent'
              )}
            >
              {/* Status dot + Prompt preview */}
              <div className="flex items-start gap-2">
                <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', statusDotColors[status])} />
                <p className="text-[11px] line-clamp-2 flex-1 leading-relaxed">
                  {promptPreview}
                </p>
              </div>
              
              {/* Footer: Model + Time + Delete */}
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground pl-4">
                <div className="flex items-center gap-1.5">
                  <ModeIcon className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[60px]">{generation.model}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{format(createdAt, 'HH:mm')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, generation.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
