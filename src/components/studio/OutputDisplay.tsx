import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function OutputDisplay() {
  const { mode, currentOutput, isGenerating } = useGenerationStore();

  const handleDownload = async () => {
    if (!currentOutput?.outputUrl) return;
    
    try {
      const response = await fetch(currentOutput.outputUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output-${currentOutput.jobId}.${mode === 'image' ? 'png' : 'mp4'}`;
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
    if (!currentOutput?.outputUrl) return;
    navigator.clipboard.writeText(currentOutput.outputUrl);
    toast.success('URL copied to clipboard');
  };

  const handleOpenInNewTab = () => {
    if (!currentOutput?.outputUrl) return;
    window.open(currentOutput.outputUrl, '_blank');
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Generating...</p>
        <p className="text-xs text-muted-foreground/70 mt-1">This may take a moment</p>
      </div>
    );
  }

  if (!currentOutput) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
        {mode === 'image' ? (
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
        {mode === 'image' ? (
          <img
            src={currentOutput.outputUrl}
            alt="Generated output"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={currentOutput.outputUrl}
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
      {currentOutput.refinedPrompt && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Refined Prompt (Read-Only)
          </Label>
          <Textarea
            value={currentOutput.refinedPrompt}
            readOnly
            className="min-h-[80px] bg-muted border-border resize-none font-mono text-xs opacity-80"
          />
        </div>
      )}

      {/* Job ID */}
      <div className="text-xs text-muted-foreground font-mono">
        Job ID: {currentOutput.jobId}
      </div>
    </div>
  );
}
