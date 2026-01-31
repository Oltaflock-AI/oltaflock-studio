import { useGenerations, type DbGeneration, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Video, Clock, CheckCircle2, XCircle, Loader2, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig: Record<GenerationStatus, { icon: React.ElementType; className: string; label: string }> = {
  queued: { icon: Clock, className: 'text-muted-foreground', label: 'Queued' },
  running: { icon: Loader2, className: 'text-primary animate-spin', label: 'Running' },
  done: { icon: CheckCircle2, className: 'text-green-500', label: 'Done' },
  error: { icon: XCircle, className: 'text-destructive', label: 'Error' },
};

export function RequestsPanel() {
  const { generations, isLoading, deleteGeneration } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();

  const handleSelectGeneration = (generation: DbGeneration) => {
    // Just set the selected ID - OutputDisplay reads directly from DB
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
        <p className="text-sm">Loading requests...</p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium mb-1">No requests yet</p>
        <p className="text-xs text-center text-muted-foreground/70">
          Generate your first image or video to see it here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {generations.map((generation) => {
          const status = generation.status;
          const StatusIcon = statusConfig[status]?.icon || Clock;
          const isSelected = selectedJobId === generation.id;
          const ModeIcon = generation.type === 'image' ? ImageIcon : Video;
          const promptPreview = generation.user_prompt.length > 40 
            ? generation.user_prompt.slice(0, 40) + '...' 
            : generation.user_prompt;

          return (
            <div
              key={generation.id}
              onClick={() => handleSelectGeneration(generation)}
              className={cn(
                'w-full text-left rounded-md border p-3 space-y-2 transition-colors cursor-pointer group',
                isSelected 
                  ? 'bg-accent border-accent-foreground/20' 
                  : 'bg-card border-border hover:bg-accent/50'
              )}
            >
              {/* Prompt Preview */}
              <p className="text-xs line-clamp-2 leading-relaxed">
                {promptPreview}
              </p>

              {/* Model & Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModeIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
                    {generation.model}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon className={cn('h-3.5 w-3.5', statusConfig[status]?.className)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, generation.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[9px] px-1 py-0 h-4",
                    status === 'done' && "border-green-500/50 text-green-500",
                    status === 'error' && "border-destructive/50 text-destructive",
                    status === 'running' && "border-primary/50 text-primary"
                  )}
                >
                  {statusConfig[status]?.label || status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{format(new Date(generation.created_at), 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
