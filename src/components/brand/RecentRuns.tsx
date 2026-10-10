import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Download, Loader2, Maximize2, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { GenerationTile } from '@/components/studio/stage/GenerationTile';
import { reuseGeneration } from '@/components/studio/stage/generationActions';
import { isActive } from '@/components/studio/stage/generationMeta';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BrandKit } from '@/brands';
import { printFit } from '@/brands/compose';
import { isBrandRun, upscaleForPrint } from '@/brands/runJob';
import { JobCover } from './JobCover';
import { cn } from '@/lib/utils';

interface Run {
  id: string;
  jobId: string;
  createdAt: string;
  total: number;
  items: DbGeneration[];
}

const meta = (g: DbGeneration) => (g.model_params ?? {}) as Record<string, unknown>;

/** The brand's recent jobs, newest first, each with its results as they come in. */
export function RecentRuns({ brand }: { brand: BrandKit }) {
  const { generations, isLoading } = useGenerations();
  const [limit, setLimit] = useState(4);

  const runs = useMemo(() => {
    const byId = new Map<string, Run>();
    for (const g of generations) {
      const p = meta(g);
      if (!isBrandRun(p, brand.id)) continue;
      const id = p.run_id as string;
      const run = byId.get(id) ?? { id, jobId: String(p.job), createdAt: g.created_at, total: Number(p.shot_total) || 0, items: [] };
      run.items.push(g);
      if (g.created_at < run.createdAt) run.createdAt = g.created_at;
      byId.set(id, run);
    }
    const list = [...byId.values()];
    for (const r of list) r.items.sort((a, b) => Number(meta(a).shot_index) - Number(meta(b).shot_index) || a.created_at.localeCompare(b.created_at));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [generations, brand.id]);

  const shown = useMemo(() => runs.slice(0, limit), [runs, limit]);
  const activeIds = useMemo(() => shown.flatMap((r) => r.items.filter(isActive).map((g) => g.id)), [shown]);
  const progress = useMultipleGenerationProgress(activeIds);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (runs.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border px-6 py-8 text-center">
        <p className="text-[14px] font-medium">Nothing made yet</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Pick a job below. Everything you make here shows up in this list and in your Library.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {shown.map((run) => <RunCard key={run.id} brand={brand} run={run} progress={progress} />)}
      {runs.length > limit && (
        <Button variant="outline" size="sm" className="self-center rounded-[9px]" onClick={() => setLimit((n) => n + 4)}>
          Show older work
        </Button>
      )}
    </div>
  );
}

function RunCard({ brand, run, progress }: { brand: BrandKit; run: Run; progress: Map<string, number> }) {
  const job = brand.jobs.find((j) => j.id === run.jobId);
  const shots = run.items.filter((g) => !meta(g).upscaled_from);
  const waiting = Math.max(0, run.total - shots.length);
  const done = run.items.filter((g) => g.status === 'done').length;

  return (
    <section className="rounded-[16px] border border-border bg-card p-4">
      <header className="mb-3 flex items-center gap-3">
        {job && <JobCover job={job} className="h-9 w-9 shrink-0 rounded-[10px]" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold">{job?.name ?? 'Job'}</h3>
          <p className="text-[12px] text-muted-foreground">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })} · {done} of {run.items.length + waiting} ready
            {waiting > 0 && ` · ${waiting} more after the first finishes`}
          </p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {run.items.map((g) => (
          <ResultTile key={g.id} generation={g} progress={progress.get(g.id) ?? g.progress} print={job?.category === 'print' || job?.category === 'packaging'} />
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

function ResultTile({ generation: g, progress, print }: { generation: DbGeneration; progress: number; print: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upscaling, setUpscaling] = useState(false);
  const p = meta(g);
  const ready = g.status === 'done' && !!g.output_url;
  const isImage = g.type === 'image';
  const size = useImageSize(print && ready && isImage ? g.output_url : null);
  const fit = size ? printFit(size.w, size.h) : null;
  const upscaled = !!p.upscaled_from;

  const tweak = () => {
    reuseGeneration(g);
    navigate('/');
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
        folderId: g.folder_id ?? null,
      });
      toast.success('Upscaling for print', { description: 'The 2× version appears next to this one in a minute or two.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not upscale');
    } finally {
      setUpscaling(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <GenerationTile
        generation={g}
        progress={progress}
        hoverCaption={false}
        onSelect={() => navigate(`/generation/${g.id}`)}
        rounded="rounded-[12px]"
        className={cn(isImage ? 'aspect-[4/5]' : 'aspect-[9/16] max-h-[340px]')}
      />
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium" title={String(p.shot_label ?? '')}>{String(p.shot_label ?? g.title ?? '')}</span>
        {ready && (
          <>
            <IconAction label="Download" onClick={() => downloadGeneration(g)}><Download className="h-3.5 w-3.5" /></IconAction>
            {!upscaled && <IconAction label="Tweak in the Studio" onClick={tweak}><SlidersHorizontal className="h-3.5 w-3.5" /></IconAction>}
            {print && isImage && !upscaled && (
              <IconAction label="Upscale 2× for print" onClick={upscale} disabled={upscaling}>
                {upscaling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </IconAction>
            )}
          </>
        )}
      </div>
      {fit && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {size!.w}×{size!.h}px · {fit.sharp ? `sharp to ${fit.sharp}` : fit.ok ? `posters to ${fit.ok} seen from afar` : 'upscale before printing'}
        </p>
      )}
      {g.status === 'error' && g.error_message && <p className="line-clamp-2 text-[11px] text-destructive">{g.error_message}</p>}
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
