import { Star, Wand2, Bookmark } from 'lucide-react';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/types/library';
import { PresetMedia } from './PresetMedia';
import { modelLabel, typeLabel } from './presetUtils';

interface PresetCardProps {
  item: LibraryItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUse: () => void;
  onOpen: () => void;
}

export function PresetCard({ item, isFavorite, onToggleFavorite, onUse, onOpen }: PresetCardProps) {
  const type = typeLabel(item.generation_type);
  const tag = [modelLabel(item.model), type].filter(Boolean).join(' · ');

  return (
    <div
      className={cn(
        'group relative aspect-[16/10] overflow-hidden rounded-[15px] border border-border bg-muted',
        'shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]',
        'focus-within:-translate-y-0.5'
      )}
    >
      <PresetMedia
        src={item.thumbnail_url}
        sensitive={item.is_nsfw}
        className="transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
        aria-hidden="true"
      />

      {/* Full-card hit target opens details; sits beneath the other controls. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View details for ${item.title}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      />

      <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5">
        {item.model ? (
          <ModelBadge modelId={item.model} className="shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
        ) : null}
        {!item.is_curated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            <Bookmark className="h-2.5 w-2.5" />
            Saved
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
        aria-pressed={isFavorite}
        className={cn(
          'absolute right-2 top-2 z-20 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/40 backdrop-blur-sm',
          'transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80'
        )}
      >
        <Star
          className={cn('h-[13px] w-[13px]', isFavorite ? 'fill-warning text-warning' : 'text-white')}
          strokeWidth={1.8}
        />
      </button>

      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 z-10 flex flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-medium text-white">{item.title}</span>
        <span className="truncate text-[10.5px] text-white/75">{tag}</span>
      </div>

      {/* Hover / keyboard-focus reveal */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100'
        )}
      >
        <button
          type="button"
          onClick={onUse}
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground',
            'shadow-[0_6px_16px_hsl(var(--primary)/0.35)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80'
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Use preset
        </button>
      </div>
    </div>
  );
}
