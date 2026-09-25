import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, scaleIn } from '@/lib/motion';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Image as ImageIcon, Video, Download, Copy, ExternalLink, Maximize2, Sparkles, AlertCircle, RotateCcw, Bookmark, Star, Film, Wand2, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { reuseGeneration, animateImage, editImage, upscaleImage, upscaleVideo, editVideo } from './studioActions';
import { SaveToLibraryDialog } from '@/components/library/SaveToLibraryDialog';
import { StarButton } from '@/components/library/StarButton';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GlowOrb } from '@/components/effects/GlowOrb';
import { OutputDisplaySkeleton } from './skeletons/OutputDisplaySkeleton';
import { ParallaxLayer } from '@/components/effects/MouseParallax';

function ToolbarButton({ icon: Icon, label, title, onClick }: { icon: LucideIcon; label?: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label ? undefined : title}
      className={cn(
        'h-8 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth',
        label ? 'px-2.5' : 'w-8 justify-center',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

interface OutputDisplayProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function OutputDisplay({ onRetry, isRetrying }: OutputDisplayProps) {
  const { selectedJobId, setSelectedJobId } = useGenerationStore();
  const { generations, isLoading, updateGeneration } = useGenerations();
  const progress = useGenerationProgress(selectedJobId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { playNotification } = useNotificationSound();
  const previousStatusRef = useRef<Record<string, string>>({});

  const selectedGeneration = generations.find(g => g.id === selectedJobId);
  const mediaType = selectedGeneration?.type || 'image';
  const isRunning = selectedGeneration?.status === 'queued' || selectedGeneration?.status === 'running';

  // Tick once a second while the selected job runs, for the elapsed timer.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  // Play notification sound when a generation completes
  useEffect(() => {
    generations.forEach(gen => {
      const prevStatus = previousStatusRef.current[gen.id];
      
      // If status changed to 'done' and we have an output, play notification
      if (gen.status === 'done' && gen.output_url && prevStatus && prevStatus !== 'done') {
        playNotification(gen.id);
        toast.success(`${gen.model} finished`, {
          action: { label: 'View', onClick: () => setSelectedJobId(gen.id) },
        });
      }
      if (gen.status === 'error' && prevStatus && prevStatus !== 'error') {
        toast.error(`${gen.model} failed`, {
          description: gen.error_message?.slice(0, 120),
          action: { label: 'View', onClick: () => setSelectedJobId(gen.id) },
        });
      }
      
      // Update the previous status
      previousStatusRef.current[gen.id] = gen.status;
    });
  }, [generations, playNotification, setSelectedJobId]);

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

  const handleOpenInNewTab = () => {
    if (!selectedGeneration?.output_url) return;
    window.open(selectedGeneration.output_url, '_blank');
  };

  const handleRate = async (rating: number) => {
    if (!selectedGeneration) return;
    const next = selectedGeneration.rating === rating ? null : rating;
    try {
      await updateGeneration({ id: selectedGeneration.id, updates: { rating: next } });
      if (next && next >= 4) toast.success('Noted — Prompt Brain will lean into this style');
      else if (next && next <= 2) toast.success('Noted — Prompt Brain will steer away from this');
    } catch {
      toast.error('Could not save rating');
    }
  };

  const handleReuse = () => {
    if (!selectedGeneration) return;
    const ok = reuseGeneration(selectedGeneration);
    toast.success(ok ? 'Prompt and settings loaded' : 'Prompt loaded — that model is no longer available');
  };

  const handleSend = (action: (url: string) => string | null, verb: string) => {
    if (!selectedGeneration?.output_url) return;
    const modelName = action(selectedGeneration.output_url);
    if (modelName) toast.success(`${verb} with ${modelName} — describe what you want and generate`);
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

  // Generating state
  if (isRunning && selectedGeneration) {
    const elapsed = Math.max(0, Math.floor((now - new Date(selectedGeneration.created_at).getTime()) / 1000));
    const mm = Math.floor(elapsed / 60);
    const ss = String(elapsed % 60).padStart(2, '0');
    const typical = mediaType === 'video' ? 'Videos usually take 1–5 minutes' : 'Images usually take 10–60 seconds';
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-muted/10 to-muted/30 dark:from-muted/5 dark:to-muted/20 rounded-2xl canvas-inset p-8">
        <div className="relative mb-7">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary animate-gentle-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 min-w-8 h-8 px-1.5 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-primary tabular-nums">{progress}%</span>
          </div>
        </div>

        <Progress value={progress} className="w-60 h-1.5 mb-4" />

        <p className="text-[15px] font-medium text-foreground">
          {getProgressLabel()} <span className="text-muted-foreground font-normal tabular-nums">· {mm}:{ss}</span>
        </p>
        <p className="text-[13px] text-muted-foreground mt-1">{selectedGeneration.model}</p>

        <p className="text-[12.5px] text-muted-foreground/80 mt-6 text-center max-w-[300px] leading-relaxed">
          {typical}. Keep working — you'll get a notification when it's ready.
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
        <div className="flex items-center gap-2">
        <Button onClick={handleReuse} variant="ghost" size="sm" className="h-9 px-4 rounded-lg">
          <Wand2 className="h-4 w-4 mr-2" />
          Edit &amp; retry
        </Button>
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
              Describe your idea in the console, then press Generate
              <span className="hidden md:inline"> or {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter</span>.
            </p>
          </ParallaxLayer>
        </motion.div>
      </div>
    );
  }

  // Success state — media on top, one always-visible toolbar underneath
  const isImage = mediaType === 'image';
  const rating = selectedGeneration.rating ?? 0;
  const promptSent = selectedGeneration.final_prompt;
  const wasOptimized = !!promptSent && promptSent !== selectedGeneration.user_prompt;

  return (
    <>
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full flex flex-col gap-3 overflow-hidden"
      >
        <div className="flex-1 rounded-2xl overflow-hidden relative min-h-0 bg-gradient-to-b from-muted/20 to-muted/40 dark:from-muted/10 dark:to-muted/30 canvas-inset">
          <div className="absolute inset-0 flex items-center justify-center p-5">
            {isImage ? (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="max-w-full max-h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="View full size"
              >
                <img
                  src={selectedGeneration.output_url}
                  alt="Generated output"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
                />
              </button>
            ) : (
              <video
                key={selectedGeneration.output_url}
                src={selectedGeneration.output_url}
                controls
                loop
                playsInline
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground shadow-sm"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar: rate · next steps · keep */}
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rate this result">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => handleRate(n)}
                className="h-8 w-7 flex items-center justify-center rounded-md hover:bg-muted"
              >
                <Star className={cn('h-4 w-4 transition-colors', n <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/50')} />
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton icon={RotateCcw} label="Reuse" title="Load this prompt, model and settings" onClick={handleReuse} />
            {isImage ? (
              <>
                <ToolbarButton icon={Film} label="Animate" title="Turn this image into a video" onClick={() => handleSend(animateImage, 'Animate')} />
                <ToolbarButton icon={Wand2} label="Edit" title="Edit this image" onClick={() => handleSend(editImage, 'Edit')} />
                <ToolbarButton icon={ArrowUpRight} label="Upscale" title="Upscale with Topaz" onClick={() => handleSend(upscaleImage, 'Upscale')} />
              </>
            ) : (
              <>
                <ToolbarButton icon={Wand2} label="Edit" title="Restyle or edit this video" onClick={() => handleSend(editVideo, 'Edit')} />
                <ToolbarButton icon={ArrowUpRight} label="Upscale" title="Upscale with Topaz" onClick={() => handleSend(upscaleVideo, 'Upscale')} />
              </>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <ToolbarButton icon={Download} label="Download" onClick={handleDownload} />
            <ToolbarButton icon={Bookmark} label="Save" title="Save to library" onClick={() => setShowSaveDialog(true)} />
            <StarButton
              generation={selectedGeneration}
              size="md"
              stopPropagation={false}
              className="h-8 w-8 rounded-lg hover:bg-muted"
            />
            <ToolbarButton icon={Copy} title="Copy link" onClick={handleCopyUrl} />
            <ToolbarButton icon={ExternalLink} title="Open in new tab" onClick={handleOpenInNewTab} />
          </div>
        </div>

        {/* Prompt actually sent (after Prompt Brain) */}
        {promptSent && (
          <div className="shrink-0 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {wasOptimized ? 'Prompt sent · optimized by Prompt Brain' : 'Prompt sent'}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(promptSent);
                  toast.success('Prompt copied');
                }}
                className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-[12.5px] text-foreground/80 leading-relaxed max-h-[3.25rem] overflow-y-auto">
              {promptSent}
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
