import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check, Images, Play, Search } from 'lucide-react';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { displayTitle } from '@/components/studio/stage/generationMeta';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const RECENT_COUNT = 6;

interface ReferencePickerProps {
  kind: 'image' | 'video' | 'audio';
  value: string[];
  max: number;
  onChange: (urls: string[]) => void;
}

function Thumb({ g, className }: { g: DbGeneration; className?: string }) {
  return g.type === 'video' ? (
    <video src={`${g.output_url}#t=1`} muted playsInline preload="metadata" className={cn('h-full w-full object-cover', className)} />
  ) : (
    <img src={g.output_url!} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />
  );
}

/**
 * Pick earlier generations as reference media: the latest few inline for one
 * click, and a searchable browser for anything older.
 */
export function ReferencePicker({ kind, value, max, onChange }: ReferencePickerProps) {
  const { generations } = useGenerations();
  const [browsing, setBrowsing] = useState(false);
  const pool = useMemo(
    () => generations.filter((g) => g.status === 'done' && g.output_url && !g.is_nsfw && g.type === kind),
    [generations, kind],
  );
  if (kind === 'audio' || pool.length === 0) return null;

  const full = value.length >= max;
  const toggle = (url: string) => {
    if (value.includes(url)) onChange(value.filter((u) => u !== url));
    else if (!full) onChange([...value, url]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-muted-foreground">From your generations</span>
        <button type="button" onClick={() => setBrowsing(true)} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline">
          <Images className="h-3 w-3" /> Browse all
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {pool.slice(0, RECENT_COUNT).map((g) => {
          const on = value.includes(g.output_url!);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.output_url!)}
              disabled={!on && full}
              title={on ? `Remove ${displayTitle(g)}` : `Add ${displayTitle(g)}`}
              className={cn(
                'relative aspect-square overflow-hidden rounded-[6px] bg-muted transition-shadow disabled:cursor-not-allowed disabled:opacity-40',
                on ? 'ring-2 ring-primary ring-offset-1 ring-offset-popover' : 'hover:ring-2 hover:ring-foreground/25',
              )}
            >
              <Thumb g={g} />
              {on && (
                <span className="absolute inset-0 grid place-items-center bg-primary/35">
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {browsing && <BrowseDialog
        open
        onOpenChange={setBrowsing}
        pool={pool}
        kind={kind}
        value={value}
        max={max}
        onDone={(urls) => { onChange(urls); setBrowsing(false); }}
      />}
    </div>
  );
}

function BrowseDialog({
  open, onOpenChange, pool, kind, value, max, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pool: DbGeneration[];
  kind: 'image' | 'video';
  value: string[];
  max: number;
  onDone: (urls: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(value);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? pool.filter((g) => `${g.title ?? ''} ${g.user_prompt} ${g.model}`.toLowerCase().includes(q))
    : pool;

  const toggle = (url: string) =>
    setPicked((p) => (p.includes(url) ? p.filter((u) => u !== url) : p.length < max ? [...p, url] : p));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] w-[min(980px,94vw)] max-w-none flex-col gap-0 overflow-hidden rounded-[18px] p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 pr-12">
          <div className="min-w-0">
            <DialogTitle className="text-[16px] font-semibold">Add a reference {kind}</DialogTitle>
            <DialogDescription className="text-[12.5px]">Pick up to {max} from anything you've generated.</DialogDescription>
          </div>
          <label className="ml-auto flex h-9 w-[260px] items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-muted-foreground focus-within:border-primary/50">
            <Search className="h-4 w-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names, prompts, models"
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/80"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {shown.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-muted-foreground">Nothing matches “{query}”.</p>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {shown.map((g) => {
                const order = picked.indexOf(g.output_url!);
                const on = order >= 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle(g.output_url!)}
                    disabled={!on && picked.length >= max}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-[8px] bg-muted text-left disabled:cursor-not-allowed disabled:opacity-40',
                      on ? 'ring-[3px] ring-primary ring-offset-1 ring-offset-background' : 'hover:ring-2 hover:ring-foreground/20',
                    )}
                  >
                    <Thumb g={g} />
                    {g.type === 'video' && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/55 p-1"><Play className="h-2.5 w-2.5 fill-white text-white" /></span>
                    )}
                    <span className={cn(
                      'absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 text-[10.5px] font-bold',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-white/90 bg-black/25 opacity-0 group-hover:opacity-100 touch:opacity-100',
                    )}>
                      {on ? order + 1 : ''}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
                      <span className="truncate text-[11.5px] font-medium text-white">{displayTitle(g)}</span>
                      <span className="flex items-center gap-1 text-[10.5px] text-white/70">
                        <ModelBadge modelId={g.model} size="sm" />
                        <span className="truncate">{formatDistanceToNowStrict(new Date(g.created_at), { addSuffix: true })}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-[12.5px] text-muted-foreground tabular-nums">{picked.length} of {max} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-[10px] px-4 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button
              type="button"
              onClick={() => onDone(picked)}
              className="h-9 rounded-[10px] bg-foreground px-4 text-[13px] font-semibold text-background hover:bg-foreground/90"
            >
              {picked.length === value.length && picked.every((u, i) => u === value[i]) ? 'Done' : `Use ${picked.length} ${kind}${picked.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
