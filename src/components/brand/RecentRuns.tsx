import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Check, Download, Loader2, Maximize2, MessageSquareWarning, NotebookPen, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { DbGeneration } from '@/hooks/useGenerations';
import { memberName, useTeam } from '@/hooks/useTeam';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { GenerationTile } from '@/components/studio/stage/GenerationTile';
import { isActive } from '@/components/studio/stage/generationMeta';
import { reuseGeneration } from '@/components/studio/stage/generationActions';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { printFit } from '@/brands/compose';
import { upscaleForPrint } from '@/brands/runJob';
import { useBrandWork, type BrandReview, type ReviewStatus } from '@/brands/useBrandWork';
import { JobCover } from './JobCover';
import { CaptionDialog } from './CaptionDialog';
import type { BrandJob, BrandKit } from '@/brands';
import { cn } from '@/lib/utils';

interface Run {
  id: string;
  jobId: string;
  userId: string | null;
  createdAt: string;
  total: number;
  items: DbGeneration[];
}

type View = 'all' | 'review' | 'approved' | 'changes';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'review', label: 'Waiting for review' },
  { id: 'changes', label: 'Needs changes' },
  { id: 'approved', label: 'Approved' },
];

const meta = (g: DbGeneration) => (g.model_params ?? {}) as Record<string, unknown>;
const ready = (g: DbGeneration) => g.status === 'done' && !!g.output_url;

function inView(view: View, g: DbGeneration, review?: BrandReview) {
  if (view === 'all') return true;
  if (!ready(g)) return false;
  if (view === 'review') return !review;
  return review?.status === view;
}

/** The team's work from brand jobs, grouped by job run, with review status on every result. */
export function RecentRuns({ brand }: { brand: BrandKit }) {
  const { user } = useAuth();
  const { generations, reviews, isLoading, error, setReview } = useBrandWork(brand.id);
  const { byId: team } = useTeam();
  const [view, setView] = useState<View>('all');
  const [mine, setMine] = useState(false);
  const [limit, setLimit] = useState(4);

  const runs = useMemo(() => {
    const byId = new Map<string, Run>();
    for (const g of generations) {
      const p = meta(g);
      if (typeof p.run_id !== 'string') continue;
      if (mine && g.user_id !== user?.id) continue;
      const run = byId.get(p.run_id) ?? { id: p.run_id, jobId: String(p.job), userId: g.user_id, createdAt: g.created_at, total: Number(p.shot_total) || 0, items: [] };
      run.items.push(g);
      if (g.created_at < run.createdAt) run.createdAt = g.created_at;
      byId.set(p.run_id, run);
    }
    const list = [...byId.values()];
    for (const r of list) r.items.sort((a, b) => Number(meta(a).shot_index) - Number(meta(b).shot_index) || a.created_at.localeCompare(b.created_at));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [generations, mine, user?.id]);

  const counts = useMemo(() => {
    const c: Record<View, number> = { all: 0, review: 0, approved: 0, changes: 0 };
    for (const r of runs) for (const g of r.items) for (const v of VIEWS) if (v.id !== 'all' && inView(v.id, g, reviews.get(g.id))) c[v.id]++;
    return c;
  }, [runs, reviews]);

  const filtered = useMemo(
    () => runs.map((r) => ({ ...r, items: r.items.filter((g) => inView(view, g, reviews.get(g.id))) })).filter((r) => r.items.length > 0 || view === 'all'),
    [runs, view, reviews],
  );
  const shown = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  // Smooth progress for your own jobs; teammates' show the saved progress.
  const activeIds = useMemo(() => shown.flatMap((r) => r.items.filter(isActive).map((g) => g.id)), [shown]);
  const progress = useMultipleGenerationProgress(activeIds);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => setView(v.id)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] transition-colors',
            view === v.id ? 'bg-foreground font-semibold text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          {v.label}
          {v.id !== 'all' && counts[v.id] > 0 && <span className="font-mono text-[10.5px] opacity-80">{counts[v.id]}</span>}
        </button>
      ))}
      <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground">
        <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[hsl(var(--primary))]" />
        Only mine
      </label>
    </div>
  );

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (error) {
    return <p className="rounded-[16px] border border-border bg-card px-5 py-6 text-[13px] text-muted-foreground">Couldn't load the team's work. Refresh the page to try again.</p>;
  }
  if (generations.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border px-6 py-8 text-center">
        <p className="text-[14px] font-medium">Nothing made yet</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Pick a job above. Everything the team makes shows up here for review, and in each person's Library.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      {shown.length === 0 && (
        <p className="rounded-[16px] border border-dashed border-border px-6 py-8 text-center text-[13px] text-muted-foreground">
          {view === 'review' ? 'All caught up: nothing is waiting for review.' : view === 'approved' ? 'Nothing approved yet.' : view === 'changes' ? 'No change requests.' : 'Nothing here yet.'}
        </p>
      )}
      {shown.map((run) => (
        <RunCard
          key={run.id}
          brand={brand}
          run={run}
          author={run.userId === user?.id ? 'You' : memberName(team.get(run.userId ?? ''))}
          reviews={reviews}
          reviewerName={(id) => (id === user?.id ? 'you' : memberName(team.get(id ?? '')))}
          onReview={setReview}
          progress={progress}
          showWaiting={view === 'all'}
        />
      ))}
      {filtered.length > limit && (
        <Button variant="outline" size="sm" className="self-center rounded-[9px]" onClick={() => setLimit((n) => n + 4)}>
          Show older work
        </Button>
      )}
    </div>
  );
}

type OnReview = (v: { generationId: string; status: ReviewStatus | null; note?: string }) => Promise<void>;

function RunCard({ brand, run, author, reviews, reviewerName, onReview, progress, showWaiting }: {
  brand: BrandKit;
  run: Run;
  author: string;
  reviews: Map<string, BrandReview>;
  reviewerName: (id: string | null) => string;
  onReview: OnReview;
  progress: Map<string, number>;
  showWaiting: boolean;
}) {
  const job = brand.jobs.find((j) => j.id === run.jobId);
  const shots = run.items.filter((g) => !meta(g).upscaled_from);
  const waiting = showWaiting ? Math.max(0, run.total - shots.length) : 0;
  const done = run.items.filter(ready).length;

  return (
    <section className="rounded-[16px] border border-border bg-card p-4">
      <header className="mb-3 flex items-center gap-3">
        {job && <JobCover job={job} className="h-9 w-9 shrink-0 rounded-[10px]" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold">{job?.name ?? 'Job'}</h3>
          <p className="text-[12px] text-muted-foreground">
            {author} · {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })} · {done} of {run.items.length + waiting} ready
            {waiting > 0 && ` · ${waiting} more after the first finishes`}
          </p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {run.items.map((g) => (
          <ResultTile
            key={g.id}
            generation={g}
            job={job}
            progress={progress.get(g.id) ?? g.progress}
            print={job?.category === 'print' || job?.category === 'packaging'}
            review={reviews.get(g.id)}
            reviewerName={reviewerName}
            onReview={onReview}
          />
        ))}
        {Array.from({ length: waiting }, (_, i) => (
          <div key={`wait-${i}`} className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border text-[11.5px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Starts when the first is done
          </div>
        ))}
      </div>
    </section>
  );
}

/** Natural size of an image, once loaded. */
function useImageSize(url: string | null | undefined) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return size;
}

function ResultTile({ generation: g, job, progress, print, review, reviewerName, onReview }: {
  generation: DbGeneration;
  job?: BrandJob;
  progress: number;
  print: boolean;
  review?: BrandReview;
  reviewerName: (id: string | null) => string;
  onReview: OnReview;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upscaling, setUpscaling] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const social = job?.category === 'social' || job?.category === 'video';
  const p = meta(g);
  const isReady = ready(g);
  const isImage = g.type === 'image';
  const size = useImageSize(print && isReady && isImage ? g.output_url : null);
  const fit = size ? printFit(size.w, size.h) : null;
  const upscaled = !!p.upscaled_from;

  const tweak = () => {
    reuseGeneration(g);
    navigate('/create');
  };

  const upscale = async () => {
    if (!user?.id || !g.output_url) return;
    setUpscaling(true);
    try {
      await upscaleForPrint({
        userId: user.id,
        sourceId: g.id,
        outputUrl: g.output_url,
        factor: '2',
        title: g.title ?? 'Image',
        params: g.model_params,
        // Folders are personal; a teammate's upscale goes unfiled in their own library.
        folderId: g.user_id === user.id ? g.folder_id ?? null : null,
      });
      toast.success('Upscaling for print', { description: 'The 2× version appears next to this one in a minute or two.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not upscale');
    } finally {
      setUpscaling(false);
    }
  };

  const decide = async (status: ReviewStatus | null, text?: string) => {
    try {
      await onReview({ generationId: g.id, status, note: text });
      setNoteOpen(false);
      setNote('');
      if (status === 'approved') toast.success('Approved', { duration: 1500 });
      if (status === 'changes') toast('Sent back for changes', { duration: 1500 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the review');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <GenerationTile
          generation={g}
          progress={progress}
          hoverCaption={false}
          onSelect={() => navigate(`/generation/${g.id}`)}
          rounded="rounded-[12px]"
          className={cn(isImage ? 'aspect-[4/5]' : 'aspect-[9/16] max-h-[340px]', review?.status === 'approved' && 'ring-2 ring-success ring-offset-2 ring-offset-card')}
        />
        {review && (
          <span
            className={cn(
              'pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
              review.status === 'approved' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground',
            )}
          >
            {review.status === 'approved' ? <Check className="h-3 w-3" /> : <MessageSquareWarning className="h-3 w-3" />}
            {review.status === 'approved' ? 'Approved' : 'Changes'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium" title={String(p.shot_label ?? '')}>{String(p.shot_label ?? g.title ?? '')}</span>
        {isReady && (
          <>
            <IconAction label="Download" onClick={() => downloadGeneration(g)}><Download className="h-3.5 w-3.5" /></IconAction>
            {social && <IconAction label="Write caption" onClick={() => setCaptionOpen(true)}><NotebookPen className="h-3.5 w-3.5" /></IconAction>}
            {!upscaled && <IconAction label="Tweak in Create" onClick={tweak}><SlidersHorizontal className="h-3.5 w-3.5" /></IconAction>}
            {print && isImage && !upscaled && (
              <IconAction label="Upscale 2× for print" onClick={upscale} disabled={upscaling}>
                {upscaling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </IconAction>
            )}
          </>
        )}
      </div>
      {isReady && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => decide(review?.status === 'approved' ? null : 'approved')}
            aria-pressed={review?.status === 'approved'}
            className={cn(
              'inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-[8px] text-[11.5px] font-medium transition-colors',
              review?.status === 'approved' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            <Check className="h-3 w-3" /> {review?.status === 'approved' ? 'Approved' : 'Approve'}
          </button>
          <Popover open={noteOpen} onOpenChange={(o) => { setNoteOpen(o); if (o) setNote(review?.status === 'changes' ? review.note ?? '' : ''); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-pressed={review?.status === 'changes'}
                className={cn(
                  'inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-[8px] text-[11.5px] font-medium transition-colors',
                  review?.status === 'changes' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquareWarning className="h-3 w-3" /> Changes
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] rounded-[12px] p-3">
              <p className="text-[12.5px] font-medium">What should change?</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Logo too small, use the 15% off code, warmer light…"
                rows={3}
                className="mt-2 rounded-[10px] text-[13px]"
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-1.5">
                {review?.status === 'changes' && (
                  <Button size="sm" variant="ghost" className="h-8 rounded-[8px]" onClick={() => decide(null)}>Clear</Button>
                )}
                <Button size="sm" className="h-8 rounded-[8px]" onClick={() => decide('changes', note)}>Send back</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      {review?.status === 'changes' && review.note && (
        <p className="rounded-[8px] bg-warning/10 px-2 py-1.5 text-[11.5px] leading-snug">
          <span className="font-medium capitalize">{reviewerName(review.reviewer_id)}:</span> {review.note}
        </p>
      )}
      {review?.status === 'approved' && (
        <p className="text-[11px] text-muted-foreground">Approved by {reviewerName(review.reviewer_id)}</p>
      )}
      {fit && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {size!.w}×{size!.h}px · {fit.sharp ? `sharp to ${fit.sharp}` : fit.ok ? `posters to ${fit.ok} seen from afar` : 'upscale before printing'}
        </p>
      )}
      {g.status === 'error' && g.error_message && <p className="line-clamp-2 text-[11px] text-destructive">{g.error_message}</p>}
      {social && <CaptionDialog generation={g} job={job} open={captionOpen} onOpenChange={setCaptionOpen} />}
    </div>
  );
}

function IconAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-[12px]">{label}</TooltipContent>
    </Tooltip>
  );
}
