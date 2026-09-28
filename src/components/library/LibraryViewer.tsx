import { useEffect } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DbGeneration } from '@/hooks/useGenerations';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SensitiveMedia } from '@/components/SensitiveMedia';
import { DetailsPanel } from '@/components/studio/stage/DetailsCard';
import { STAGE } from '@/components/studio/stage/StudioCanvas';
import { ProgressRing } from '@/components/studio/stage/GenerationTile';
import { displayTitle } from '@/components/studio/stage/generationMeta';
import { cn } from '@/lib/utils';

/** Full-size viewer for one generation, with details beside it and arrows to move through the list. */
export function LibraryViewer({ items, openId, onOpenId }: { items: DbGeneration[]; openId: string | null; onOpenId: (id: string | null) => void }) {
  const index = items.findIndex((g) => g.id === openId);
  const g = items[index];
  const go = (d: number) => { const next = items[index + d]; if (next) onOpenId(next.id); };

  useEffect(() => {
    if (!g) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Dialog open={!!g} onOpenChange={(o) => !o && onOpenId(null)}>
      <DialogContent className="flex h-[88vh] max-w-[min(1400px,94vw)] gap-0 overflow-hidden rounded-[22px] border-0 p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{g ? displayTitle(g) : 'Viewer'}</DialogTitle>
        {g && (
          <>
            <div className={cn(STAGE, 'group relative flex min-w-0 flex-1 items-center justify-center p-8')}>
              {g.status === 'done' && g.output_url ? (
                <SensitiveMedia key={g.id} sensitive={g.is_nsfw} size="lg" className="flex h-full w-full items-center justify-center">
                  {(hidden) => g.type === 'video' ? (
                    <video src={g.output_url!} controls={!hidden} autoPlay={!hidden} loop className="max-h-full max-w-full rounded-xl shadow-2xl" />
                  ) : (
                    <img src={g.output_url!} alt={displayTitle(g)} className="max-h-full max-w-full rounded-xl object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" />
                  )}
                </SensitiveMedia>
              ) : g.status === 'error' ? (
                <div className="flex flex-col items-center gap-2 text-center text-stage-foreground">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                  <p className="font-serif text-[26px]">Generation failed</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-stage-foreground"><ProgressRing value={g.progress} size={56} /><p>Generating</p></div>
              )}

              <span className="absolute left-5 top-4 font-mono text-[12px] tabular-nums text-stage-muted">{index + 1} / {items.length}</span>
              {index > 0 && (
                <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/85 backdrop-blur hover:text-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {index < items.length - 1 && (
                <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/85 backdrop-blur hover:text-white">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <aside className="relative w-[380px] shrink-0 overflow-y-auto border-l border-border bg-card p-5 pt-12">
              <button type="button" onClick={() => onOpenId(null)} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <DetailsPanel g={g} />
            </aside>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
