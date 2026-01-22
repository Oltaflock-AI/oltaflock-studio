import { useJobs, type DbJob } from '@/hooks/useJobs';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TYPE_LABELS, STATUS_LABELS } from '@/types/generation';
import type { JobStatus, GenerationType } from '@/types/generation';
import { format, formatDistanceStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, FileText, AlertCircle, Clock, Hash, Workflow } from 'lucide-react';

const statusStyles: Record<JobStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  processing: 'bg-primary/10 text-primary',
  completed: 'bg-green-500/10 text-green-500',
  failed: 'bg-destructive/10 text-destructive',
  deleted: 'bg-muted text-muted-foreground',
};

export function RequestDetailPanel() {
  const { jobs } = useJobs();
  const { selectedJobId } = useGenerationStore();
  
  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  if (!selectedJob) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm text-center">Select a request to view details</p>
      </div>
    );
  }

  const status = selectedJob.status as JobStatus;
  const ModeIcon = selectedJob.mode === 'image' ? ImageIcon : Video;
  const controls = selectedJob.controls as Record<string, unknown> | null;
  const completedAt = selectedJob.completed_at ? new Date(selectedJob.completed_at) : null;
  const createdAt = new Date(selectedJob.created_at);
  const timeToComplete = completedAt 
    ? formatDistanceStrict(createdAt, completedAt)
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ModeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">{selectedJob.mode}</span>
            </div>
            <Badge className={cn('text-xs', statusStyles[status])}>
              {STATUS_LABELS[status] || status}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Request ID */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Request ID
          </label>
          <p className="text-xs font-mono bg-muted/50 px-2 py-1.5 rounded break-all">
            {selectedJob.id}
          </p>
        </div>

        {/* Job ID */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Job ID
          </label>
          <p className="text-xs font-mono bg-muted/50 px-2 py-1.5 rounded break-all">
            {selectedJob.job_id}
          </p>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created
            </label>
            <p className="text-xs">
              {format(createdAt, 'PPpp')}
            </p>
          </div>
          {timeToComplete && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Duration
              </label>
              <p className="text-xs">{timeToComplete}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Model */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Model
          </label>
          <p className="text-sm font-medium">{selectedJob.model}</p>
        </div>

        {/* Generation Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Mode
          </label>
          <p className="text-sm">{TYPE_LABELS[selectedJob.generation_type as GenerationType] || selectedJob.generation_type}</p>
        </div>

        {/* Workflow ID (if available) */}
        {selectedJob.workflow_id && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Workflow className="h-3 w-3" />
              Workflow
            </label>
            <p className="text-xs font-mono bg-muted/50 px-2 py-1.5 rounded">
              {selectedJob.workflow_id}
            </p>
          </div>
        )}

        <Separator />

        {/* Raw Prompt */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Raw Prompt
          </label>
          <p className="text-sm bg-muted/50 px-2 py-1.5 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
            {selectedJob.raw_prompt}
          </p>
        </div>

        {/* Refined Prompt */}
        {selectedJob.refined_prompt && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Backend Refined Prompt
            </label>
            <p className="text-sm bg-muted/50 px-2 py-1.5 rounded whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto">
              {selectedJob.refined_prompt}
            </p>
          </div>
        )}

        <Separator />

        {/* Controls */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Controls
          </label>
          <div className="bg-muted/50 px-2 py-1.5 rounded">
            {controls && Object.entries(controls).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(controls).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-mono">
                      {typeof value === 'boolean' 
                        ? (value ? 'Yes' : 'No')
                        : Array.isArray(value)
                          ? value.join(', ')
                          : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No controls set</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Output */}
        {selectedJob.output_url && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Output
            </label>
            {selectedJob.mode === 'image' ? (
              <img 
                src={selectedJob.output_url} 
                alt="Generated output"
                className="w-full rounded-md border border-border"
              />
            ) : (
              <video 
                src={selectedJob.output_url}
                controls
                className="w-full rounded-md border border-border"
              />
            )}
          </div>
        )}

        {/* Error */}
        {selectedJob.error_message && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </label>
            <p className="text-sm text-destructive bg-destructive/10 px-2 py-1.5 rounded">
              {selectedJob.error_message}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
