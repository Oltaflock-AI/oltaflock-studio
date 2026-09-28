import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Copy, Download, ImagePlus, Maximize2, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useGenerationStore } from '@/store/generationStore';
import { SensitiveMedia } from '@/components/SensitiveMedia';
import { StarButton } from '@/components/library/StarButton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGenerate } from '@/hooks/useGenerate';
import { cn } from '@/lib/utils';
import { animateGeneration, referenceGeneration } from './generationActions';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { ProgressRing } from './GenerationTile';

/** The stage outputs sit on: soft light in light mode, near-black in dark mode. */
export const STAGE =
  'bg-stage text-stage-foreground bg-[radial-gradient(120%_70%_at_50%_0%,hsl(0_0%_100%/0.75)_0%,transparent_65%)] dark:bg-[radial-gradient(120%_70%_at_50%_0%,hsl(240_6%_11%)_0%,transparent_65%)]';

const GLASS_BTN =
  'inline-flex h-8 whitespace-nowrap items-center disabled:opacity-50 gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-white/90 hover:bg-white/15 hover:text-white transition-smooth';

function ActionBar({ g, onFullscreen }: { g: DbGeneration; onFullscreen: () => void }) {
  const { handleRegenerateFromJob, isSubmitting } = useGenerate();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/45 p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <button type="button" className={GLASS_BTN} onClick={() => downloadGeneration(g)}><Download className="h-3.5 w-3.5" /> Download</button>
      <button type="button" className={GLASS_BTN} onClick={() => { navigator.clipboard.writeText(g.output_url ?? '').then(() => toast.success('Link copied')); }}>
        <Copy className="h-3.5 w-3.5" /> Copy link
      </button>
      <button type="button" className={GLASS_BTN} onClick={() => referenceGeneration(g)} title="Use as a reference in your next generation"><ImagePlus className="h-3.5 w-3.5" /> Reference</button>
      {g.type === 'image' && (
        <button type="button" className={GLASS_BTN} onClick={() => animateGeneration(g)}><Sparkles className="h-3.5 w-3.5" /> Animate</button>
      )}
      <button type="button" className={GLASS_BTN} onClick={handleRegenerateFromJob} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Run again
      </button>
      <StarButton generation={g} size="md" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/15" />
      <button type="button" className={cn(GLASS_BTN, 'w-8 justify-center px-0')} aria-label="Full screen" onClick={onFullscreen}><Maximize2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function RetryButton() {
  const { handleRegenerateFromJob, isSubmitting } = useGenerate();
  return (
    <button type="button" onClick={handleRegenerateFromJob} disabled={isSubmitting} className="mt-3 inline-flex h-9 items-center gap-2 rounded-[10px] bg-foreground px-4 text-[13px] font-medium text-background hover:bg-foreground/90 disabled:opacity-60">
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Try again
    </button>
  );
}

interface StudioCanvasProps {
  className?: string;
  /** Extra padding at the bottom so a floating dock doesn't cover the media. */
  bottomInset?: number;
  /** Extra padding at the top so the action bar doesn't cover the media. */
  topInset?: number;
  /** Where the action bar sits. */
  actions?: 'top' | 'bottom';
  children?: ReactNode;
}

/** The selected generation on the dark stage, with a floating action bar and prev/next. */
export function StudioCanvas({ className, bottomInset = 0, topInset = 0, actions = 'top', children }: StudioCanvasProps) {
  const { generations } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();
  const progress = Math.round(useGenerationProgress(selectedJobId));
  const index = generations.findIndex((x) => x.id === selectedJobId);
  const g = generations[index];
  const [fullscreen, setFullscreen] = useState(false);
  const step = (d: number) => {
    const next = generations[index + d];
    if (next) setSelectedJobId(next.id);
  };

  // Left/right arrows step through history when focus isn't in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={cn(STAGE, 'group relative overflow-hidden', className)}>
      <div className="absolute inset-0 flex items-center justify-center p-8" style={{ paddingBottom: 32 + bottomInset, paddingTop: 32 + topInset }}>
        {!g && <p className="font-serif text-[30px] text-stage-muted">Ready to create</p>}
        {g?.status === 'done' && g.output_url && (
          <SensitiveMedia sensitive={g.is_nsfw} size="lg" className="flex h-full w-full items-center justify-center">
            {(hidden) => g.type === 'video' ? (
              <video src={g.output_url!} controls={!hidden} autoPlay={!hidden} muted loop className="max-h-full max-w-full rounded-xl shadow-2xl" />
            ) : (
              <img src={g.output_url!} alt="Generated output" className="max-h-full max-w-full rounded-xl object-contain shadow-[0_30px_80px_-24px_rgba(0,0,0,0.35)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" />
            )}
          </SensitiveMedia>
        )}
        {g && (g.status === 'queued' || g.status === 'running') && (
          <div className="flex flex-col items-center gap-3 text-stage-foreground">
            <ProgressRing value={progress} size={56} />
            <p className="text-[14px] font-medium">Generating · {progress}%</p>
          </div>
        )}
        {g?.status === 'error' && (
          <div className="flex max-w-[340px] flex-col items-center gap-2 text-center">
            <AlertCircle className="h-7 w-7 text-destructive dark:text-red-400" />
            <p className="font-serif text-[26px] leading-none">Generation failed</p>
            <p className="text-[13px] text-stage-muted">{g.error_message}</p>
            <RetryButton />
          </div>
        )}
      </div>

      {g?.status === 'done' && (
        <div className={cn('absolute left-1/2 z-20 -translate-x-1/2', actions === 'top' ? 'top-4' : 'bottom-4')}>
          <ActionBar g={g} onFullscreen={() => setFullscreen(true)} />
        </div>
      )}

      {index > 0 && (
        <button type="button" onClick={() => step(-1)} aria-label="Newer" className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white/80 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {index >= 0 && index < generations.length - 1 && (
        <button type="button" onClick={() => step(1)} aria-label="Older" className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white/80 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {children}

      {g?.output_url && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-h-[95vh] max-w-[95vw] border-0 bg-black/95 p-2">
            <DialogTitle className="sr-only">Full screen preview</DialogTitle>
            <SensitiveMedia sensitive={g.is_nsfw} size="lg" className="flex items-center justify-center">
              {(hidden) => g.type === 'video' ? (
                <video src={g.output_url!} controls={!hidden} autoPlay={!hidden} className="max-h-[90vh] w-full object-contain" />
              ) : (
                <img src={g.output_url!} alt="Generated output" className="max-h-[90vh] w-full object-contain" />
              )}
            </SensitiveMedia>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
