import { useGenerations, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, FileText, AlertCircle, Clock, Hash } from 'lucide-react';

const statusLabels: Record<GenerationStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

const statusStyles: Record<GenerationStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-primary/10 text-primary',
  done: 'bg-green-500/10 text-green-500',
  error: 'bg-destructive/10 text-destructive',
};

export function RequestDetailPanel() {
  const { generations } = useGenerations();
  const { selectedJobId } = useGenerationStore();
  
  const selectedGeneration = generations.find((g) => g.id === selectedJobId);

  if (!selectedGeneration) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm text-center">Select a request to view details</p>
      </div>
    );
  }

  const status = selectedGeneration.status;
  const ModeIcon = selectedGeneration.type === 'image' ? ImageIcon : Video;
  const modelParams = selectedGeneration.model_params;
  const createdAt = new Date(selectedGeneration.created_at);

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium capitalize">{selectedGeneration.type}</span>
          </div>
          <Badge className={cn('text-[10px] px-1.5 py-0', statusStyles[status])}>
            {statusLabels[status]}
          </Badge>
        </div>

        <Separator />

        {/* Request ID */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-2.5 w-2.5" />
            Request ID
          </label>
          <p className="text-[10px] font-mono bg-muted/50 px-1.5 py-1 rounded break-all">
            {selectedGeneration.request_id}
          </p>
        </div>

        {/* Timestamp */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Created
          </label>
          <p className="text-[10px]">
            {format(createdAt, 'PPp')}
          </p>
        </div>

        <Separator />

        {/* Model */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Model
          </label>
          <p className="text-xs font-medium">{selectedGeneration.model}</p>
        </div>

        <Separator />

        {/* User Prompt */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            User Prompt
          </label>
          <p className="text-[10px] bg-muted/50 px-1.5 py-1 rounded whitespace-pre-wrap max-h-20 overflow-y-auto">
            {selectedGeneration.user_prompt}
          </p>
        </div>

        {/* Final Prompt */}
        {selectedGeneration.final_prompt && (
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Final Prompt
            </label>
            <p className="text-[10px] bg-muted/50 px-1.5 py-1 rounded whitespace-pre-wrap text-muted-foreground max-h-20 overflow-y-auto">
              {selectedGeneration.final_prompt}
            </p>
          </div>
        )}

        <Separator />

        {/* Model Params */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Parameters
          </label>
          <div className="bg-muted/50 px-1.5 py-1 rounded">
            {modelParams && Object.entries(modelParams).length > 0 ? (
              <div className="space-y-0.5">
                {Object.entries(modelParams).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[10px]">
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
              <p className="text-[10px] text-muted-foreground">No parameters</p>
            )}
          </div>
        </div>

        {/* Output Thumbnail */}
        {selectedGeneration.output_url && (
          <>
            <Separator />
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Output
              </label>
              {selectedGeneration.type === 'image' ? (
                <img 
                  src={selectedGeneration.output_url} 
                  alt="Generated output"
                  className="w-full rounded border border-border"
                />
              ) : (
                <video 
                  src={selectedGeneration.output_url}
                  controls
                  className="w-full rounded border border-border"
                />
              )}
            </div>
          </>
        )}

        {/* Error */}
        {selectedGeneration.error_message && (
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              Error
            </label>
            <p className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-1 rounded">
              {selectedGeneration.error_message}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
