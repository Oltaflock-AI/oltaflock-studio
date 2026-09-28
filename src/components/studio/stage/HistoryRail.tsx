import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { useGenerations } from '@/hooks/useGenerations';
import { useMultipleGenerationProgress } from '@/hooks/useGenerationProgress';
import { useGenerationStore } from '@/store/generationStore';
import { STUDIO_PANEL } from '@/components/layout/studioSurface';
import { cn } from '@/lib/utils';
import { GenerationTile } from './GenerationTile';
import { isActive } from './generationMeta';

/** Slim column of recent outputs; the selected one is kept in view. */
export function HistoryRail({ className }: { className?: string }) {
  const { generations, isLoading } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();
  const activeIds = useMemo(() => generations.filter(isActive).map((g) => g.id), [generations]);
  const progress = useMultipleGenerationProgress(activeIds);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedJobId]);

  return (
    <aside aria-label="History" className={cn(STUDIO_PANEL, 'flex w-[92px] shrink-0 flex-col overflow-hidden', className)}>
      <p className="px-2 pb-2 pt-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">History</p>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3 [scrollbar-width:none]">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-[10px] bg-muted" />)}
        {!isLoading && generations.length === 0 && (
          <p className="px-1 pt-2 text-center text-[11.5px] leading-snug text-muted-foreground">Your outputs will show up here</p>
        )}
        {generations.map((g) => (
          <GenerationTile
            key={g.id}
            generation={g}
            progress={progress.get(g.id) ?? 0}
            selected={g.id === selectedJobId}
            onSelect={() => setSelectedJobId(g.id)}
            hoverCaption={false}
            className="aspect-square"
          />
        ))}
      </div>
      <Link
        to="/library"
        className="flex shrink-0 flex-col items-center gap-1 border-t border-border/70 py-2.5 text-[11px] text-muted-foreground transition-smooth hover:bg-secondary/60 hover:text-foreground"
      >
        <LayoutGrid className="h-4 w-4" />
        Library
      </Link>
    </aside>
  );
}
