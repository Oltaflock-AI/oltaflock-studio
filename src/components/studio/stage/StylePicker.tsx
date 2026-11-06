import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Palette, Star, X } from 'lucide-react';
import { STYLE_CATEGORIES, STYLE_PRESETS, getStyle, styleAppliesTo, type PresetKind, type StyleCategory } from '@/config/stylePresets';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { toStudioMode } from '@/types/generation';
import { StyleCover } from '@/components/presets/StyleCover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { applyStylePreset } from './generationActions';
import { cn } from '@/lib/utils';

type Filter = StyleCategory | 'all' | 'starred';

/**
 * Prompt-dock chip for the active preset, with a grid to pick another. Shows
 * image looks, plus video presets when making video; starred ones come first.
 */
export function StylePicker({ chipClassName }: { chipClassName: string }) {
  const styleId = useGenerationStore((s) => s.stylePresetId);
  const output = useGenerationStore((s) => (toStudioMode(s.mode).endsWith('video') ? 'video' : 'image'));
  const favorites = usePreferencesStore((s) => s.favoriteStyles);
  const toggleFavorite = usePreferencesStore((s) => s.toggleFavoriteStyle);
  const active = getStyle(styleId);
  const inactive = active && !styleAppliesTo(active, output);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PresetKind>(output);
  const [filter, setFilter] = useState<Filter>('all');

  const starred = favorites.map(getStyle).filter((s) => s && s.kind === kind);
  const ofKind = STYLE_PRESETS.filter((s) => s.kind === kind);
  const shown =
    filter === 'starred' ? starred
      : filter === 'all' ? [...starred, ...ofKind.filter((s) => !favorites.includes(s.id))]
        : ofKind.filter((s) => s.category === filter);

  const onOpenChange = (o: boolean) => {
    if (o) {
      setKind(output);
      setFilter('all');
    }
    setOpen(o);
  };

  const pick = (id: string | null) => {
    applyStylePreset(id);
    setOpen(false);
  };

  const pills: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    ...(starred.length ? [{ id: 'starred' as const, label: 'Starred' }] : []),
    ...STYLE_CATEGORIES.filter((c) => c.kind === kind),
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div className="inline-flex shrink-0 items-center">
        <PopoverTrigger
          className={cn(chipClassName, active && 'rounded-r-none border-r-0 pl-1', inactive && 'opacity-60')}
          title={inactive ? `${active.name} is a video preset, so it isn't added to images` : 'Style preset'}
        >
          {active ? (
            <>
              <StyleCover style={active} className="h-6 w-6 rounded-[6px]" />
              <span className="text-muted-foreground">{active.kind === 'video' ? 'Shot' : 'Style'}</span>
              <span className={cn('font-medium', inactive && 'line-through')}>{active.name}</span>
            </>
          ) : (
            <>
              <Palette className="h-3.5 w-3.5" /> Style
            </>
          )}
        </PopoverTrigger>
        {active && (
          <button
            type="button"
            onClick={() => pick(null)}
            aria-label="Clear style"
            className={cn(chipClassName, 'rounded-l-none px-1.5 text-muted-foreground')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <PopoverContent side="top" align="start" className="w-[460px] max-w-[94vw] rounded-[16px] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          {output === 'video' ? (
            <div className="inline-flex rounded-[9px] bg-muted p-0.5 text-[12px]">
              {(['video', 'image'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setKind(k); setFilter('all'); }}
                  aria-pressed={kind === k}
                  className={cn(
                    'rounded-[7px] px-2.5 py-1 transition-colors',
                    kind === k ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {k === 'video' ? 'Camera & motion' : 'Looks'}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[13px] font-semibold">Style</span>
          )}
          <Link
            to={kind === 'video' ? '/presets?kind=video' : '/presets'}
            onClick={() => setOpen(false)}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Browse all
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pt-3 [scrollbar-width:none]">
          {pills.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] transition-colors',
                filter === c.id ? 'bg-foreground font-medium text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {c.id === 'starred' && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid max-h-[46vh] grid-cols-4 gap-2 overflow-y-auto p-3">
          <button
            type="button"
            onClick={() => pick(null)}
            className={cn(
              'flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border text-[11.5px] text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              !active && 'border-solid border-foreground/40 text-foreground',
            )}
          >
            <X className="h-4 w-4" /> None
          </button>
          {shown.map((s) => {
            if (!s) return null;
            const selected = s.id === styleId;
            const fav = favorites.includes(s.id);
            return (
              <div key={s.id} className="group relative">
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  title={s.tagline}
                  className={cn(
                    'relative block aspect-[4/5] w-full overflow-hidden rounded-[10px] ring-offset-2 ring-offset-popover transition-shadow',
                    selected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-foreground/20',
                  )}
                >
                  <StyleCover style={s} sizes="100px" className="absolute inset-0" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-5 text-left text-[11px] font-medium leading-tight text-white">
                    {s.name}
                  </span>
                  {selected && (
                    <span className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(s.id)}
                  aria-pressed={fav}
                  aria-label={fav ? `Unstar ${s.name}` : `Star ${s.name}`}
                  className={cn(
                    'absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity',
                    fav ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 touch:opacity-100',
                  )}
                >
                  <Star className={cn('h-3 w-3', fav && 'fill-amber-400 text-amber-400')} />
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
