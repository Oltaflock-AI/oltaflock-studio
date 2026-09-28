import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, Volume2 } from 'lucide-react';
import type { Backend, ModelSpec } from '@catalog/types.ts';
import type { ReactNode } from 'react';
import { MODE_LABELS } from '@catalog/types.ts';
import { getSpec, specsForMode } from '@catalog/index.ts';
import { BACKEND_LABELS } from '@catalog/types.ts';
import { usePreferencesStore } from '@/store/preferencesStore';
import { specCredits } from '@catalog/pricing.ts';
import { useGenerationStore } from '@/store/generationStore';
import { toStudioMode } from '@/types/generation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { formatCredits } from '@/config/pricing';
import { cn } from '@/lib/utils';
import { SEGMENT_TRACK, segmentItem } from '@/components/layout/studioSurface';

type Filter = 'all' | 'featured' | 'audio' | 'budget';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'featured', label: 'Top picks' },
  { id: 'audio', label: 'Native audio' },
  { id: 'budget', label: 'Budget' },
];

function startingCredits(spec: ModelSpec) {
  return specCredits(spec, {});
}

function ModelRow({ spec, active, onSelect, showMode }: { spec: ModelSpec; active: boolean; onSelect: () => void; showMode?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full text-left flex gap-3 p-3 rounded-xl border transition-smooth',
        active ? 'border-primary bg-accent/60' : 'border-border hover:border-foreground/20 hover:bg-secondary/50',
      )}
    >
      <ModelBadge modelId={spec.id} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold truncate">{spec.name}</span>
          {spec.isNew && <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-primary/15 text-primary">New</span>}
          {spec.audio && <Volume2 className="h-3.5 w-3.5 text-muted-foreground" aria-label="Native audio" />}
          <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground shrink-0">
            {spec.api === 'higgsfield' ? 'live price' : `${formatCredits(startingCredits(spec))} cr`}
          </span>
        </div>
        {showMode && <p className="text-[11.5px] font-medium text-accent-foreground">{MODE_LABELS[spec.mode]}</p>}
        <p className="text-[12.5px] leading-snug text-muted-foreground line-clamp-2">{spec.bestFor}</p>
        {spec.tags && spec.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {spec.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[10.5px] px-1.5 py-px rounded-md bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
      </div>
      {active && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
    </button>
  );
}

interface ModelCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specs: ModelSpec[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  title: ReactNode;
  backend: Backend;
  /** Label each row with its mode (for lists that span modes). */
  showMode?: boolean;
}

/** Searchable, filterable catalog of models, grouped by maker. */
export function ModelCatalogDialog({ open, onOpenChange, specs, selectedId, onSelect, title, backend, showMode }: ModelCatalogDialogProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cheapest = [...specs].map(startingCredits).sort((a, b) => a - b);
    const budgetCap = cheapest[Math.floor(cheapest.length / 3)] ?? Infinity;
    return specs.filter((s) => {
      if (filter === 'featured' && !s.featured) return false;
      if (filter === 'audio' && !s.audio) return false;
      if (filter === 'budget' && startingCredits(s) > budgetCap) return false;
      if (!q) return true;
      return [s.name, s.provider, s.bestFor, ...(s.tags ?? [])].join(' ').toLowerCase().includes(q);
    });
  }, [specs, query, filter]);
  const filters = backend === 'higgsfield' ? FILTERS.filter((f) => f.id !== 'budget') : FILTERS;

  const grouped = useMemo(() => {
    const map = new Map<string, ModelSpec[]>();
    for (const s of visible) map.set(s.provider, [...(map.get(s.provider) ?? []), s]);
    return [...map.entries()];
  }, [visible]);

  const choose = (id: string) => {
    onSelect(id);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border space-y-3">
          <div>
            <DialogTitle className="font-serif text-[26px] font-normal leading-tight">
              {title} <span className="text-muted-foreground">· {BACKEND_LABELS[backend]}</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {backend === 'higgsfield'
                ? 'Each model lists what it does best. Higgsfield prices are quoted live for your exact settings.'
                : 'Each model lists what it does best. Prices are for default settings.'}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, provider or use case…"
                className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-secondary/60 border border-border text-[14px] outline-none focus:border-primary/60 focus:ring-[3px] focus:ring-primary/15"
              />
            </div>
            <div className={cn(SEGMENT_TRACK, 'flex')}>
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn('h-8 px-3 rounded-[8px] text-[12.5px] whitespace-nowrap transition-smooth', segmentItem(filter === f.id))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[62vh] overflow-y-auto px-6 py-4 space-y-5">
          {grouped.length === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-10">No models match.</p>
          )}
          {grouped.map(([provider, list]) => (
            <section key={provider} className="space-y-2">
              <h3 className="text-[13px] font-semibold text-foreground">{provider}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {list.map((s) => (
                  <ModelRow key={s.id} spec={s} showMode={showMode} active={s.id === selectedId} onSelect={() => choose(s.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Model selector: a summary card that opens a searchable catalog for the current mode. */
export function ModelPicker() {
  const { mode, selectedModel, setSelectedModel, pendingRating } = useGenerationStore();
  const backend = usePreferencesStore((s) => s.studioBackend);
  const [open, setOpen] = useState(false);

  const studioMode = toStudioMode(mode);
  const specs = specsForMode(studioMode, backend);
  const selected = selectedModel ? getSpec(selectedModel) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pendingRating}
        aria-label="Choose model"
        className={cn(
          'w-full text-left rounded-[12px] border border-border bg-card px-3.5 py-3 transition-smooth dark:bg-transparent',
          'hover:border-foreground/25 disabled:opacity-50',
        )}
      >
        {selected ? (
          <div className="flex gap-3">
            <ModelBadge modelId={selected.id} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold truncate">{selected.name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{selected.provider}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              </div>
              <p className="text-[12.5px] leading-snug text-muted-foreground mt-1">
                <span className="text-foreground/80 font-medium">Best for: </span>
                {selected.bestFor}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Choose a model · {specs.length} available</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </button>

      <ModelCatalogDialog
        open={open}
        onOpenChange={setOpen}
        specs={specs}
        selectedId={selectedModel}
        onSelect={(id) => setSelectedModel(id as never)}
        title={`${MODE_LABELS[studioMode]} models`}
        backend={backend}
      />
    </>
  );
}
