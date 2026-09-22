import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Film, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelBadge } from '@/components/studio/ModelBadge';
import type { DbGeneration } from '@/hooks/useGenerations';
import { modelDisplayName } from './modelName';

// Times are shown in IST (the team's timezone), regardless of the browser's zone.
const TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});
const dateLabelFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const dateLabelWithYearFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

interface HistoryGroup {
  key: string;
  label: string;
  rows: DbGeneration[];
}

function groupByDay(generations: DbGeneration[]): HistoryGroup[] {
  const now = Date.now();
  const todayKey = dayKeyFmt.format(now);
  const yesterdayKey = dayKeyFmt.format(now - DAY_MS);
  const thisYear = todayKey.slice(0, 4);

  const groups = new Map<string, HistoryGroup>();
  for (const gen of generations) {
    const date = new Date(gen.created_at);
    const key = dayKeyFmt.format(date);
    let group = groups.get(key);
    if (!group) {
      const label =
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
            ? 'Yesterday'
            : key.slice(0, 4) === thisYear
              ? dateLabelFmt.format(date)
              : dateLabelWithYearFmt.format(date);
      group = { key, label, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(gen);
  }
  // Input is already newest-first; keep insertion order.
  return Array.from(groups.values());
}

interface Props {
  generations: DbGeneration[];
  isLoading: boolean;
  /** Free-text filter on prompt/model; applied here so the page search box drives both views. */
  search: string;
}

export function HistoryList({ generations, isLoading, search }: Props) {
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? generations.filter((g) =>
          `${g.user_prompt} ${g.model} ${modelDisplayName(g.model)}`.toLowerCase().includes(q)
        )
      : generations;
    return groupByDay(filtered);
  }, [generations, search]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading history" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">
          {generations.length === 0 ? 'No generations yet' : 'No generations match'}
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {generations.length === 0
            ? 'Everything you generate in the studio shows up here.'
            : 'Try a different search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`history-${group.key}`} className="flex flex-col gap-2">
          <h2
            id={`history-${group.key}`}
            className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {group.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.rows.map((gen) => (
              <li key={gen.id}>
                <HistoryRow gen={gen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function HistoryRow({ gen }: { gen: DbGeneration }) {
  const prompt = gen.user_prompt?.trim() || 'Untitled generation';
  const isPending = gen.status === 'queued' || gen.status === 'running';

  return (
    <Link
      to={`/generation/${gen.id}`}
      className={cn(
        'group flex items-center gap-3.5 rounded-[13px] border border-border bg-card px-3.5 py-2.5 shadow-sm',
        'transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <Thumb gen={gen} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-foreground" title={prompt}>
          {prompt}
        </span>
        {gen.status !== 'done' && (
          <span
            className={cn(
              'mt-0.5 flex items-center gap-1 text-[11px]',
              gen.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                {gen.status === 'queued' ? 'Queued' : `Generating${gen.progress ? ` · ${Math.round(gen.progress)}%` : ''}`}
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                <span className="truncate">{gen.error_message || 'Failed'}</span>
              </>
            )}
          </span>
        )}
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2.5 text-[10.5px] text-muted-foreground sm:flex">
        <ModelBadge modelId={gen.model} size="sm" className="rounded-full" />
        {modelDisplayName(gen.model)}
      </span>
      <ModelBadge modelId={gen.model} size="sm" className="sm:hidden" />
      <time
        dateTime={gen.created_at}
        className="w-[60px] shrink-0 text-right text-[11px] tabular-nums text-muted-foreground"
      >
        {timeFmt.format(new Date(gen.created_at))}
      </time>
    </Link>
  );
}

function Thumb({ gen }: { gen: DbGeneration }) {
  const base = 'relative h-[38px] w-[52px] shrink-0 overflow-hidden rounded-[9px] bg-muted';

  if (gen.status === 'done' && gen.output_url) {
    return (
      <div className={base}>
        {gen.type === 'video' ? (
          <>
            <video
              src={gen.output_url}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            />
            <Film className="absolute bottom-0.5 right-0.5 h-3 w-3 text-white drop-shadow" aria-hidden="true" />
          </>
        ) : (
          <img
            src={gen.output_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  const Icon = gen.type === 'video' ? Film : ImageIcon;
  return (
    <div className={cn(base, 'flex items-center justify-center')}>
      <Icon className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
    </div>
  );
}
