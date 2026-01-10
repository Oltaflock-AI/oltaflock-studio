import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/generation';

const statusConfig: Record<JobStatus, { icon: React.ElementType; className: string; label: string }> = {
  processing: { icon: Loader2, className: 'text-primary animate-spin', label: 'Processing' },
  success: { icon: CheckCircle2, className: 'text-green-500', label: 'Success' },
  failed: { icon: XCircle, className: 'text-destructive', label: 'Failed' },
};

export function HistoryPanel() {
  const { history, selectedHistoryId, setSelectedHistoryId } = useGenerationStore();

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No generation history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {history.map((entry) => {
          const StatusIcon = statusConfig[entry.status].icon;
          const isSelected = selectedHistoryId === entry.id;
          const ModeIcon = entry.mode === 'image' ? ImageIcon : Video;

          return (
            <button
              key={entry.id}
              onClick={() => setSelectedHistoryId(entry.id)}
              className={cn(
                'w-full text-left rounded-md border p-3 space-y-2 transition-colors',
                isSelected 
                  ? 'bg-accent border-accent-foreground/20' 
                  : 'bg-card border-border hover:bg-accent/50'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {entry.model}
                  </span>
                </div>
                <StatusIcon className={cn('h-4 w-4', statusConfig[entry.status].className)} />
              </div>

              {/* Job ID */}
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {entry.jobId}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {entry.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
