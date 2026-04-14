import { motion } from 'framer-motion';
import { slideInRight } from '@/lib/motion';
import { useGenerations, type GenerationStatus } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, FileText, AlertCircle, Clock, Hash, Cpu, MessageSquare, Settings, Coins } from 'lucide-react';
import { formatCredits, formatUsd } from '@/config/pricing';

const statusLabels: Record<GenerationStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

const statusStyles: Record<GenerationStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-primary/10 text-primary',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400',
  error: 'bg-destructive/10 text-destructive',
};

// Helper component for consistent sections
function DetailSection({ 
  icon: Icon, 
  label, 
  children 
}: { 
  icon: React.ElementType; 
  label: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

export function RequestDetailPanel() {
  const { generations } = useGenerations();
  const { selectedJobId } = useGenerationStore();
  
  const selectedGeneration = generations.find((g) => g.id === selectedJobId);

  if (!selectedGeneration) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <FileText className="h-8 w-8 mb-3 opacity-30" />
        <p className="text-xs font-medium mb-1">No request selected</p>
        <p className="text-xs text-center text-muted-foreground/60 leading-relaxed">
          Select a request from history to view details
        </p>
      </div>
    );
  }

  const status = selectedGeneration.status as GenerationStatus;
  const ModeIcon = selectedGeneration.type === 'image' ? ImageIcon : Video;
  const modelParams = selectedGeneration.model_params;
  const createdAt = new Date(selectedGeneration.created_at);

  return (
    <ScrollArea className="h-full">
      <motion.div
        key={selectedJobId}
        variants={slideInRight}
        initial="hidden"
        animate="visible"
        className="p-4 space-y-5"
      >
        {/* Status Badge + Type */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <ModeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize">{selectedGeneration.type}</span>
          </div>
          <Badge className={cn('text-xs px-2.5 py-1 rounded-md font-medium', statusStyles[status])}>
            {statusLabels[status]}
          </Badge>
        </div>

        {/* Metadata Group */}
        <div className="space-y-4">
          <DetailSection icon={Hash} label="Request ID">
            <code className="text-xs font-mono bg-muted/50 px-2.5 py-1.5 rounded-md block break-all">
              {selectedGeneration.request_id}
            </code>
          </DetailSection>
          
          <DetailSection icon={Clock} label="Created">
            <span className="text-sm">{format(createdAt, 'PPp')}</span>
          </DetailSection>
          
          <DetailSection icon={Cpu} label="Model">
            <span className="text-sm font-medium">{selectedGeneration.model}</span>
          </DetailSection>
          
          {/* Cost Section */}
          {(modelParams as Record<string, unknown> | null)?.cost_credits && (
            <DetailSection icon={Coins} label="Cost">
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCredits((modelParams as Record<string, unknown>).cost_credits as number)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">credits</span>
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {formatUsd((modelParams as Record<string, unknown>).cost_usd as number)}
                </div>
              </div>
            </DetailSection>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* Prompt Section */}
        <DetailSection icon={MessageSquare} label="Prompt">
          <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
            <p className="text-xs leading-relaxed whitespace-pre-wrap">
              {selectedGeneration.user_prompt}
            </p>
          </div>
        </DetailSection>

        {/* Final Prompt */}
        {selectedGeneration.final_prompt && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refined Prompt
            </label>
            <div className="bg-muted/20 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {selectedGeneration.final_prompt}
              </p>
            </div>
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Model Params */}
        <DetailSection icon={Settings} label="Parameters">
          <div className="bg-muted/30 rounded-lg p-3">
            {modelParams && Object.entries(modelParams).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(modelParams).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground truncate">{key}:</span>
                    <span className="font-mono text-xs text-foreground text-right truncate max-w-[120px]">
                      {typeof value === 'boolean' 
                        ? (value ? 'Yes' : 'No')
                        : Array.isArray(value)
                          ? value.length > 0 ? `${value.length} items` : 'None'
                          : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No parameters</p>
            )}
          </div>
        </DetailSection>

        {/* Output Thumbnail */}
        {selectedGeneration.output_url && (
          <>
            <Separator className="bg-border/50" />
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Output Preview
              </label>
              {selectedGeneration.type === 'image' ? (
                <img 
                  src={selectedGeneration.output_url} 
                  alt="Generated output"
                  className="w-full rounded-lg border border-border/50 shadow-sm"
                />
              ) : (
                <video 
                  src={selectedGeneration.output_url}
                  controls
                  className="w-full rounded-lg border border-border/50 shadow-sm"
                />
              )}
            </div>
          </>
        )}

        {/* Error */}
        {selectedGeneration.error_message && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Error
            </label>
            <div className="bg-destructive/10 rounded-lg p-3">
              <p className="text-xs text-destructive leading-relaxed">
                {selectedGeneration.error_message}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </ScrollArea>
  );
}
