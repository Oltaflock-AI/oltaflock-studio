import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Palette, X } from 'lucide-react';
import { STYLE_CATEGORIES, STYLE_PRESETS, getStyle, type StyleCategory } from '@/config/stylePresets';
import { useGenerationStore } from '@/store/generationStore';
import { StyleCover } from '@/components/presets/StyleCover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { applyStylePreset } from './generationActions';
import { cn } from '@/lib/utils';

/** Prompt-dock chip for the active style preset, with a grid to pick another. */
export function StylePicker({ chipClassName }: { chipClassName: string }) {
  const styleId = useGenerationStore((s) => s.stylePresetId);
  const active = getStyle(styleId);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<StyleCategory | 'all'>('all');
  const shown = category === 'all' ? STYLE_PRESETS : STYLE_PRESETS.filter((s) => s.category === category);

  const pick = (id: string | null) => {
    applyStylePreset(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="inline-flex shrink-0 items-center">
        <PopoverTrigger className={cn(chipClassName, active && 'rounded-r-none border-r-0 pl-1')} title="Style preset">
          {active ? (
            <>
              <StyleCover style={active} className="h-6 w-6 rounded-[6px]" />
              <span className="text-muted-foreground">Style</span>
              <span className="font-medium">{active.name}</span>
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
      <PopoverContent side="top" align="start" className="w-[440px] rounded-[16px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[13px] font-semibold">Style</span>
          <Link to="/presets" onClick={() => setOpen(false)} className="text-[12px] text-muted-foreground hover:text-foreground">
            Browse all
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pt-3 [scrollbar-width:none]">
          {[{ id: 'all' as const, label: 'All' }, ...STYLE_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] transition-colors',
                category === c.id ? 'bg-foreground font-medium text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
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
            <X className="h-4 w-4" /> No style
          </button>
          {shown.map((s) => {
            const selected = s.id === styleId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                title={s.tagline}
                className={cn(
                  'group relative aspect-[4/5] overflow-hidden rounded-[10px] ring-offset-2 ring-offset-popover transition-shadow',
                  selected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-foreground/20',
                )}
              >
                <StyleCover style={s} sizes="100px" className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-5 text-left text-[11px] font-medium leading-tight text-white">
                  {s.name}
                </span>
                {selected && (
                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
