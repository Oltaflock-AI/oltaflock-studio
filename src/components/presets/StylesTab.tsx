import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Clapperboard, Clock, ImageIcon, Search, Sparkles, Star, Wand2, X } from 'lucide-react';
import {
  PRESET_KINDS, STYLE_CATEGORIES, STYLE_PRESETS, getStyle,
  type PresetKind, type StyleCategory, type StylePreset,
} from '@/config/stylePresets';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { applyStylePreset } from '@/components/studio/stage/generationActions';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StyleCover } from './StyleCover';
import { EditsTab } from './EditsTab';
import { PHOTO_EDITS } from '@/config/photoEdits';
import { cn } from '@/lib/utils';

type Filter = StyleCategory | 'all' | 'starred';

const categoryLabel = (id: StyleCategory) => STYLE_CATEGORIES.find((c) => c.id === id)?.label ?? '';

function matches(s: StylePreset, q: string) {
  if (!q) return true;
  const hay = [s.name, s.tagline, categoryLabel(s.category), ...s.notes].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/**
 * Presets: image looks and video presets. Browse by kind and category, search,
 * star favourites (they lead here and in the Studio's style menu), preview one
 * large and make it the Studio's active preset.
 */
export function StylesTab() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('kind') === 'video' ? 'video' : params.get('kind') === 'edits' ? 'edits' : 'image';
  const kind: PresetKind = view === 'video' ? 'video' : 'image';
  const activeId = useGenerationStore((s) => s.stylePresetId);
  const favorites = usePreferencesStore((s) => s.favoriteStyles);
  const recents = usePreferencesStore((s) => s.recentStyles);
  const toggleFavorite = usePreferencesStore((s) => s.toggleFavoriteStyle);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const ofKind = useMemo(() => STYLE_PRESETS.filter((s) => s.kind === kind), [kind]);
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const starred = favorites.map(getStyle).filter((s): s is StylePreset => !!s && s.kind === kind);
  const recent = recents
    .map(getStyle)
    .filter((s): s is StylePreset => !!s && s.kind === kind && !favSet.has(s.id))
    .slice(0, 6);

  const shown = ofKind.filter(
    (s) => matches(s, q) && (filter === 'all' || (filter === 'starred' ? favSet.has(s.id) : s.category === filter)),
  );
  const grouped = filter === 'all' && !q;
  const index = shown.findIndex((s) => s.id === openId);
  const open = getStyle(openId);

  const setKind = (k: PresetKind | 'edits') => {
    setParams(k === 'image' ? {} : { kind: k }, { replace: true });
    setFilter('all');
  };

  const use = (style: StylePreset) => {
    applyStylePreset(style.id);
    toast.success(`${style.name} is on`, {
      description: style.kind === 'video'
        ? 'Added to every video you generate until you clear it.'
        : 'Added to everything you generate until you clear it.',
    });
    navigate('/create');
  };

  const stop = () => {
    applyStylePreset(null);
    toast.info('Preset cleared');
  };

  const star = (style: StylePreset) => {
    const on = !favSet.has(style.id);
    toggleFavorite(style.id);
    toast(on ? `Starred ${style.name}` : `Unstarred ${style.name}`, { duration: 1500 });
  };

  const active = getStyle(activeId);
  const pills: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'starred', label: `Starred${starred.length ? ` · ${starred.length}` : ''}` },
    ...STYLE_CATEGORIES.filter((c) => c.kind === kind),
  ];

  const tabs = (
    <div className="inline-flex w-fit rounded-[12px] bg-muted p-1" role="tablist" aria-label="Preset type">
      {[...PRESET_KINDS.map((k) => ({ ...k, count: STYLE_PRESETS.filter((s) => s.kind === k.id).length })), { id: 'edits' as const, label: 'Photo edits', count: PHOTO_EDITS.length }].map((k) => {
        const on = view === k.id;
        const Icon = k.id === 'video' ? Clapperboard : k.id === 'edits' ? Wand2 : ImageIcon;
        return (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setKind(k.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[13px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              on ? 'bg-background font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {k.label}
            <span className="text-[11px] font-normal text-muted-foreground">{k.count}</span>
          </button>
        );
      })}
    </div>
  );

  if (view === 'edits') return <EditsTab tabs={tabs} />;

  const card = (s: StylePreset) => (
    <StyleCard
      key={s.id}
      style={s}
      inUse={s.id === activeId}
      starred={favSet.has(s.id)}
      onOpen={() => setOpenId(s.id)}
      onUse={() => use(s)}
      onStar={() => star(s)}
    />
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {tabs}
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === 'video' ? 'Search moves, pace, formats…' : 'Search looks, film, eras…'}
            aria-label="Search presets"
            className="h-9 rounded-[10px] pl-9 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {kind === 'video' && (
        <p className="-mt-1 text-[12.5px] text-muted-foreground">
          Camera moves, pacing and formats for video models. Hover a card to see the move. Image looks work on video too.
        </p>
      )}

      {active && (
        <div className="flex items-center gap-3 rounded-[14px] border border-primary/40 bg-primary/5 p-2 pr-3">
          <StyleCover style={active} play className="h-11 w-11 shrink-0 rounded-[9px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">In use in Studio</p>
            <p className="truncate text-[14px] font-medium">{active.name}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={stop} className="h-8 rounded-[9px]">Clear</Button>
          <Button size="sm" onClick={() => navigate('/create')} className="h-8 rounded-[9px]">Open Studio</Button>
        </div>
      )}

      {grouped && (
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-10">
          <section className="flex min-w-0 flex-col gap-2.5 lg:max-w-[62%]">
            <SectionTitle icon={<Star className="h-3.5 w-3.5 fill-current text-amber-400" />} label="Your favourites" />
            {starred.length > 0 ? (
              <Rail>{starred.map((s) => <RailItem key={s.id} style={s} starred inUse={s.id === activeId} onOpen={() => setOpenId(s.id)} onStar={() => star(s)} />)}</Rail>
            ) : (
              <p className="max-w-[420px] rounded-[12px] border border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground">
                Tap the <Star className="inline h-3 w-3 align-[-1px]" /> on any preset to keep it here. Starred presets also show first in the Studio's style menu.
              </p>
            )}
          </section>
          {recent.length > 0 && (
            <section className="flex min-w-0 flex-col gap-2.5">
              <SectionTitle icon={<Clock className="h-3.5 w-3.5" />} label="Recently used" />
              <Rail>{recent.map((s) => <RailItem key={s.id} style={s} inUse={s.id === activeId} onOpen={() => setOpenId(s.id)} onStar={() => star(s)} />)}</Rail>
            </section>
          )}
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-5 sm:px-5" role="group" aria-label="Filter presets">
        {pills.map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilter(p.id)}
              aria-pressed={on}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-[15px] py-2 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                on ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {p.id === 'starred' && <Star className={cn('h-3 w-3', on ? 'fill-current' : 'fill-amber-400 text-amber-400')} />}
              {p.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border py-14 text-center">
          <p className="text-[14px] font-medium">
            {filter === 'starred' && !q ? 'Nothing starred yet' : 'No presets match'}
          </p>
          <p className="max-w-[340px] text-[12.5px] text-muted-foreground">
            {filter === 'starred' && !q
              ? 'Star the presets you reach for and they will wait for you here.'
              : 'Try another word, or clear the filters.'}
          </p>
          <Button variant="outline" size="sm" className="mt-2 rounded-[9px]" onClick={() => { setQuery(''); setFilter('all'); }}>
            Show all {kind === 'video' ? 'video presets' : 'looks'}
          </Button>
        </div>
      ) : grouped ? (
        STYLE_CATEGORIES.filter((c) => c.kind === kind).map((c) => (
          <section key={c.id} className="flex flex-col gap-3">
            <SectionTitle label={c.label} count={ofKind.filter((s) => s.category === c.id).length} />
            <Grid>{ofKind.filter((s) => s.category === c.id).map(card)}</Grid>
          </section>
        ))
      ) : (
        <Grid>{shown.map(card)}</Grid>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <StylePreview
            style={open}
            inUse={open.id === activeId}
            starred={favSet.has(open.id)}
            onUse={() => use(open)}
            onStop={stop}
            onStar={() => star(open)}
            onPrev={index > 0 ? () => setOpenId(shown[index - 1].id) : undefined}
            onNext={index >= 0 && index < shown.length - 1 ? () => setOpenId(shown[index + 1].id) : undefined}
          />
        )}
      </Dialog>
    </>
  );
}

function SectionTitle({ label, count, icon }: { label: string; count?: number; icon?: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
      {icon}
      {label}
      {count !== undefined && <span className="font-normal text-muted-foreground">{count}</span>}
    </h2>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{children}</div>;
}

function Rail({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">{children}</div>;
}

function StarButton({ starred, onStar, name, className }: { starred: boolean; onStar: () => void; name: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onStar(); }}
      aria-pressed={starred}
      aria-label={starred ? `Unstar ${name}` : `Star ${name}`}
      title={starred ? 'Unstar' : 'Star'}
      className={cn(
        'z-10 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-all hover:bg-black/65',
        'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
        starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:opacity-100',
        className,
      )}
    >
      <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400 text-amber-400')} />
    </button>
  );
}

/** Compact tile for the favourites and recent rails. */
function RailItem({
  style, starred = false, inUse, onOpen, onStar,
}: { style: StylePreset; starred?: boolean; inUse: boolean; onOpen: () => void; onStar: () => void }) {
  return (
    <div className="group relative w-[120px] shrink-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'relative block aspect-[4/5] w-full overflow-hidden rounded-[12px] text-left ring-offset-2 ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          inUse && 'ring-2 ring-primary',
        )}
      >
        <StyleCover style={style} sizes="120px" className="absolute inset-0" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 text-[12px] font-medium leading-tight text-white">
          {style.name}
        </span>
      </button>
      <StarButton starred={starred} onStar={onStar} name={style.name} className="absolute right-1.5 top-1.5 h-6 w-6" />
    </div>
  );
}

function StyleCard({
  style, inUse, starred, onOpen, onUse, onStar,
}: {
  style: StylePreset;
  inUse: boolean;
  starred: boolean;
  onOpen: () => void;
  onUse: () => void;
  onStar: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[15px] border bg-card transition-smooth',
        inUse ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/20',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${style.name}`}
        className="absolute inset-0 z-[1] rounded-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <StyleCover
          style={style}
          sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 22vw, 45vw"
          className={cn('absolute inset-0', !style.motion && 'transition-transform duration-500 group-hover:scale-[1.035]')}
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
        <StarButton starred={starred} onStar={onStar} name={style.name} className="absolute right-2 top-2" />
        {!inUse && (
          <button
            type="button"
            onClick={onUse}
            className={cn(
              'absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-black shadow-sm backdrop-blur',
              'opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 touch:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Sparkles className="h-3 w-3" /> Use
          </button>
        )}
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
    </div>
  );
}

function StylePreview({
  style, inUse, starred, onUse, onStop, onStar, onPrev, onNext,
}: {
  style: StylePreset;
  inUse: boolean;
  starred: boolean;
  onUse: () => void;
  onStop: () => void;
  onStar: () => void;
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

  const video = style.kind === 'video';

  return (
    <DialogContent className="max-h-[92vh] w-[min(1040px,94vw)] max-w-none gap-0 overflow-hidden rounded-[20px] p-0 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative bg-muted md:min-h-[560px]">
        <StyleCover style={style} play sizes="560px" className="aspect-[4/5] w-full md:absolute md:inset-0 md:aspect-auto" />
        {video && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur">
            <Clapperboard className="h-3 w-3" /> Motion preview
          </span>
        )}
        {[onPrev, onNext].map((fn, i) =>
          fn ? (
            <button
              key={i}
              type="button"
              onClick={fn}
              aria-label={i === 0 ? 'Previous preset' : 'Next preset'}
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
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {video ? 'Video' : 'Image look'} · {categoryLabel(style.category)}
        </span>
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
          {video
            ? 'Works with any video model. Write your subject as usual; the move is added when you generate. Picking it switches the Studio to video if needed.'
            : 'Works with any image or video model. Write your subject as usual; the look is added when you generate and stays on until you clear it.'}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button onClick={onUse} className="h-10 gap-1.5 rounded-[11px] px-5 font-semibold">
            <Sparkles className="h-4 w-4" />
            {inUse ? 'Open Studio' : 'Use this preset'}
          </Button>
          <Button variant="outline" onClick={onStar} aria-pressed={starred} className="h-10 gap-1.5 rounded-[11px]">
            <Star className={cn('h-4 w-4', starred && 'fill-amber-400 text-amber-400')} />
            {starred ? 'Starred' : 'Star'}
          </Button>
          {inUse && (
            <Button variant="ghost" onClick={onStop} className="h-10 rounded-[11px]">
              Stop using
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}
