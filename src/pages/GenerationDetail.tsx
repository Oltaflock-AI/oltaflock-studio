import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertCircle,
  Bookmark,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  ImageOff,
  Loader2,
  Maximize2,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { StarButton } from '@/components/library/StarButton';
import { SaveToLibraryDialog } from '@/components/library/SaveToLibraryDialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGeneration, useGenerationSiblings } from '@/hooks/useGeneration';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useRetryGeneration } from '@/hooks/useRetryGeneration';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, TYPE_LABELS, type GenerationType } from '@/types/generation';
import { formatCredits, formatUsd } from '@/config/pricing';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A short, human title derived from the prompt (first few words, capitalized). */
function titleFromPrompt(prompt: string): string {
  const words = prompt
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ')
    .replace(/[\s,.;:!?-]+$/, '');
  if (!words) return 'Untitled generation';
  const title = words.length > 60 ? `${words.slice(0, 57)}…` : words;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function hasReferenceImages(params: Record<string, unknown> | null): boolean {
  const urls = params?.image_urls;
  return Array.isArray(urls) && urls.length > 0;
}

function getGenerationType(gen: DbGeneration): GenerationType {
  const fromImage = hasReferenceImages(gen.model_params);
  if (gen.type === 'video') return fromImage ? 'image-to-video' : 'text-to-video';
  return fromImage ? 'image-to-image' : 'text-to-image';
}

/** Generations store the model's display name; resolve it back to a model id for the badge. */
function resolveModelId(gen: DbGeneration, genType: GenerationType): string {
  const config =
    ALL_MODELS.find((m) => m.displayName === gen.model && m.generationTypes.includes(genType)) ??
    ALL_MODELS.find((m) => m.displayName === gen.model);
  return config?.id ?? gen.model;
}

const PARAM_LABELS: Record<string, string> = {
  aspectRatio: 'Aspect ratio',
  aspect_ratio: 'Aspect ratio',
  duration: 'Duration',
  resolution: 'Resolution',
  quality: 'Quality',
  seed: 'Seed',
  variant: 'Variant',
  mode: 'Style mode',
  size: 'Size',
  image_size: 'Image size',
  outputFormat: 'Format',
  output_format: 'Format',
  sound: 'Sound',
  cameraFixed: 'Fixed camera',
  removeWatermark: 'Remove watermark',
  isEnhance: 'Enhance',
  guidance_scale: 'Guidance',
  num_inference_steps: 'Steps',
  negative_prompt: 'Negative prompt',
  characterIds: 'Character IDs',
  image_urls: 'Reference images',
};

const PARAM_ORDER = ['aspectRatio', 'aspect_ratio', 'size', 'duration', 'resolution', 'quality', 'variant', 'mode', 'seed'];

// Shown elsewhere on the page (cost section) rather than as a param row.
const HIDDEN_PARAMS = new Set(['cost_credits', 'cost_usd']);

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatParamValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((v) => typeof v === 'string' && !/^https?:\/\//.test(v)) && value.length <= 4) {
      return value.join(', ');
    }
    return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (key === 'duration' && /^\d+(\.\d+)?$/.test(String(value))) return `${value}s`;
  return String(value);
}

interface ParamRow {
  key: string;
  label: string;
  value: string;
}

function buildParamRows(params: Record<string, unknown> | null): ParamRow[] {
  if (!params) return [];
  const rows: ParamRow[] = [];
  for (const [key, raw] of Object.entries(params)) {
    if (HIDDEN_PARAMS.has(key)) continue;
    const value = formatParamValue(key, raw);
    if (value === null) continue;
    rows.push({ key, label: PARAM_LABELS[key] ?? humanizeKey(key), value });
  }
  const rank = (k: string) => {
    const i = PARAM_ORDER.indexOf(k);
    return i === -1 ? PARAM_ORDER.length : i;
  };
  return rows.sort((a, b) => rank(a.key) - rank(b.key));
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{children}</span>
  );
}

const mediaFrameClass =
  'relative w-full h-[min(72vh,760px)] min-h-[320px] rounded-[20px] overflow-hidden border border-border bg-muted/40 ' +
  'shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GenerationDetail() {
  const { id } = useParams<{ id: string }>();
  // Keyed so dialogs / local state reset when moving between variations.
  return (
    <AppShell>
      <GenerationDetailContent key={id} id={id} />
    </AppShell>
  );
}

function GenerationDetailContent({ id }: { id: string | undefined }) {
  const { data: generation, isLoading, error, refetch, isRefetching } = useGeneration(id);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <StateMessage
        icon={<AlertCircle className="h-7 w-7 text-destructive" />}
        title="Couldn't load this generation"
        description={error instanceof Error ? error.message : 'Something went wrong while loading.'}
      >
        <Button onClick={() => refetch()} disabled={isRefetching} className="rounded-[11px]">
          {isRefetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Try again
        </Button>
        <Button asChild variant="secondary" className="rounded-[11px]">
          <Link to="/library?tab=history">Back to history</Link>
        </Button>
      </StateMessage>
    );
  }

  if (!generation) {
    return (
      <StateMessage
        icon={<ImageOff className="h-7 w-7 text-muted-foreground" />}
        title="Generation not found"
        description="It may have been deleted, or it belongs to a different account."
      >
        <Button asChild className="rounded-[11px]">
          <Link to="/library?tab=history">Back to history</Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-[11px]">
          <Link to="/">Open Studio</Link>
        </Button>
      </StateMessage>
    );
  }

  return <GenerationDetailView generation={generation} />;
}

function GenerationDetailView({ generation }: { generation: DbGeneration }) {
  const navigate = useNavigate();
  const { deleteGeneration, updateGeneration } = useGenerations();
  const { retry, isRetrying, canRetry } = useRetryGeneration();
  const { findByGenerationId } = usePromptLibrary();
  const { data: siblings = [] } = useGenerationSiblings(generation);
  const setSelectedJobId = useGenerationStore((s) => s.setSelectedJobId);

  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);

  // useRetryGeneration acts on the store's selected generation, so select this
  // one while its detail page is open (Studio then also shows it on return).
  useEffect(() => {
    setSelectedJobId(generation.id);
  }, [generation.id, setSelectedJobId]);

  const genType = getGenerationType(generation);
  const modelId = resolveModelId(generation, genType);
  const libraryItem = findByGenerationId(generation.id);
  const title = libraryItem?.title?.trim() || titleFromPrompt(generation.user_prompt);
  const paramRows = useMemo(() => buildParamRows(generation.model_params), [generation.model_params]);
  const createdAt = new Date(generation.created_at);
  const costCredits = generation.model_params?.cost_credits;
  const costUsd = generation.model_params?.cost_usd;
  const hasOutput = generation.status === 'done' && !!generation.output_url;
  const isPending = generation.status === 'queued' || generation.status === 'running';

  const handleRegenerate = async () => {
    if (!canRetry) {
      toast.error('This generation is still loading — try again in a moment');
      return;
    }
    await retry();
    // retry() selects the newly created generation on success.
    const selected = useGenerationStore.getState().selectedJobId;
    if (selected && selected !== generation.id) navigate('/');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteGeneration(generation.id);
      if (useGenerationStore.getState().selectedJobId === generation.id) setSelectedJobId(null);
      toast.success('Generation deleted');
      setDeleteOpen(false);
      navigate('/library?tab=history');
    } catch (e) {
      console.error('Failed to delete generation:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to delete generation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!generation.output_url) return;
    try {
      await navigator.clipboard.writeText(generation.output_url);
      toast.success('URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const handleRate = async (rating: number) => {
    if (ratingSaving) return;
    setRatingSaving(true);
    try {
      await updateGeneration({ id: generation.id, updates: { rating } });
      toast.success(`Rated ${rating} ${rating === 1 ? 'star' : 'stars'}`);
    } catch (e) {
      console.error('Failed to save rating:', e);
      toast.error('Failed to save rating');
    } finally {
      setRatingSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-8 md:py-7 flex flex-col gap-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-[13px] text-muted-foreground min-w-0">
          <li>
            <Link to="/library" className="hover:text-foreground transition-colors">
              Library
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </li>
          <li className="text-foreground truncate" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Media column */}
        <section aria-label="Output" className="w-full lg:flex-1 min-w-0 flex flex-col gap-3.5">
          {hasOutput ? (
            <div className={cn(mediaFrameClass, 'group')}>
              {generation.type === 'video' ? (
                <video
                  src={generation.output_url!}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  aria-label="View full size"
                  className="absolute inset-0 flex items-center justify-center cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <img src={generation.output_url!} alt={generation.user_prompt} className="h-full w-full object-contain" />
                </button>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                <OverlayButton label="Copy output URL" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                </OverlayButton>
                <OverlayButton
                  label="Open output in new tab"
                  onClick={() => window.open(generation.output_url!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />
                </OverlayButton>
                {generation.type !== 'video' && (
                  <OverlayButton label="View full size" onClick={() => setFullscreen(true)}>
                    <Maximize2 className="h-4 w-4" />
                  </OverlayButton>
                )}
              </div>
            </div>
          ) : isPending ? (
            <PendingFrame generation={generation} />
          ) : generation.status === 'error' ? (
            <div className={cn(mediaFrameClass, 'flex flex-col items-center justify-center p-8 text-center')}>
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="font-serif text-lg font-medium text-foreground mb-1.5">Generation failed</p>
              <p className="text-sm text-muted-foreground max-w-[420px] leading-relaxed mb-5 break-words">
                {generation.error_message || 'An unknown error occurred.'}
              </p>
              <Button onClick={handleRegenerate} disabled={isRetrying} className="rounded-[11px]">
                {isRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Try again
              </Button>
            </div>
          ) : (
            <div className={cn(mediaFrameClass, 'flex flex-col items-center justify-center p-8 text-center')}>
              <ImageOff className="h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm text-muted-foreground">No output was returned for this generation.</p>
            </div>
          )}

          {siblings.length > 0 && <VariationsStrip siblings={siblings} />}
        </section>

        {/* Detail panel */}
        <aside aria-label="Generation details" className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-[22px] leading-tight font-medium text-foreground break-words min-w-0">
              {title}
            </h1>
            {hasOutput && (
              <StarButton
                generation={generation}
                size="md"
                stopPropagation={false}
                className="-mt-1 -mr-1 rounded-[10px]"
              />
            )}
          </div>

          {generation.status !== 'done' && <StatusPill status={generation.status} />}

          <div className="flex flex-col gap-1.5">
            <Eyebrow>Prompt</Eyebrow>
            <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
              {generation.user_prompt}
            </p>
          </div>

          {generation.final_prompt && generation.final_prompt !== generation.user_prompt && (
            <details className="group rounded-[12px] bg-muted/50 px-3.5 py-2.5">
              <summary className="cursor-pointer list-none text-[12px] font-medium text-foreground flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Refined prompt
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                {generation.final_prompt}
              </p>
            </details>
          )}

          <div className="h-px bg-border" />

          <dl className="flex flex-col gap-[11px]">
            <ParamLine label="Model">
              <span className="flex items-center gap-2 min-w-0">
                <ModelBadge modelId={modelId} size="sm" />
                <span className="truncate">{generation.model}</span>
              </span>
            </ParamLine>
            <ParamLine label="Mode">{TYPE_LABELS[genType]}</ParamLine>
            {paramRows.map((row) => (
              <ParamLine key={row.key} label={row.label}>
                <span className="break-words">{row.value}</span>
              </ParamLine>
            ))}
            <ParamLine label="Created">
              <time dateTime={generation.created_at}>{format(createdAt, 'd MMM yyyy, h:mm a')}</time>
            </ParamLine>
            {typeof costCredits === 'number' && (
              <ParamLine label="Cost">
                <span className="tabular-nums">
                  {formatCredits(costCredits)} credits
                  {typeof costUsd === 'number' && (
                    <span className="text-muted-foreground"> · {formatUsd(costUsd)}</span>
                  )}
                </span>
              </ParamLine>
            )}
            <ParamLine label="Request ID">
              <code className="font-mono text-[11px] text-muted-foreground break-all">{generation.request_id}</code>
            </ParamLine>
          </dl>

          {generation.status === 'done' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Your rating</span>
              <div className="flex items-center gap-0.5" role="group" aria-label="Rate this generation">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (generation.rating ?? 0) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleRate(n)}
                      disabled={ratingSaving}
                      aria-label={`Rate ${n} ${n === 1 ? 'star' : 'stars'}`}
                      aria-pressed={generation.rating === n}
                      className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        className={cn(
                          'h-4 w-4 transition-colors',
                          active ? 'fill-warning text-warning' : 'text-muted-foreground/50'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-px bg-border" />

          <div className="flex flex-col gap-[9px]">
            <Button
              onClick={() => downloadGeneration(generation)}
              disabled={!hasOutput}
              className="h-11 rounded-[11px] font-semibold shadow-[0_8px_18px_hsl(var(--primary)/0.25)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={isRetrying || isPending}
              className="h-11 rounded-[11px] active:scale-[0.98] transition-all"
            >
              {isRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSaveOpen(true)}
              disabled={!hasOutput}
              className="h-11 rounded-[11px] active:scale-[0.98] transition-all"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {libraryItem ? 'Save again to library' : 'Save to library'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="h-10 rounded-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 text-[13px]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete generation
            </Button>
          </div>
        </aside>
      </div>

      <SaveToLibraryDialog generation={generation} open={saveOpen} onOpenChange={setSaveOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !isDeleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{title}” from your history. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasOutput && generation.type !== 'video' && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-sm">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <img
              src={generation.output_url!}
              alt={generation.user_prompt}
              className="w-full h-full max-h-[90vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ParamLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-[12.5px] text-foreground text-right min-w-0 flex justify-end">{children}</dd>
    </div>
  );
}

function OverlayButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-9 w-9 rounded-[10px] bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      {children}
    </button>
  );
}

const STATUS_STYLES: Record<DbGeneration['status'], string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-primary/10 text-primary',
  done: 'bg-success/10 text-success',
  error: 'bg-destructive/10 text-destructive',
};

const STATUS_LABELS: Record<DbGeneration['status'], string> = {
  queued: 'Queued',
  running: 'Generating',
  done: 'Done',
  error: 'Failed',
};

function StatusPill({ status }: { status: DbGeneration['status'] }) {
  return (
    <span
      className={cn(
        'self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        STATUS_STYLES[status]
      )}
    >
      {(status === 'queued' || status === 'running') && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'error' && <AlertCircle className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function PendingFrame({ generation }: { generation: DbGeneration }) {
  const progress = useGenerationProgress(generation.id);
  const label =
    progress < 15 ? 'Queuing…' : progress < 30 ? 'Starting…' : progress < 60 ? 'Generating…' : progress < 85 ? 'Processing…' : 'Finalizing…';

  return (
    <div
      className={cn(mediaFrameClass, 'flex flex-col items-center justify-center p-8 text-center')}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-7">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Sparkles className="h-9 w-9 text-primary animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 min-w-8 h-8 px-1 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-md">
          <span className="text-[10px] font-bold text-primary tabular-nums">{progress}%</span>
        </div>
      </div>
      <Progress value={progress} className="w-56 h-1.5 mb-4" aria-label="Generation progress" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{generation.model}</p>
      <p className="text-xs text-muted-foreground/70 mt-5 max-w-[260px]">
        This page updates automatically when the output is ready.
      </p>
    </div>
  );
}

function VariationsStrip({ siblings }: { siblings: DbGeneration[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>Variations</Eyebrow>
      <ul className="flex gap-2.5 overflow-x-auto pb-1">
        {siblings.map((s, i) => (
          <li key={s.id} className="shrink-0">
            <Link
              to={`/generation/${s.id}`}
              aria-label={`View variation ${i + 1}`}
              className="relative block w-[110px] h-[78px] rounded-[11px] overflow-hidden border border-border bg-muted transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.status === 'done' && s.output_url ? (
                s.type === 'video' ? (
                  <video src={s.output_url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img src={s.output_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                )
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  {s.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StateMessage({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-full flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-[20px] border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">{icon}</div>
        <h1 className="font-serif text-xl font-medium text-foreground mb-1.5">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 break-words">{description}</p>
        {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-8 md:py-7 flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading generation"
    >
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:flex-1 flex flex-col gap-3.5">
          <Skeleton className="w-full h-[min(72vh,760px)] min-h-[320px] rounded-[20px]" />
        </div>
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <div className="h-px bg-border" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <div className="h-px bg-border" />
          <Skeleton className="h-11 w-full rounded-[11px]" />
          <Skeleton className="h-11 w-full rounded-[11px]" />
          <Skeleton className="h-11 w-full rounded-[11px]" />
        </div>
      </div>
    </div>
  );
}
