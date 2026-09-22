import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Star, Video } from 'lucide-react';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { resolveBadgeModelId } from '@/components/studio/resolveBadgeModelId';
import { STUDIO_EYEBROW, STUDIO_MEDIA_CARD } from '@/components/layout/studioSurface';
import { cn } from '@/lib/utils';

const MAX_CARDS = 12;

function shortLabel(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Untitled';
  const label = words.slice(0, 5).join(' ');
  return words.length > 5 ? `${label}…` : label;
}

function ProgressRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        className="stroke-primary transition-[stroke-dasharray] duration-500"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(Math.max(4, value) / 100) * c} ${c}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function GenerationCard({
  generation,
  progress,
  starred,
}: {
  generation: DbGeneration;
  progress: number;
  starred: boolean;
}) {
  const isActive = generation.status === 'queued' || generation.status === 'running';
  const isError = generation.status === 'error';
  const label = shortLabel(generation.user_prompt);

  return (
    <Link
      to={`/generation/${generation.id}`}
      aria-label={`Open generation: ${label} (${generation.model})`}
      className={cn(
        STUDIO_MEDIA_CARD,
        'group relative block shrink-0 w-[176px] h-[124px] bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      {generation.output_url && generation.type === 'image' && (
        <img
          src={generation.output_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {generation.output_url && generation.type === 'video' && (
        <>
          <video
            src={`${generation.output_url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute top-2 left-2 h-[22px] w-[22px] rounded-full bg-black/45 flex items-center justify-center">
            <Video className="h-3 w-3 text-white" aria-hidden="true" />
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute left-2.5 right-2.5 bottom-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-white truncate">{label}</span>
        <ModelBadge modelId={resolveBadgeModelId(generation.model)} size="sm" className="ring-1 ring-black/20" />
      </div>

      {starred && (
        <div className="absolute top-2 right-2 h-[26px] w-[26px] rounded-full bg-black/45 flex items-center justify-center">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
          <span className="sr-only">In library</span>
        </div>
      )}

      {isActive && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
          <ProgressRing value={progress} />
          <span className="text-[11px] text-white/90 tabular-nums">
            {generation.status === 'queued' ? 'Queued' : `Generating · ${progress}%`}
          </span>
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          <span className="text-[11px] text-white/90">Failed</span>
        </div>
      )}
    </Link>
  );
}

/** Horizontal strip of the user's most recent generations as image cards. */
export function RecentGenerations() {
  const { generations } = useGenerations();
  const { findByGenerationId } = usePromptLibrary();

  const recent = useMemo(() => generations.slice(0, MAX_CARDS), [generations]);
  const activeIds = useMemo(
    () => recent.filter((g) => g.status === 'queued' || g.status === 'running').map((g) => g.id),
    [recent]
  );
  const progressMap = useMultipleGenerationProgress(activeIds);

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-generations-heading" className="shrink-0 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 id="recent-generations-heading" className={STUDIO_EYEBROW}>
          Recent generations
        </h2>
        <Link
          to="/library?tab=history"
          className="text-xs text-primary hover:underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          See all →
        </Link>
      </div>
      <div className="-mx-1 px-1 pt-1 pb-2 flex gap-3.5 overflow-x-auto">
        {recent.map((g) => (
          <GenerationCard
            key={g.id}
            generation={g}
            progress={progressMap.get(g.id) ?? 0}
            starred={!!findByGenerationId(g.id)}
          />
        ))}
      </div>
    </section>
  );
}
