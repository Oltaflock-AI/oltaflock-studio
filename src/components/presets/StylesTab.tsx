import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { STYLE_CATEGORIES, STYLE_PRESETS, type StyleCategory, type StylePreset } from '@/config/stylePresets';
import { useGenerationStore } from '@/store/generationStore';
import { applyStylePreset } from '@/components/studio/stage/generationActions';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StyleCover } from './StyleCover';
import { cn } from '@/lib/utils';

/** Presets → Styles: browse looks, preview one large, and make it the Studio's active style. */
export function StylesTab() {
  const navigate = useNavigate();
  const activeId = useGenerationStore((s) => s.stylePresetId);
  const [category, setCategory] = useState<StyleCategory | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = category === 'all' ? STYLE_PRESETS : STYLE_PRESETS.filter((s) => s.category === category);
  const index = shown.findIndex((s) => s.id === openId);
  const open = index >= 0 ? shown[index] : null;

  const use = (style: StylePreset) => {
    applyStylePreset(style.id);
    toast.success(`${style.name} is on`, { description: 'Everything you generate will use this look until you clear it.' });
    navigate('/');
  };

  const stop = () => {
    applyStylePreset(null);
    toast.info('Style cleared');
  };

  const pills: Array<{ id: StyleCategory | 'all'; label: string }> = [{ id: 'all', label: 'All' }, ...STYLE_CATEGORIES];

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter styles">
        {pills.map((p) => {
          const active = category === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setCategory(p.id)}
              aria-pressed={active}
              className={cn(
                'rounded-full px-[15px] py-2 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {shown.map((s) => (
          <StyleCard key={s.id} style={s} inUse={s.id === activeId} onOpen={() => setOpenId(s.id)} />
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <StylePreview
            style={open}
            inUse={open.id === activeId}
            onUse={() => use(open)}
            onStop={stop}
            onPrev={index > 0 ? () => setOpenId(shown[index - 1].id) : undefined}
            onNext={index < shown.length - 1 ? () => setOpenId(shown[index + 1].id) : undefined}
          />
        )}
      </Dialog>
    </>
  );
}

function StyleCard({ style, inUse, onOpen }: { style: StylePreset; inUse: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[15px] border bg-card text-left transition-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        inUse ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/20',
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <StyleCover
          style={style}
          sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 22vw, 45vw"
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.035]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {inUse && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">
              <Check className="h-3 w-3" /> In use
            </span>
          )}
          {style.isNew && !inUse && (
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">New</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2.5">
        <span className="font-serif text-[19px] leading-tight">{style.name}</span>
        <span className="line-clamp-1 text-[12px] text-muted-foreground">{style.tagline}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {style.notes.slice(0, 3).map((n) => (
            <span key={n} className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{n}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

function StylePreview({
  style, inUse, onUse, onStop, onPrev, onNext,
}: {
  style: StylePreset;
  inUse: boolean;
  onUse: () => void;
  onStop: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);

  const category = STYLE_CATEGORIES.find((c) => c.id === style.category)?.label;

  return (
    <DialogContent className="max-h-[92vh] w-[min(1040px,94vw)] max-w-none gap-0 overflow-hidden rounded-[20px] p-0 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative bg-muted md:min-h-[560px]">
        <StyleCover style={style} sizes="560px" className="aspect-[4/5] w-full md:absolute md:inset-0 md:aspect-auto" />
        {[onPrev, onNext].map((fn, i) =>
          fn ? (
            <button
              key={i}
              type="button"
              onClick={fn}
              aria-label={i === 0 ? 'Previous style' : 'Next style'}
              className={cn(
                'absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65',
                i === 0 ? 'left-3' : 'right-3',
              )}
            >
              {i === 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : null,
        )}
      </div>

      <div className="flex max-h-[92vh] flex-col overflow-y-auto p-6 sm:p-7">
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{category}</span>
        <DialogTitle className="mt-1 font-serif text-[34px] font-normal leading-[1.05]">{style.name}</DialogTitle>
        <DialogDescription className="mt-2 text-[14px] text-muted-foreground">{style.tagline}</DialogDescription>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {style.notes.map((n) => (
            <span key={n} className="rounded-full border border-border px-2.5 py-1 text-[12px]">{n}</span>
          ))}
          {style.aspect && (
            <span className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground">Best at {style.aspect}</span>
          )}
        </div>

        <div className="mt-6">
          <p className="text-[12px] font-medium text-muted-foreground">Added to your prompt</p>
          <p className="mt-1.5 rounded-[12px] bg-muted/60 p-3 text-[13px] leading-relaxed">{style.prompt}</p>
        </div>

        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Write your own subject as usual. The look is added when you generate, with any model, and stays on until you clear it.
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button onClick={onUse} className="h-10 gap-1.5 rounded-[11px] px-5 font-semibold">
            <Sparkles className="h-4 w-4" />
            {inUse ? 'Open Studio' : 'Use this style'}
          </Button>
          {inUse && (
            <Button variant="outline" onClick={onStop} className="h-10 rounded-[11px]">
              Stop using
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}
