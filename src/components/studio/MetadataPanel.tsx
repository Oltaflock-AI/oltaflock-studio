import { useGenerationStore } from '@/store/generationStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TYPE_LABELS, ALL_MODELS } from '@/types/generation';
import { format } from 'date-fns';

export function MetadataPanel() {
  const { history, selectedHistoryId, selectedModel, generationType, controls, currentOutput, mode, characterIds } = useGenerationStore();
  
  const selectedEntry = history.find((e) => e.id === selectedHistoryId);
  const modelConfig = ALL_MODELS.find((m) => m.id === selectedModel);

  // Show current generation context if no history entry selected
  if (!selectedEntry) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Current Generation</h3>
            
            {selectedModel ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mode</Label>
                  <p className="text-sm font-medium capitalize">{mode}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Model</Label>
                  <p className="text-sm font-medium">{modelConfig?.displayName || selectedModel}</p>
                </div>
                
                {generationType && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Generation Type</Label>
                    <p className="text-sm font-medium">{TYPE_LABELS[generationType]}</p>
                  </div>
                )}

                {Object.keys(controls).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Parameters</Label>
                      <div className="space-y-2 mt-2">
                        {Object.entries(controls).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {characterIds.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Character IDs</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {characterIds.map((id, index) => (
                        <Badge key={index} variant="secondary" className="font-mono text-xs">
                          {id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {currentOutput?.refinedPrompt && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Refined Prompt</Label>
                      <Textarea
                        value={currentOutput.refinedPrompt}
                        readOnly
                        className="min-h-[100px] bg-muted border-border resize-none font-mono text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a model to begin</p>
            )}
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Show selected history entry details
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Job Details</h3>
            <Badge 
              variant={selectedEntry.status === 'completed' ? 'default' : selectedEntry.status === 'failed' ? 'destructive' : 'secondary'}
            >
              {selectedEntry.status}
            </Badge>
          </div>
          <p className="text-xs font-mono text-muted-foreground">{selectedEntry.jobId}</p>
        </div>

        <Separator />

        {/* Model Info */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mode</Label>
            <p className="text-sm font-medium capitalize">{selectedEntry.mode}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Model</Label>
            <p className="text-sm font-medium">{selectedEntry.model}</p>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Generation Type</Label>
            <p className="text-sm font-medium">{TYPE_LABELS[selectedEntry.generationType]}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Timestamp</Label>
            <p className="text-sm font-mono">{format(new Date(selectedEntry.timestamp), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>

          {selectedEntry.rating && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Rating</Label>
              <p className="text-sm font-medium">{selectedEntry.rating} / 5</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Parameters */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Submitted Parameters</Label>
          <div className="space-y-2 mt-2">
            {Object.entries(selectedEntry.controls).map(([key, value]) => {
              // Handle characterIds array separately
              if (key === 'characterIds' && Array.isArray(value)) {
                return (
                  <div key={key} className="space-y-1">
                    <span className="text-sm text-muted-foreground">Character IDs</span>
                    <div className="flex flex-wrap gap-1">
                      {(value as string[]).map((id, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs">
                          {id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Raw Prompt */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Raw Prompt</Label>
          <Textarea
            value={selectedEntry.rawPrompt}
            readOnly
            className="min-h-[80px] bg-muted border-border resize-none text-xs"
          />
        </div>

        {/* Refined Prompt */}
        {selectedEntry.refinedPrompt && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Refined Prompt</Label>
            <Textarea
              value={selectedEntry.refinedPrompt}
              readOnly
              className="min-h-[100px] bg-muted border-border resize-none font-mono text-xs"
            />
          </div>
        )}

        {/* Error */}
        {selectedEntry.error && (
          <div className="space-y-2">
            <Label className="text-xs text-destructive uppercase tracking-wide">Error</Label>
            <p className="text-sm text-destructive font-mono">{selectedEntry.error}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
