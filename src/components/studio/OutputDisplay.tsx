import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleIn } from '@/lib/motion';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink, Maximize2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GlowOrb } from '@/components/effects/GlowOrb';
import { OutputDisplaySkeleton } from './skeletons/OutputDisplaySkeleton';
import { ParallaxLayer } from '@/components/effects/MouseParallax';

interface OutputDisplayProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function OutputDisplay({ onRetry, isRetrying }: OutputDisplayProps) {
  const { selectedJobId } = useGenerationStore();
  const { generations, isLoading } = useGenerations();
  const progress = useGenerationProgress(selectedJobId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { playNotification } = useNotificationSound();
  const previousStatusRef = useRef<Record<string, string>>({});

  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  const mediaType = selectedGeneration?.type || 'image';

  // Play notification sound when a generation completes
  useEffect(() => {
    generations.forEach(gen => {
      const prevStatus = previousStatusRef.current[gen.id];
      
      // If status changed to 'done' and we have an output, play notification
      if (gen.status === 'done' && gen.output_url && prevStatus && prevStatus !== 'done') {
        playNotification(gen.id);
      }
      
      // Update the previous status
      previousStatusRef.current[gen.id] = gen.status;
    });
  }, [generations, playNotification]);

  const handleDownload = async () => {
    if (!selectedGeneration?.output_url) return;

    // Smart filename from prompt: take first 6 words, sanitize
    const words = (selectedGeneration.user_prompt || '')
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(w => w.length > 0);
    const promptSlug = words.length > 0 ? words.join('-').toLowerCase().slice(0, 60) : 'output';
    const ext = mediaType === 'image' ? 'png' : 'mp4';
    const filename = `oltaflock_${promptSlug}.${ext}`;

    try {
      toast.info('Downloading...');
      const response = await fetch(selectedGeneration.output_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Download complete');
    } catch {
      window.open(selectedGeneration.output_url, '_blank');
      toast.info('Opened in new tab');
    }
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

  // Get progress label based on percentage
  const getProgressLabel = () => {
    if (progress < 15) return 'Queuing...';
    if (progress < 30) return 'Starting...';
    if (progress < 60) return 'Generating...';
    if (progress < 85) return 'Processing...';
    return 'Finalizing...';
  };

  // Loading initial data
  if (isLoading) {
    return <OutputDisplaySkeleton />;
  }

  // Generating state - Premium progress display
  if (selectedGeneration?.status === 'queued' || selectedGeneration?.status === 'running') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 dark:from-muted/5 dark:to-muted/20 rounded-2xl canvas-inset p-8">
        <div className="relative mb-8">
          <div className={cn(
            "w-24 h-24 rounded-2xl",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "flex items-center justify-center"
          )}>
            <Sparkles className="h-10 w-10 text-primary animate-gentle-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-primary tabular-nums">{progress}%</span>
          </div>
        </div>
        
        <Progress value={progress} className="w-56 h-1.5 mb-4" />
        
        <p className="text-sm font-medium text-foreground">{getProgressLabel()}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedGeneration.model}
        </p>
        
        <p className="text-xs text-muted-foreground/60 mt-6 text-center max-w-[220px]">
          You can start another generation while this one runs
        </p>
      </div>
    );
  }

  // Error state
  if (selectedGeneration?.status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 dark:from-muted/5 dark:to-muted/20 rounded-2xl canvas-inset p-8">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <p className="text-sm font-medium text-destructive mb-2">Generation failed</p>
        <p className="text-xs text-muted-foreground text-center max-w-[280px] leading-relaxed mb-4">
          {selectedGeneration.error_message || 'Unknown error occurred'}
        </p>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-lg transition-smooth"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Empty state - no selection or no output
  if (!selectedGeneration || !selectedGeneration.output_url) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 dark:from-muted/5 dark:to-muted/20 rounded-2xl canvas-inset p-8 relative overflow-hidden">
        <GlowOrb interactive />
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center"
        >
          <ParallaxLayer depth={0.5} className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              {mediaType === 'image' ? (
                <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              ) : (
                <Video className="h-10 w-10 text-muted-foreground/30" />
              )}
            </div>
          </ParallaxLayer>
          <ParallaxLayer depth={0.7} className="flex flex-col items-center">
            <p className="text-xl font-medium text-foreground mb-1">Ready to create</p>
            <p className="text-sm text-muted-foreground text-center max-w-[240px] leading-relaxed">
              Select a model and enter a prompt, then click Generate
            </p>
          </ParallaxLayer>
        </motion.div>
      </div>
    );
  }

  // Success state - Gallery-grade display
  return (
    <>
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full flex flex-col gap-4 overflow-hidden"
      >
        {/* Canvas container with refined styling */}
        <div className={cn(
          "flex-1 rounded-2xl overflow-hidden relative group min-h-0",
          "bg-gradient-to-b from-muted/20 to-muted/40 dark:from-muted/10 dark:to-muted/30",
          "canvas-inset"
        )}>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {mediaType === 'image' ? (
              <img
                src={selectedGeneration.output_url}
                alt="Generated output"
                className={cn(
                  "max-w-full max-h-full object-contain",
                  "rounded-xl shadow-xl",
                  "cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
                )}
                onClick={() => setIsFullscreen(true)}
              />
            ) : (
              <video
                src={selectedGeneration.output_url}
                controls
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
              />
            )}
          </div>
          
          {/* Floating action bar */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-4",
            "bg-gradient-to-t from-background/95 via-background/60 to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          )}>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleDownload} className="h-9 px-4 rounded-lg shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyUrl} className="h-9 px-4 rounded-lg shadow-sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button size="sm" variant="secondary" onClick={handleOpenInNewTab} className="h-9 px-4 rounded-lg shadow-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsFullscreen(true)} className="h-9 w-9 p-0 rounded-lg shadow-sm ml-auto">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Refined Prompt - Compact display */}
        {selectedGeneration.final_prompt && (
          <div className="shrink-0 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refined Prompt
            </Label>
            <div className="bg-muted/30 rounded-lg p-3 max-h-16 overflow-y-auto">
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                {selectedGeneration.final_prompt}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-sm">
          {mediaType === 'image' ? (
            <img
              src={selectedGeneration.output_url}
              alt="Generated output"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <video
              src={selectedGeneration.output_url}
              controls
              autoPlay
              className="w-full h-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
