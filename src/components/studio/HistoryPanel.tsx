import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, Image as ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function HistoryPanel() {
  const { history } = useGenerationStore();

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">No generation history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-secondary/50 rounded border border-border p-3 space-y-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entry.mode === 'image' ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Video className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {entry.model}
                </span>
              </div>
              {entry.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-xs font-medium">{entry.rating}</span>
                </div>
              )}
            </div>

            {/* Prompt Preview */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {entry.rawPrompt}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {entry.generationType}
              </Badge>
              <span>{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
            </div>

            {/* Job ID */}
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              {entry.jobId}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
