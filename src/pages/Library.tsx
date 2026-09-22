import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Library as LibraryIcon } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CategoryFilter } from '@/components/library/CategoryFilter';
import { CollectionFilter } from '@/components/library/CollectionFilter';
import { LibraryCard } from '@/components/library/LibraryCard';
import { LibraryDetailDialog } from '@/components/library/LibraryDetailDialog';
import { HistoryList } from '@/components/library/HistoryList';
import { NewCollectionDialog, MoveToCollectionDialog } from '@/components/library/CollectionDialogs';
import { modelDisplayName } from '@/components/library/modelName';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { useGenerations } from '@/hooks/useGenerations';
import type { LibraryCategory, LibraryItem } from '@/types/library';

type LibraryTab = 'all' | 'curated' | 'saved' | 'history';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'curated', label: 'Curated' },
  { id: 'saved', label: 'Saved' },
  { id: 'history', label: 'History' },
];

function parseTab(value: string | null): LibraryTab {
  return TABS.some((t) => t.id === value) ? (value as LibraryTab) : 'all';
}

export default function Library() {
  const {
    items,
    isLoading,
    deleteFromLibrary,
    isOwnItem,
    collections,
    findSavedCopy,
    saveCopy,
    restoreItem,
  } = usePromptLibrary();
  const { generations, isLoading: historyLoading } = useGenerations();

  // Tab lives in the URL (?tab=) so the shell's "History" link deep-links here.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const setTab = (next: LibraryTab) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'all') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true }
    );
  };

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LibraryCategory | 'all'>('all');
  const [collection, setCollection] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<LibraryItem | null>(null);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [starBusyId, setStarBusyId] = useState<string | null>(null);

  // Resolve from live data so the dialog reflects collection moves etc.
  const selected = useMemo(
    () => (selectedId ? items.find((it) => it.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  // Drop a stale collection filter once its last item leaves it.
  const activeCollection =
    collection && collections.some((c) => c.name === collection) ? collection : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (category !== 'all' && it.category !== category) return false;
      if (tab === 'saved' && it.is_curated) return false;
      if (tab === 'curated' && !it.is_curated) return false;
      if (activeCollection && (!isOwnItem(it) || it.collection !== activeCollection)) return false;
      if (q) {
        const hay =
          `${it.title} ${it.prompt} ${it.model} ${modelDisplayName(it.model)} ${it.collection ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, category, tab, activeCollection, isOwnItem]);

  const removeWithUndo = useCallback(
    async (item: LibraryItem) => {
      await deleteFromLibrary(item.id);
      toast.success('Removed from library', {
        action: {
          label: 'Undo',
          onClick: () => {
            restoreItem(item).catch((e: unknown) =>
              toast.error(e instanceof Error ? e.message : 'Failed to restore')
            );
          },
        },
      });
    },
    [deleteFromLibrary, restoreItem]
  );

  const handleDelete = async (item: LibraryItem) => {
    try {
      await removeWithUndo(item);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete';
      toast.error(msg);
    }
  };

  const handleToggleStar = async (item: LibraryItem) => {
    if (starBusyId) return;
    setStarBusyId(item.id);
    try {
      if (isOwnItem(item)) {
        // Own item: un-starring removes it from the library (undoable).
        await removeWithUndo(item);
      } else {
        const copy = findSavedCopy(item);
        if (copy) {
          await removeWithUndo(copy);
        } else {
          await saveCopy(item);
          toast.success('Saved to your library');
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setStarBusyId(null);
    }
  };

  const isHistory = tab === 'history';

  return (
    <AppShell scrollableContent={false}>
      <AnimatedPage className="h-full">
        <div className="mx-auto flex h-full w-full max-w-[1280px] flex-col gap-4 overflow-hidden px-8 pt-7">
          {/* Header */}
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight">Library</h1>
              <p className="text-[13px] text-muted-foreground">
                Every generation, saved prompt and collection
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-[240px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isHistory ? 'Search history…' : 'Search library…'}
                  aria-label={isHistory ? 'Search history' : 'Search library'}
                  className="h-9 rounded-[10px] bg-card pl-9 text-[12.5px]"
                />
              </div>
              <Button
                type="button"
                onClick={() => setNewCollectionOpen(true)}
                className="h-9 gap-1.5 rounded-[10px] px-4 text-[12.5px] font-semibold shadow-[0_6px_16px_hsl(var(--primary)/0.25)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New collection
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <div role="tablist" aria-label="Library sections" className="flex shrink-0 gap-6 border-b border-border">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`library-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls="library-panel"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    '-mb-px border-b-2 px-0.5 pb-3 text-[13px] transition-colors',
                    'focus-visible:outline-none focus-visible:text-foreground',
                    active
                      ? 'border-primary font-semibold text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.label}
                  {t.id === 'history' && generations.length > 0 && (
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground tabular-nums">
                      {generations.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters (grid views only) */}
          {!isHistory && (
            <div className="flex shrink-0 flex-col gap-2.5">
              <CollectionFilter
                collections={collections}
                value={activeCollection}
                onChange={setCollection}
              />
              <CategoryFilter value={category} onChange={setCategory} />
            </div>
          )}

          <div
            id="library-panel"
            role="tabpanel"
            aria-labelledby={`library-tab-${tab}`}
            className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pt-1"
          >
            {isHistory ? (
              <HistoryList generations={generations} isLoading={historyLoading} search={search} />
            ) : isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading library" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
                  <LibraryIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">No prompts match</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {items.length === 0
                    ? 'Save a generation from the studio to start your library.'
                    : 'Try a different category, collection, search, or tab.'}
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((item) => {
                    const own = isOwnItem(item);
                    return (
                      <LibraryCard
                        key={item.id}
                        item={item}
                        onOpen={() => setSelectedId(item.id)}
                        onDelete={own ? () => handleDelete(item) : undefined}
                        onMoveToCollection={own ? () => setMoveTarget(item) : undefined}
                        starred={own || !!findSavedCopy(item)}
                        onToggleStar={() => handleToggleStar(item)}
                        starBusy={starBusyId === item.id}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        <LibraryDetailDialog
          item={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelectedId(null)}
          onMoveToCollection={(item) => setMoveTarget(item)}
        />
        <MoveToCollectionDialog
          item={moveTarget}
          open={!!moveTarget}
          onOpenChange={(o) => !o && setMoveTarget(null)}
        />
        <NewCollectionDialog
          open={newCollectionOpen}
          onOpenChange={setNewCollectionOpen}
          onCreated={(name) => {
            setCollection(name);
            if (tab === 'curated' || tab === 'history') setTab('all');
          }}
        />
      </AnimatedPage>
    </AppShell>
  );
}
