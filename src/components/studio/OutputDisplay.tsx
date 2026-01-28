import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function OutputDisplay() {
  const { selectedJobId, isGenerating } = useGenerationStore();
  const { generations, isLoading } = useGenerations();

  // Find selected generation from database
  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  
  // Determine media type from database record
  const mediaType = selectedGeneration?.type || 'image';

  const handleDownload = async () => {
    if (!selectedGeneration?.output_url) return;
    
    try {
      const response = await fetch(selectedGeneration.output_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output-${selectedGeneration.request_id}.${mediaType === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleCopyUrl = () => {
    if (!selectedGeneration?.output_url) return;
    navigator.clipboard.writeText(selectedGeneration.output_url);
    toast.success('URL copied to clipboard');
  };

  const handleOpenInNewTab = () => {
    if (!selectedGeneration?.output_url) return;
    window.open(selectedGeneration.output_url, '_blank');
  };

  // Loading state for initial fetch
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Generating...</p>
        <p className="text-xs text-muted-foreground/70 mt-1">This may take a moment</p>
      </div>
    );
  }

  // No selection or no output yet
  if (!selectedGeneration || !selectedGeneration.output_url) {
    // Show running state if selected but still processing
    if (selectedGeneration?.status === 'running') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Processing...</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Waiting for result</p>
        </div>
      );
    }

    // Show error state if failed
    if (selectedGeneration?.status === 'error') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
          <p className="text-sm text-destructive mb-2">Generation failed</p>
          <p className="text-xs text-muted-foreground">{selectedGeneration.error_message || 'Unknown error'}</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        {mediaType === 'image' ? (
          <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        ) : (
          <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
        )}
        <p className="text-sm text-muted-foreground">
          Generated output will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Output Preview */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden relative group">
        {mediaType === 'image' ? (
          <img
            src={selectedGeneration.output_url}
            alt="Generated output"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={selectedGeneration.output_url}
            controls
            className="w-full h-full object-contain"
          />
        )}
        
        {/* Action Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCopyUrl}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy URL
            </Button>
            <Button size="sm" variant="secondary" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* Refined Prompt */}
      {selectedGeneration.final_prompt && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Refined Prompt (Read-Only)
          </Label>
          <Textarea
            value={selectedGeneration.final_prompt}
            readOnly
            className="min-h-[80px] bg-muted border-border resize-none font-mono text-xs opacity-80"
          />
        </div>
      )}

      {/* Job ID */}
      <div className="text-xs text-muted-foreground font-mono">
        Job ID: {selectedGeneration.request_id}
      </div>
    </div>
  );
}
