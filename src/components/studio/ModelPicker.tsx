import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, Volume2 } from 'lucide-react';
import type { ModelSpec } from '@catalog/types.ts';
import { MODE_LABELS } from '@catalog/types.ts';
import { getSpec, specsForMode } from '@catalog/index.ts';
import { specCredits } from '@catalog/pricing.ts';
import { useGenerationStore } from '@/store/generationStore';
import { findModelConfig, toStudioMode } from '@/types/generation';
import { useGenerations } from '@/hooks/useGenerations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { formatCredits } from '@/config/pricing';
import { cn } from '@/lib/utils';

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

function ModelRow({ spec, active, onSelect }: { spec: ModelSpec; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full text-left flex gap-3 p-3 rounded-xl border transition-smooth',
        active ? 'border-primary/60 bg-primary/[0.06]' : 'border-border/60 hover:border-border hover:bg-muted/40',
      )}
    >
      <ModelBadge modelId={spec.id} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold truncate">{spec.name}</span>
          {spec.isNew && <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-primary/15 text-primary">New</span>}
          {spec.audio && <Volume2 className="h-3.5 w-3.5 text-muted-foreground" aria-label="Native audio" />}
          <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground shrink-0">
            {formatCredits(startingCredits(spec))} cr
          </span>
        </div>
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

/** Model selector: a summary card that opens a searchable catalog for the current mode. */
export function ModelPicker() {
  const { mode, selectedModel, setSelectedModel } = useGenerationStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { generations } = useGenerations();
  const studioMode = toStudioMode(mode);
  const specs = specsForMode(studioMode);
  const selected = selectedModel ? getSpec(selectedModel) : undefined;

  // Up to 4 distinct models this user generated with in the current mode, newest first.
  const recent = useMemo(() => {
    const ids: string[] = [];
    for (const g of generations) {
      const id = findModelConfig(g.model, g.model_params)?.id;
      const spec = id ? getSpec(id) : undefined;
      if (spec?.mode === studioMode && !ids.includes(spec.id)) ids.push(spec.id);
      if (ids.length === 4) break;
    }
    return ids.map((id) => getSpec(id)!);
  }, [generations, studioMode]);

  // ⌘K / Ctrl+K opens the picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const grouped = useMemo(() => {
    const map = new Map<string, ModelSpec[]>();
    for (const s of visible) map.set(s.provider, [...(map.get(s.provider) ?? []), s]);
    return [...map.entries()];
  }, [visible]);

  const choose = (id: string) => {
    setSelectedModel(id as never);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Choose model"
        className={cn(
          'w-full text-left rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3 transition-smooth',
          'hover:border-primary/40 hover:bg-muted/70 disabled:opacity-50',
        )}
      >
        {selected ? (
          <div className="flex gap-3">
            <ModelBadge modelId={selected.id} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold truncate">{selected.name}</span>
                <span className="text-[11.5px] text-muted-foreground truncate">{selected.provider}</span>
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
            <span className="text-[13.5px] text-muted-foreground">Choose a model · {specs.length} available · ⌘K</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 space-y-3">
            <div>
              <DialogTitle className="font-serif text-[22px] font-medium">{MODE_LABELS[studioMode]} models</DialogTitle>
              <DialogDescription className="text-[13px]">
                {specs.length} models · each lists what it does best · prices are for default settings
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
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/60 border border-border/60 text-[13.5px] outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex p-0.5 rounded-lg bg-muted/70 border border-border/50">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'h-9 px-3 rounded-md text-[12px] whitespace-nowrap transition-smooth',
                      filter === f.id ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto px-6 py-4 space-y-5">
            {recent.length > 0 && !query && filter === 'all' && (
              <section className="space-y-2">
                <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Recently used</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recent.map((s) => (
                    <ModelRow key={s.id} spec={s} active={s.id === selectedModel} onSelect={() => choose(s.id)} />
                  ))}
                </div>
              </section>
            )}
            {grouped.length === 0 && (
              <p className="text-center text-[13px] text-muted-foreground py-10">No models match.</p>
            )}
            {grouped.map(([provider, list]) => (
              <section key={provider} className="space-y-2">
                <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{provider}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {list.map((s) => (
                    <ModelRow key={s.id} spec={s} active={s.id === selectedModel} onSelect={() => choose(s.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
