import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink, Maximize2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function OutputDisplay() {
  const { selectedJobId, isGenerating } = useGenerationStore();
  const { generations, isLoading } = useGenerations();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  const mediaType = selectedGeneration?.type || 'image';

  const handleDownload = () => {
    if (!selectedGeneration?.output_url) return;
    const link = document.createElement('a');
    link.href = selectedGeneration.output_url;
    link.download = `output-${selectedGeneration.request_id}.${mediaType === 'image' ? 'png' : 'mp4'}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const handleCopyUrl = () => {
    if (!selectedGeneration?.output_url) return;
    navigator.clipboard.writeText(selectedGeneration.output_url);
    toast.success('URL copied');
  };

  const handleOpenInNewTab = () => {
    if (!selectedGeneration?.output_url) return;
    window.open(selectedGeneration.output_url, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-xl">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-foreground mt-4">Creating your masterpiece...</p>
        <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
      </div>
    );
  }

  // No selection or processing
  if (!selectedGeneration || !selectedGeneration.output_url) {
    if (selectedGeneration?.status === 'running') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Processing...</p>
        </div>
      );
    }

    if (selectedGeneration?.status === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-xl p-6">
          <p className="text-sm text-destructive mb-1">Generation failed</p>
          <p className="text-xs text-muted-foreground text-center max-w-[250px]">
            {selectedGeneration.error_message || 'Unknown error occurred'}
          </p>
        </div>
      );
    }

    // Empty state - no selection
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          {mediaType === 'image' ? (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          ) : (
            <Video className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Ready to create</p>
        <p className="text-xs text-muted-foreground text-center max-w-[220px]">
          Select a model and enter a prompt, then click Generate
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col gap-3 overflow-hidden">
        {/* Output Preview - Canvas feel */}
        <div className="flex-1 bg-muted/30 rounded-xl overflow-hidden relative group min-h-0 shadow-inner">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {mediaType === 'image' ? (
              <img
                src={selectedGeneration.output_url}
                alt="Generated output"
                className="max-w-full max-h-full object-contain cursor-pointer rounded-lg shadow-lg transition-transform hover:scale-[1.01]"
                onClick={() => setIsFullscreen(true)}
              />
            ) : (
              <video
                src={selectedGeneration.output_url}
                controls
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
          
          {/* Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleDownload} className="h-8 text-xs px-3">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyUrl} className="h-8 text-xs px-3">
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy URL
              </Button>
              <Button size="sm" variant="secondary" onClick={handleOpenInNewTab} className="h-8 text-xs px-3">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open
              </Button>
              {mediaType === 'image' && (
                <Button size="sm" variant="secondary" onClick={() => setIsFullscreen(true)} className="h-8 text-xs px-3 ml-auto">
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Refined Prompt */}
        {selectedGeneration.final_prompt && (
          <div className="shrink-0">
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Refined Prompt
            </Label>
            <Textarea
              value={selectedGeneration.final_prompt}
              readOnly
              className="min-h-[50px] max-h-[60px] bg-muted/50 border-border resize-none font-mono text-[10px] mt-1"
            />
          </div>
        )}

        {/* Job ID */}
        <div className="text-[10px] text-muted-foreground font-mono shrink-0">
          ID: {selectedGeneration.request_id}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <img
            src={selectedGeneration.output_url}
            alt="Generated output"
            className="w-full h-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
