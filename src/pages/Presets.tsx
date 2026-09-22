import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layers, Plus, Search, Star, X, AlertCircle, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LibraryDetailDialog } from '@/components/library/LibraryDetailDialog';
import { PresetCard } from '@/components/presets/PresetCard';
import { FeaturedPreset } from '@/components/presets/FeaturedPreset';
import {
  applyPresetToStore,
  isVideoUrl,
  modelLabel,
  usePresetFavorites,
} from '@/components/presets/presetUtils';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { LIBRARY_CATEGORIES, type LibraryCategory, type LibraryItem } from '@/types/library';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | 'favorites' | LibraryCategory;
type SourceFilter = 'all' | 'curated' | 'saved';

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'curated', label: 'Curated' },
  { value: 'saved', label: 'Saved by you' },
];

export default function Presets() {
  const navigate = useNavigate();
  const { items, isLoading, error, refetch } = usePromptLibrary();
  const { favorites, toggleFavorite } = usePresetFavorites();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [detailItem, setDetailItem] = useState<LibraryItem | null>(null);

  const curatedCount = useMemo(() => items.filter((i) => i.is_curated).length, [items]);
  const savedCount = items.length - curatedCount;

  // Items arrive curated-first, newest-first, so the first curated item with a
  // still image is the most recent curated preset we can show as a banner.
  const featured = useMemo(
    () => items.find((i) => i.is_curated && !!i.thumbnail_url && !isVideoUrl(i.thumbnail_url)) ?? null,
    [items]
  );

  const query = search.trim().toLowerCase();
  const isFiltering = query.length > 0 || category !== 'all' || source !== 'all';
  const showFeatured = !!featured && !isFiltering;

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (showFeatured && featured && item.id === featured.id) return false;
      if (source === 'curated' && !item.is_curated) return false;
      if (source === 'saved' && item.is_curated) return false;
      if (category === 'favorites' && !favorites.has(item.id)) return false;
      if (category !== 'all' && category !== 'favorites' && item.category !== category) return false;
      if (query) {
        const haystack = `${item.title} ${item.prompt} ${item.model ?? ''} ${modelLabel(item.model)}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, showFeatured, featured, source, category, favorites, query]);

  const handleUse = (item: LibraryItem) => {
    const { modelLoaded } = applyPresetToStore(item);
    if (modelLoaded) {
      toast.success(`Loaded “${item.title}” into Studio`);
    } else {
      toast.info(`Loaded “${item.title}” — pick a model to continue`, {
        description: item.model
          ? `${item.model} isn't available anymore, so only the prompt was loaded.`
          : 'This preset has no model attached.',
      });
    }
    navigate('/');
  };

  const handleCreate = () => {
    toast.info('Presets are saved from a generation', {
      description: 'Generate something in Studio, then use “Save to Library” (or the star) on the result to keep it as a preset.',
    });
    navigate('/');
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setSource('all');
  };

  const pills: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...LIBRARY_CATEGORIES,
    { value: 'favorites', label: 'Favorites' },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-7 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-serif text-[28px] font-medium leading-tight">Presets</h1>
            <p className="text-[13px] text-muted-foreground">Curated looks and your saved combinations</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative w-[220px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search presets…"
                aria-label="Search presets"
                className="h-9 rounded-[10px] border-border bg-card pl-9 pr-8 text-[12.5px]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={handleCreate}
              className="h-9 gap-1.5 rounded-[10px] px-4 text-[12.5px] font-semibold shadow-[0_6px_16px_hsl(var(--primary)/0.3)]"
            >
              <Plus className="h-4 w-4" />
              Create preset
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {pills.map((pill) => {
              const active = category === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setCategory(pill.value)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-[15px] py-2 text-xs transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  {pill.value === 'favorites' && (
                    <Star className={cn('h-3 w-3', active ? 'fill-current' : '')} aria-hidden="true" />
                  )}
                  {pill.label}
                </button>
              );
            })}
          </div>

          {savedCount > 0 && curatedCount > 0 && (
            <div
              className="inline-flex rounded-[10px] border border-border bg-card p-0.5"
              role="group"
              aria-label="Filter by source"
            >
              {SOURCE_OPTIONS.map((opt) => {
                const active = source === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSource(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-[8px] px-3 py-1.5 text-xs transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-card px-6 py-16 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.6} />
            <div>
              <p className="font-serif text-lg font-medium">Couldn't load presets</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Something went wrong.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="gap-2 rounded-[10px]">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <>
            {showFeatured && featured && (
              <FeaturedPreset
                item={featured}
                isFavorite={favorites.has(featured.id)}
                onToggleFavorite={() => toggleFavorite(featured.id)}
                onUse={() => handleUse(featured)}
                onOpen={() => setDetailItem(featured)}
              />
            )}

            {curatedCount === 0 && !isFiltering && (
              <p className="rounded-[12px] border border-dashed border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                No curated presets are published yet — showing the prompts you've saved.
              </p>
            )}

            {visible.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visible.map((item) => (
                  <PresetCard
                    key={item.id}
                    item={item}
                    isFavorite={favorites.has(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                    onUse={() => handleUse(item)}
                    onOpen={() => setDetailItem(item)}
                  />
                ))}
              </div>
            ) : isFiltering ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border px-6 py-14 text-center">
                <p className="text-sm text-muted-foreground">
                  {category === 'favorites' && favorites.size === 0
                    ? 'No favorites yet — tap the star on any preset to keep it here.'
                    : 'No presets match these filters.'}
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-[10px]">
                  Clear filters
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <LibraryDetailDialog
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading presets">
      <Skeleton className="h-[168px] w-full rounded-[20px]" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] w-full rounded-[15px]" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10">
        <Layers className="h-6 w-6 text-primary" strokeWidth={1.8} />
      </div>
      <div className="max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">No presets yet</p>
        <h2 className="mt-1 font-serif text-xl font-medium">Your preset shelf is empty</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Curated looks will appear here as they're published. You can also save any generation from Studio to
          reuse its prompt and model later.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1.5 rounded-[10px]">
        <Plus className="h-4 w-4" />
        Create preset
      </Button>
    </div>
  );
}
