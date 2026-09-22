import { Folder, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryCollection } from '@/types/library';

interface Props {
  collections: LibraryCollection[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** Collection chips with item counts. Clicking the active chip clears the filter. */
export function CollectionFilter({ collections, value, onChange }: Props) {
  if (collections.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by collection">
      {collections.map((c) => {
        const active = value === c.name;
        return (
          <button
            key={c.name}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : c.name)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border py-[6px] pl-3 pr-1.5 text-[11.5px] transition-smooth',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary/40 bg-primary/10 text-foreground font-medium'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Folder className={cn('h-3.5 w-3.5', active && 'text-primary')} aria-hidden="true" />
            <span className="max-w-[180px] truncate">{c.name}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-px text-[10.5px] tabular-nums',
                active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {c.count}
            </span>
            {active && <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
