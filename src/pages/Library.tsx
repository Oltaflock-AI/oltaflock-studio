import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, FolderTree, LayoutGrid, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGenerations } from '@/hooks/useGenerations';
import { useFolders } from '@/hooks/useFolders';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { GridView, type Density } from '@/components/library/GridView';
import { OrganizeView } from '@/components/library/OrganizeView';
import { LibraryViewer } from '@/components/library/LibraryViewer';
import { SelectionBar } from '@/components/library/SelectionBar';
import { FolderDot } from '@/components/library/folders';
import { TYPE_FILTERS, applyFilters, useSelection, type Scope, type SortKey, type TypeFilter } from '@/components/library/libraryState';
import { cn } from '@/lib/utils';

type View = 'grid' | 'organize';

function readDensity(): Density {
  try { const v = localStorage.getItem('library-density'); return v === 's' || v === 'l' ? v : 'm'; } catch { return 'm'; }
}

/** Your generations: browse them as a grid, or organise them into folders. */
export default function Library() {
  const { generations, isLoading, moveToFolder } = useGenerations();
  const { folders } = useFolders();
  const { findByGenerationId } = usePromptLibrary();
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'organize' ? 'organize' : 'grid';
  const setView = (v: View) => setParams((p) => { const n = new URLSearchParams(p); n.delete('tab'); if (v === 'grid') n.delete('view'); else n.set('view', v); return n; }, { replace: true });

  const [scope, setScopeState] = useState<Scope>({ kind: 'all' });
  const [type, setType] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [density, setDensityState] = useState<Density>(readDensity);
  const [openId, setOpenId] = useState<string | null>(null);
  const setDensity = (d: Density) => { setDensityState(d); try { localStorage.setItem('library-density', d); } catch { /* per-device nicety only */ } };

  const isStarred = useCallback((id: string) => !!findByGenerationId(id), [findByGenerationId]);
  const scopedFolder = scope.kind === 'folder' ? folders.find((f) => f.id === scope.id) : undefined;

  const items = useMemo(
    () => applyFilters(generations, { scope, type, query, sort, isStarred }),
    [generations, scope, type, query, sort, isStarred],
  );
  const ids = useMemo(() => items.map((g) => g.id), [items]);
  const selection = useSelection(ids);
  const selected = useMemo(() => items.filter((g) => selection.has(g.id)), [items, selection]);
  const setScope = (s: Scope) => { setScopeState(s); selection.clear(); };

  const counts = useMemo(() => ({
    all: generations.length,
    unfiled: generations.filter((g) => !g.folder_id).length,
    starred: generations.filter((g) => isStarred(g.id)).length,
  }), [generations, isStarred]);

  const move = async (moveIds: string[], folderId: string, name: string) => {
    try {
      await moveToFolder(moveIds, folderId);
      toast.success(`Moved ${moveIds.length === 1 ? '1 item' : `${moveIds.length} items`} to ${name}`);
    } catch {
      toast.error('Could not move. Try again.');
    }
  };

  return (
    <AppShell scrollableContent={false}>
      <AnimatedPage className="h-full">
        <div className="mx-auto flex h-full w-full max-w-[1720px] flex-col overflow-hidden px-8 pt-7">
          <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 pb-5">
            <div className="min-w-0">
              {view === 'grid' && scope.kind !== 'all' ? (
                <button type="button" onClick={() => setScope({ kind: 'all' })} className="mb-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" /> Library
                </button>
              ) : null}
              <h1 className="flex items-center gap-2.5 font-serif text-[34px] leading-none tracking-[-0.015em]">
                {view === 'grid' && scopedFolder && <FolderDot color={scopedFolder.color} className="h-7 w-7" />}
                {view === 'grid' ? (scopedFolder?.name ?? (scope.kind === 'starred' ? 'Starred' : scope.kind === 'unfiled' ? 'Unfiled' : 'Library')) : 'Library'}
              </h1>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                {isLoading ? 'Loading your generations…' : `${generations.length} generation${generations.length === 1 ? '' : 's'} · ${folders.length} folder${folders.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <div className="inline-flex rounded-[12px] border border-border/60 bg-secondary p-[3px]" role="tablist" aria-label="Library view">
              {([['grid', 'Grid', LayoutGrid], ['organize', 'Organize', FolderTree]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-[9px] px-4 text-[13.5px] transition-smooth',
                    view === id ? 'bg-card font-semibold text-foreground shadow-[0_1px_2px_hsl(240_10%_10%/0.08)] dark:bg-muted' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-4 w-4', view === id && 'text-primary')} /> {label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5 pb-5">
            <label className="flex h-9 w-[280px] items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-muted-foreground focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/10">
              <Search className="h-4 w-4 shrink-0" />
              <input id="library-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, prompts or models" className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/80" />
            </label>
            <div className="flex gap-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={type === f.id}
                  onClick={() => setType(f.id)}
                  className={cn('h-9 rounded-full px-3.5 text-[13px] transition-smooth', type === f.id ? 'bg-foreground font-medium text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {view === 'grid' && scope.kind === 'all' && counts.starred > 0 && (
              <button type="button" onClick={() => setScope({ kind: 'starred' })} className="h-9 rounded-full px-3.5 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground">★ Starred</button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[150px] rounded-[10px] bg-card text-[13px]" aria-label="Sort"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="model">By model</SelectItem>
                </SelectContent>
              </Select>
              {view === 'grid' && (
                <div className="inline-flex rounded-[10px] border border-border bg-card p-0.5" role="group" aria-label="Thumbnail size">
                  {(['s', 'm', 'l'] as const).map((d) => (
                    <button key={d} type="button" aria-pressed={density === d} onClick={() => setDensity(d)} className={cn('h-8 w-8 rounded-[8px] text-[12px] font-medium uppercase transition-smooth', density === d ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto" onClick={(e) => view === 'grid' && e.target === e.currentTarget && selection.clear()}>
            {isLoading ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-[14px] bg-muted" />)}
              </div>
            ) : view === 'grid' ? (
              <GridView items={items} scope={scope} sort={sort} density={density} selection={selection} isStarred={isStarred} onOpen={setOpenId} onScope={setScope} onMove={move} />
            ) : (
              <div className="h-full pb-6">
                <OrganizeView items={items} scope={scope} onScope={setScope} counts={counts} selection={selection} isStarred={isStarred} onOpen={setOpenId} />
              </div>
            )}
          </div>
        </div>

        <SelectionBar selected={selected} total={items.length} onSelectAll={selection.selectAll} onClear={selection.clear} />
        <LibraryViewer items={items} openId={openId} onOpenId={setOpenId} />
      </AnimatedPage>
    </AppShell>
  );
}
