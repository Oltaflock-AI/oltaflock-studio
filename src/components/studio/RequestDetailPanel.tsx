import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TYPE_LABELS, STATUS_LABELS } from '@/types/generation';
import type { JobStatus } from '@/types/generation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, FileText, AlertCircle } from 'lucide-react';

const statusStyles: Record<JobStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  processing: 'bg-primary/10 text-primary',
  completed: 'bg-green-500/10 text-green-500',
  failed: 'bg-destructive/10 text-destructive',
  deleted: 'bg-muted text-muted-foreground',
};

export function RequestDetailPanel() {
  const { jobs, selectedJobId } = useGenerationStore();
  
  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  if (!selectedJob) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm text-center">Select a request to view details</p>
      </div>
    );
  }

  const ModeIcon = selectedJob.mode === 'image' ? ImageIcon : Video;

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
            <Badge className={cn('text-xs', statusStyles[selectedJob.status])}>
              {STATUS_LABELS[selectedJob.status]}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Job ID */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Job ID
          </label>
          <p className="text-xs font-mono bg-muted/50 px-2 py-1.5 rounded break-all">
            {selectedJob.jobId}
          </p>
        </div>

        {/* Timestamp */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Timestamp
          </label>
          <p className="text-sm">
            {format(new Date(selectedJob.timestamp), 'PPpp')}
          </p>
        </div>

        <Separator />

        {/* Model */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Model
          </label>
          <p className="text-sm">{selectedJob.model}</p>
        </div>

        {/* Generation Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Generation Type
          </label>
          <p className="text-sm">{TYPE_LABELS[selectedJob.generationType]}</p>
        </div>

        <Separator />

        {/* Raw Prompt */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Raw Prompt
          </label>
          <p className="text-sm bg-muted/50 px-2 py-1.5 rounded whitespace-pre-wrap">
            {selectedJob.rawPrompt}
          </p>
        </div>

        {/* Refined Prompt */}
        {selectedJob.refinedPrompt && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Refined Prompt (Backend)
            </label>
            <p className="text-sm bg-muted/50 px-2 py-1.5 rounded whitespace-pre-wrap text-muted-foreground">
              {selectedJob.refinedPrompt}
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
            {Object.entries(selectedJob.controls).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(selectedJob.controls).map(([key, value]) => (
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

        {/* Reference Files */}
        {selectedJob.referenceFiles && selectedJob.referenceFiles.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reference Files
            </label>
            <div className="flex flex-wrap gap-1">
              {selectedJob.referenceFiles.map((fileName, index) => (
                <Badge key={index} variant="secondary" className="text-[10px]">
                  {fileName}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Output */}
        {selectedJob.outputUrl && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Output
            </label>
            {selectedJob.mode === 'image' ? (
              <img 
                src={selectedJob.outputUrl} 
                alt="Generated output"
                className="w-full rounded-md border border-border"
              />
            ) : (
              <video 
                src={selectedJob.outputUrl}
                controls
                className="w-full rounded-md border border-border"
              />
            )}
          </div>
        )}

        {/* Error */}
        {selectedJob.error && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </label>
            <p className="text-sm text-destructive bg-destructive/10 px-2 py-1.5 rounded">
              {selectedJob.error}
            </p>
          </div>
        )}

        {/* Rating */}
        {selectedJob.rating && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  className={cn(
                    "text-lg",
                    star <= selectedJob.rating! ? "text-yellow-500" : "text-muted"
                  )}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
