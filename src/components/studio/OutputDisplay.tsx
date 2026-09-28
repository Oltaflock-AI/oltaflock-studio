import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '@/lib/motion';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink, Maximize2, Sparkles, AlertCircle, RotateCcw, Bookmark, EyeOff } from 'lucide-react';
import { SaveToLibraryDialog } from '@/components/library/SaveToLibraryDialog';
import { StarButton } from '@/components/library/StarButton';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { OutputDisplaySkeleton } from './skeletons/OutputDisplaySkeleton';
import { SensitiveMedia } from '@/components/SensitiveMedia';

interface OutputDisplayProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** The dark "lightbox" the output sits on, in both themes, so colours read true. */
const STAGE =
  'rounded-[14px] bg-stage text-stage-foreground bg-[radial-gradient(120%_70%_at_50%_0%,hsl(240_6%_17%/0.9)_0%,transparent_65%)] dark:bg-[radial-gradient(120%_70%_at_50%_0%,hsl(240_6%_11%)_0%,transparent_65%)]';

export function OutputDisplay({ onRetry, isRetrying }: OutputDisplayProps) {
  const { selectedJobId } = useGenerationStore();
  const { generations, isLoading, setNsfw } = useGenerations();
  const progress = useGenerationProgress(selectedJobId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // One reveal shared by the inline view and fullscreen; resets per selection.
  const [nsfwRevealed, setNsfwRevealed] = useState(false);
  useEffect(() => setNsfwRevealed(false), [selectedJobId]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
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
      const originalBlob = await response.blob();
      // Re-create blob with explicit type to ensure download attribute works
      const mimeType = ext === 'png' ? 'image/png' : ext === 'mp4' ? 'video/mp4' : 'application/octet-stream';
      const blob = new Blob([originalBlob], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      // Delay cleanup so browser has time to start download
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 1000);
      toast.success(`Saved as ${filename}`);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(selectedGeneration.output_url, '_blank');
      toast.info('Opened in new tab');
    }
  };

  const handleCopyUrl = () => {
    if (!selectedGeneration?.output_url) return;
    navigator.clipboard.writeText(selectedGeneration.output_url);
    toast.success('URL copied');
  };

  const handleToggleNsfw = async () => {
    if (!selectedGeneration) return;
    const next = !selectedGeneration.is_nsfw;
    setNsfwRevealed(false);
    try {
      await setNsfw(selectedGeneration, next);
      toast.success(next ? 'Marked NSFW — blurred everywhere it shows up' : 'NSFW mark removed');
    } catch {
      toast.error('Could not update NSFW mark');
    }
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
      <div className={cn(STAGE, 'h-full flex flex-col items-center justify-center p-8')}>
        <div className="relative mb-8">
          <div className={cn(
            "w-24 h-24 rounded-2xl",
            "bg-white/[0.06] border border-white/10",
            "flex items-center justify-center"
          )}>
            <Sparkles className="h-10 w-10 text-primary animate-gentle-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-3 h-7 px-2 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <span className="font-mono text-[11.5px] font-medium text-white tabular-nums">{progress}%</span>
          </div>
        </div>
        
        <Progress value={progress} className="w-56 h-1 mb-5 bg-white/10" />
        
        <p className="text-[15px] font-medium">{getProgressLabel()}</p>
        <p className="text-[13px] text-stage-muted mt-1">
          {selectedGeneration.model}
        </p>
        
        <p className="text-[13px] text-stage-muted/80 mt-6 text-center max-w-[260px]">
          You can start another generation while this one runs
        </p>
      </div>
    );
  }

  // Error state
  if (selectedGeneration?.status === 'error') {
    return (
      <div className={cn(STAGE, 'h-full flex flex-col items-center justify-center p-8')}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center mb-5">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <p className="font-serif text-[26px] leading-none mb-2">Generation failed</p>
        <p className="text-[13.5px] text-stage-muted text-center max-w-[340px] leading-relaxed mb-5">
          {selectedGeneration.error_message || 'Unknown error occurred'}
        </p>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            size="sm"
            className="h-9 px-4 rounded-[10px] bg-white text-black hover:bg-white/90 transition-smooth"
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

  // Empty state - no selection or no output. Deliberately static.
  if (!selectedGeneration || !selectedGeneration.output_url) {
    const Icon = mediaType === 'image' ? ImageIcon : Video;
    return (
      <div className={cn(STAGE, 'h-full flex flex-col items-center justify-center p-8 text-center')}>
        <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center mb-6">
          <Icon className="h-6 w-6 text-stage-muted" strokeWidth={1.5} />
        </div>
        <p className="font-serif text-[34px] leading-none tracking-[-0.01em]">Ready to create</p>
        <p className="mt-3 text-[14px] text-stage-muted max-w-[300px] leading-relaxed">
          Write a prompt and pick a model in the console, then generate.
        </p>
        <p className="mt-5 text-[12px] text-stage-muted/70">
          <kbd className="font-sans px-1.5 py-0.5 rounded-md border border-white/15 text-stage-foreground/80">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} ↵
          </kbd>
          <span className="ml-2">to generate</span>
        </p>
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
          STAGE,
          "flex-1 overflow-hidden relative group min-h-0"
        )}>
          <SensitiveMedia
            sensitive={selectedGeneration.is_nsfw}
            size="lg"
            revealed={nsfwRevealed}
            onRevealedChange={setNsfwRevealed}
            className="absolute inset-0 flex items-center justify-center p-6"
          >
            {(hidden) => mediaType === 'image' ? (
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
                controls={!hidden}
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
              />
            )}
          </SensitiveMedia>
          
          {/* Floating action bar */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-20 p-4",
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
              {selectedGeneration && (
                <StarButton
                  generation={selectedGeneration}
                  size="md"
                  stopPropagation={false}
                  className="h-9 w-9 rounded-lg shadow-sm bg-secondary hover:bg-secondary/80"
                />
              )}
              <Button size="sm" variant="secondary" onClick={() => setShowSaveDialog(true)} className="h-9 px-4 rounded-lg shadow-sm">
                <Bookmark className="h-4 w-4 mr-2" />
                Save to Library
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleToggleNsfw}
                title={selectedGeneration.is_nsfw ? 'Marked NSFW — click to unmark' : 'Mark as NSFW (blur in history & library)'}
                aria-label={selectedGeneration.is_nsfw ? 'Unmark NSFW' : 'Mark as NSFW'}
                aria-pressed={!!selectedGeneration.is_nsfw}
                className={cn(
                  'h-9 w-9 p-0 rounded-lg shadow-sm ml-auto',
                  selectedGeneration.is_nsfw && 'text-destructive bg-destructive/10 hover:bg-destructive/15',
                )}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsFullscreen(true)} className="h-9 w-9 p-0 rounded-lg shadow-sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Prompt actually sent (after Prompt Brain) */}
        {selectedGeneration.final_prompt && (
          <div className="shrink-0 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {selectedGeneration.final_prompt !== selectedGeneration.user_prompt ? 'Prompt sent · optimized by Prompt Brain' : 'Prompt sent'}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedGeneration.final_prompt ?? '');
                  toast.success('Prompt copied');
                }}
                className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-[12.5px] text-foreground/80 leading-relaxed max-h-[4.5rem] overflow-y-auto">
              {selectedGeneration.final_prompt}
            </p>
          </div>
        )}
      </motion.div>

      <SaveToLibraryDialog
        generation={selectedGeneration ?? null}
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
      />

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-sm">
          <SensitiveMedia
            sensitive={selectedGeneration.is_nsfw}
            size="lg"
            revealed={nsfwRevealed}
            onRevealedChange={setNsfwRevealed}
            className="rounded-lg"
          >
          {(hidden) => mediaType === 'image' ? (
            <img
              src={selectedGeneration.output_url}
              alt="Generated output"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <video
              src={selectedGeneration.output_url}
              controls={!hidden}
              autoPlay={!hidden}
              className="w-full h-full object-contain rounded-lg"
            />
          )}
          </SensitiveMedia>
        </DialogContent>
      </Dialog>
    </>
  );
}
