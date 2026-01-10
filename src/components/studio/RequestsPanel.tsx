import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Video, Clock, CheckCircle2, XCircle, Loader2, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/generation';

const statusConfig: Record<JobStatus, { icon: React.ElementType; className: string; label: string }> = {
  queued: { icon: Clock, className: 'text-muted-foreground', label: 'Queued' },
  processing: { icon: Loader2, className: 'text-primary animate-spin', label: 'Processing' },
  completed: { icon: CheckCircle2, className: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, className: 'text-destructive', label: 'Failed' },
  deleted: { icon: Trash2, className: 'text-muted-foreground', label: 'Deleted' },
};

export function RequestsPanel() {
  const { jobs, selectedJobId, setSelectedJobId, deleteJob } = useGenerationStore();
  
  // Get active (non-deleted) jobs, sorted by timestamp (newest first)
  const activeJobs = jobs
    .filter((job) => !job.deleted)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (activeJobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No requests yet</p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    deleteJob(jobId);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {activeJobs.map((job) => {
          const StatusIcon = statusConfig[job.status].icon;
          const isSelected = selectedJobId === job.id;
          const ModeIcon = job.mode === 'image' ? ImageIcon : Video;

          return (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={cn(
                'w-full text-left rounded-md border p-3 space-y-2 transition-colors cursor-pointer group',
                isSelected 
                  ? 'bg-accent border-accent-foreground/20' 
                  : 'bg-card border-border hover:bg-accent/50'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {job.model}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon className={cn('h-4 w-4', statusConfig[job.status].className)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, job.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Job ID */}
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {job.jobId}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    job.status === 'completed' && "border-green-500/50 text-green-500",
                    job.status === 'failed' && "border-destructive/50 text-destructive",
                    job.status === 'processing' && "border-primary/50 text-primary"
                  )}
                >
                  {statusConfig[job.status].label}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(job.timestamp), 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
