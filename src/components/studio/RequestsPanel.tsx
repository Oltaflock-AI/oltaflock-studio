import { useJobs, type DbJob } from '@/hooks/useJobs';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Video, Clock, CheckCircle2, XCircle, Loader2, Trash2, FileText, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/generation';

const statusConfig: Record<JobStatus, { icon: React.ElementType; className: string; label: string }> = {
  queued: { icon: Clock, className: 'text-muted-foreground', label: 'Queued' },
  processing: { icon: Loader2, className: 'text-primary animate-spin', label: 'Running' },
  completed: { icon: CheckCircle2, className: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, className: 'text-destructive', label: 'Failed' },
  deleted: { icon: Trash2, className: 'text-muted-foreground', label: 'Deleted' },
};

export function RequestsPanel() {
  const { jobs, isLoading, deleteJob } = useJobs();
  const { selectedJobId, setSelectedJobId, setCurrentOutput } = useGenerationStore();

  const handleSelectJob = (job: DbJob) => {
    setSelectedJobId(job.id);
    if (job.output_url) {
      setCurrentOutput({
        jobId: job.job_id,
        outputUrl: job.output_url,
        refinedPrompt: job.refined_prompt || '',
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      await deleteJob(jobId);
    } catch (error) {
      console.error('Failed to delete job:', error);
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

  if (jobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No requests yet</p>
        <p className="text-xs text-muted-foreground/70">Generate your first output</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {jobs.map((job) => {
          const status = job.status as JobStatus;
          const StatusIcon = statusConfig[status]?.icon || Clock;
          const isSelected = selectedJobId === job.id;
          const ModeIcon = job.mode === 'image' ? ImageIcon : Video;
          const promptPreview = job.raw_prompt.length > 40 
            ? job.raw_prompt.slice(0, 40) + '...' 
            : job.raw_prompt;

          return (
            <div
              key={job.id}
              onClick={() => handleSelectJob(job)}
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
                    {job.model}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon className={cn('h-3.5 w-3.5', statusConfig[status]?.className)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, job.id)}
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
                    status === 'completed' && "border-green-500/50 text-green-500",
                    status === 'failed' && "border-destructive/50 text-destructive",
                    status === 'processing' && "border-primary/50 text-primary"
                  )}
                >
                  {statusConfig[status]?.label || status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{format(new Date(job.created_at), 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
