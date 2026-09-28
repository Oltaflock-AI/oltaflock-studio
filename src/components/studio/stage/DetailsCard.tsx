import { useEffect, useState } from 'react';
import { ChevronDown, Copy, Download, RotateCcw, Trash2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import type { DbGeneration, GenerationStatus } from '@/hooks/useGenerations';
import { useGenerations } from '@/hooks/useGenerations';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { StarButton } from '@/components/library/StarButton';
import { cn } from '@/lib/utils';
import { reuseGeneration, referenceGeneration } from './generationActions';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { GenerationTitle } from './GenerationTitle';
import { useFolders } from '@/hooks/useFolders';
import { FolderDot, MoveToFolderMenu } from '@/components/library/folders';
import { aspectOf, costLabel, modeLabel, settingChips, specFor, timeLabel } from './generationMeta';

const STATUS: Record<GenerationStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground' },
  running: { label: 'Generating', className: 'bg-primary/10 text-primary' },
  done: { label: 'Done', className: 'bg-success/10 text-success' },
  error: { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
};

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error(`Could not copy ${what.toLowerCase()}`));
}

/** Sent / Your prompt toggle, clamped with Show full. */
function PromptBlock({ g, lines = 4 }: { g: DbGeneration; lines?: 2 | 3 | 4 }) {
  const refined = !!g.final_prompt && g.final_prompt !== g.user_prompt;
  const [which, setWhich] = useState<'sent' | 'mine'>('sent');
  const [open, setOpen] = useState(false);
  useEffect(() => { setWhich('sent'); setOpen(false); }, [g.id]);
  const text = which === 'sent' && g.final_prompt ? g.final_prompt : g.user_prompt;
  const clamp = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }[lines];

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center gap-2">
        {refined ? (
          <div className="inline-flex rounded-[8px] bg-secondary p-0.5 text-[11.5px]">
            {(['sent', 'mine'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setWhich(k)}
                className={cn(
                  'whitespace-nowrap rounded-[6px] px-2 py-0.5 transition-smooth',
                  which === k ? 'bg-card font-medium text-foreground shadow-sm dark:bg-muted' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {k === 'sent' ? 'Sent to model' : 'Your prompt'}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11.5px] font-medium text-muted-foreground">Prompt</span>
        )}
        <button type="button" onClick={() => copy(text, 'Prompt')} className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <p className={cn('text-[13px] leading-relaxed text-foreground/90', !open && clamp)}>{text}</p>
      {text.length > 140 && (
        <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-medium text-primary hover:underline">
          {open ? 'Show less' : 'Show full prompt'}
        </button>
      )}
    </div>
  );
}

function Chips({ g, max = 4 }: { g: DbGeneration; max?: number }) {
  const [all, setAll] = useState(false);
  const chips = settingChips(g).filter((c) => c.key !== 'aspect_ratio');
  if (chips.length === 0) return null;
  const shown = all ? chips : chips.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <span key={c.key} className="rounded-[7px] bg-secondary px-2 py-0.5 text-[11.5px] text-foreground/90">
          <span className="text-muted-foreground">{c.label}</span> {c.value}
        </span>
      ))}
      {chips.length > max && (
        <button type="button" onClick={() => setAll(!all)} className="rounded-[7px] px-1.5 py-0.5 text-[11.5px] font-medium text-primary hover:bg-accent">
          {all ? 'Less' : `+${chips.length - max}`}
        </button>
      )}
    </div>
  );
}

function FolderRow({ g }: { g: DbGeneration }) {
  const { folders } = useFolders();
  const folder = folders.find((f) => f.id === g.folder_id);
  return (
    <div className="flex items-center justify-between gap-2 rounded-[12px] bg-secondary/60 px-3 py-2">
      <span className="text-[12px] text-muted-foreground">Folder</span>
      <MoveToFolderMenu ids={[g.id]} currentFolderId={g.folder_id ?? null} align="end">
        <button type="button" className="inline-flex min-w-0 items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12.5px] font-medium hover:bg-card">
          {folder ? <FolderDot color={folder.color} className="h-3.5 w-3.5" /> : null}
          <span className="truncate">{folder?.name ?? 'Unfiled'}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </MoveToFolderMenu>
    </div>
  );
}

function DeleteButton({ g }: { g: DbGeneration }) {
  const { deleteGeneration } = useGenerations();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [g.id]);
  const busy = g.status === 'queued' || g.status === 'running';
  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-foreground">Delete for good?</span>
        <button
          type="button"
          className="font-medium text-destructive hover:underline"
          onClick={() => deleteGeneration(g.id).then(() => toast.success('Deleted'), () => toast.error('Could not delete'))}
        >
          Delete
        </button>
        <button type="button" className="hover:text-foreground" onClick={() => setConfirm(false)}>Cancel</button>
      </span>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 hover:text-destructive disabled:opacity-40" aria-label="Delete generation">
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </button>
  );
}

/** Full-height details for a side panel or drawer: fits without scrolling at laptop heights. */
export function DetailsPanel({ g }: { g: DbGeneration }) {
  const status = STATUS[g.status];
  const reuse = () => reuseGeneration(g);
  const created = new Date(g.created_at);
  const facts = [
    { k: 'Created', v: timeLabel(created) },
    { k: 'Cost', v: costLabel(g) ?? '—' },
    { k: g.type === 'video' ? 'Type' : 'Aspect', v: g.type === 'video' ? 'Video' : aspectOf(g) ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <GenerationTitle g={g} wrap className="min-w-0 flex-1 text-[16px] font-semibold leading-snug" inputClassName="h-8 text-[15px] font-semibold" />
          <span className={cn('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', status.className)}>{status.label}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <ModelBadge modelId={g.model} size="sm" />
          <span className="truncate"><span className="font-medium text-foreground/85">{g.model}</span> · {modeLabel(g)}</span>
        </div>
      </div>

      <FolderRow g={g} />

      <dl className="grid grid-cols-3 overflow-hidden rounded-[12px] border border-border/70">
        {facts.map((f, i) => (
          <div key={f.k} className={cn('min-w-0 px-2.5 py-2', i > 0 && 'border-l border-border/70')}>
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{f.k}</dt>
            <dd className="truncate text-[13px] font-medium tabular-nums">{f.v}</dd>
          </div>
        ))}
      </dl>

      <PromptBlock g={g} lines={4} />
      <Chips g={g} />

      {g.error_message && (
        <p className="rounded-[10px] bg-destructive/10 px-3 py-2 text-[12.5px] leading-relaxed text-destructive">{g.error_message}</p>
      )}

      <div className="flex gap-1.5">
        <button type="button" onClick={reuse} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-foreground text-[13px] font-medium text-background hover:bg-foreground/90">
          <RotateCcw className="h-3.5 w-3.5" /> Reuse settings
        </button>
        {g.output_url && (
          <button type="button" onClick={() => downloadGeneration(g)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border text-[13px] font-medium hover:bg-secondary">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        )}
        <StarButton generation={g} size="md" className="h-9 w-9 rounded-[10px] border border-border" />
      </div>
      {g.status === 'done' && g.output_url && (
        <button type="button" onClick={() => referenceGeneration(g)} className="-mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border text-[13px] font-medium hover:bg-secondary">
          <ImagePlus className="h-3.5 w-3.5" /> Use as reference
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground">
        <button type="button" onClick={() => copy(g.request_id, 'Request ID')} className="truncate font-mono hover:text-foreground" title="Copy request ID">
          {g.request_id}
        </button>
<DeleteButton g={g} />
      </div>
    </div>
  );
}

/** One-row details under the canvas: prompt on the left, model, facts and actions on the right. */
export function DetailsStrip({ g }: { g: DbGeneration }) {
  const reuse = () => reuseGeneration(g);
  const meta = [timeLabel(new Date(g.created_at)), costLabel(g), aspectOf(g)].filter(Boolean);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 rounded-[16px] border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_hsl(240_10%_10%/0.04)] dark:shadow-none">
      <PromptBlock g={g} lines={2} />
      <div className="flex w-[300px] flex-col gap-2.5 border-l border-border/70 pl-5">
        <div className="flex items-center gap-2.5">
          <ModelBadge modelId={g.model} className="h-7 w-7 rounded-[8px] text-[10px]" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{g.model}</p>
            <p className="truncate font-mono text-[11.5px] tabular-nums text-muted-foreground">{meta.join(' · ')}</p>
          </div>
        </div>
        <Chips g={g} max={3} />
        <div className="flex gap-1.5">
          <button type="button" onClick={reuse} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-foreground text-[12.5px] font-medium text-background hover:bg-foreground/90">
            <RotateCcw className="h-3.5 w-3.5" /> Reuse
          </button>
          {g.output_url && (
            <button type="button" onClick={() => downloadGeneration(g)} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-border text-[12.5px] font-medium hover:bg-secondary">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          )}
          <StarButton generation={g} size="sm" className="h-8 w-8 rounded-[9px] border border-border" />
        </div>
      </div>
    </div>
  );
}
