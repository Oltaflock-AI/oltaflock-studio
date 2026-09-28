import { AlertCircle, EyeOff, Play, Star } from 'lucide-react';
import type { DbGeneration } from '@/hooks/useGenerations';
import { cn } from '@/lib/utils';
import { isActive } from './generationMeta';

export function ProgressRing({ value, size = 34 }: { value: number; size?: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        className="stroke-primary transition-[stroke-dasharray] duration-500"
        strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${(Math.max(4, value) / 100) * c} ${c}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

interface TileProps {
  generation: DbGeneration;
  progress?: number;
  selected?: boolean;
  starred?: boolean;
  onSelect?: () => void;
  /** Show the prompt on hover (off for tiny rail thumbnails). */
  hoverCaption?: boolean;
  className?: string;
  rounded?: string;
  /** Dark stage styling for the running/failed states (feed). */
  tone?: 'light' | 'dark';
}

/** One generation as an image-first tile: media, status and a hover caption. */
export function GenerationTile({
  generation: g, progress = 0, selected, starred, onSelect, hoverCaption = true, className, rounded = 'rounded-[10px]', tone = 'light',
}: TileProps) {
  const pct = Math.round(progress);
  const active = isActive(g);
  const failed = g.status === 'error';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={g.user_prompt.slice(0, 80)}
      className={cn(
        'group relative block w-full overflow-hidden text-left transition-[box-shadow,transform] duration-150',
        tone === 'dark' ? 'bg-white/[0.04]' : 'bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
        rounded, className,
      )}
    >
      {g.output_url && g.status === 'done' && (
        <span className={cn('absolute inset-0', g.is_nsfw && 'scale-125 blur-xl saturate-50')}>
          {g.type === 'video' ? (
            <video src={`${g.output_url}#t=1`} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
          ) : (
            <img src={g.output_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          )}
        </span>
      )}

      {g.is_nsfw && g.status === 'done' && (
        <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/20 text-[10.5px] font-medium text-white">
          <EyeOff className="h-3.5 w-3.5" /> Sensitive
        </span>
      )}

      {g.type === 'video' && g.status === 'done' && (
        <span className="absolute left-1.5 bottom-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Play className="h-2.5 w-2.5 fill-white" /> Video
        </span>
      )}

      {starred && (
        <span className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
          <Star className="h-3 w-3 fill-warning text-warning" />
        </span>
      )}

      {active && (
        <span className={cn('absolute inset-0 flex flex-col items-center justify-center gap-1', tone === 'dark' ? 'bg-white/[0.05] text-stage-foreground' : 'bg-secondary text-foreground')}>
          <ProgressRing value={pct} />
          <span className="font-mono text-[10.5px] tabular-nums text-primary">
            {g.status === 'queued' ? 'Queued' : `${pct}%`}
          </span>
        </span>
      )}

      {failed && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/[0.08] text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-[10.5px] font-medium">Failed</span>
        </span>
      )}

      {hoverCaption && g.status === 'done' && !g.is_nsfw && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-1 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-[11px] leading-snug text-white opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 line-clamp-3">
          {g.user_prompt}
        </span>
      )}
    </button>
  );
}
