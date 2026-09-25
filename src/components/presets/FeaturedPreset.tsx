import { Wand2, Star } from 'lucide-react';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/types/library';
import { PresetMedia } from './PresetMedia';
import { modelLabel, typeLabel } from './presetUtils';

interface FeaturedPresetProps {
  item: LibraryItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUse: () => void;
  onOpen: () => void;
}

export function FeaturedPreset({ item, isFavorite, onToggleFavorite, onUse, onOpen }: FeaturedPresetProps) {
  const type = typeLabel(item.generation_type);
  const meta = [modelLabel(item.model), type?.replace(' to ', ' → ')].filter(Boolean).join(' · ');

  return (
    <section
      aria-label="Featured preset"
      className="relative h-[168px] overflow-hidden rounded-[20px] border border-primary/30 bg-muted shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
    >
      <PresetMedia src={item.thumbnail_url} sensitive={item.is_nsfw} />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(255,255,255,0.10),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.18)_60%)]"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
        aria-pressed={isFavorite}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        <Star className={cn('h-4 w-4', isFavorite ? 'fill-warning text-warning' : 'text-white')} strokeWidth={1.8} />
      </button>

      <div className="absolute inset-y-6 left-7 right-16 flex max-w-[520px] flex-col justify-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-sky-200">Featured preset</span>
        <button
          type="button"
          onClick={onOpen}
          className="w-fit text-left font-serif text-2xl font-medium leading-tight text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm line-clamp-1"
        >
          {item.title}
        </button>
        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-white/80">{item.prompt}</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={onUse}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/0.35)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Use preset
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            {item.model ? <ModelBadge modelId={item.model} size="sm" /> : null}
            <span className="truncate text-[11px] text-white/75">{meta}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
