import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AnimatedPage } from '@/components/ui/animated-page';
import { StudioHeader } from '@/components/layout/StudioHeader';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Library as LibraryIcon } from 'lucide-react';
import { CategoryFilter } from '@/components/library/CategoryFilter';
import { LibraryCard } from '@/components/library/LibraryCard';
import { LibraryDetailDialog } from '@/components/library/LibraryDetailDialog';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import type { LibraryCategory, LibraryItem } from '@/types/library';

type SourceFilter = 'all' | 'saved' | 'curated';

export default function Library() {
  const { items, isLoading, deleteFromLibrary } = usePromptLibrary();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LibraryCategory | 'all'>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [selected, setSelected] = useState<LibraryItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (category !== 'all' && it.category !== category) return false;
      if (source === 'saved' && it.is_curated) return false;
      if (source === 'curated' && !it.is_curated) return false;
      if (q) {
        const hay = `${it.title} ${it.prompt} ${it.model}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, category, source]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFromLibrary(id);
      toast.success('Removed from library');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete';
      toast.error(msg);
    }
  };

  return (
    <AnimatedPage className="h-screen w-screen">
      <div className="h-screen w-screen flex flex-col bg-muted/30 overflow-hidden">
        <StudioHeader />

        <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden min-h-0 max-w-7xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1 shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <LibraryIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-tight">
                  Prompt Library
                </h1>
                <p className="text-xs text-muted-foreground leading-tight">
                  Curated presets and your saved prompts. Click any to reuse.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search prompts, titles, models..."
                  className="pl-9 h-9"
                />
              </div>
              <Tabs value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="curated" className="text-xs px-3">
                    Curated
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="text-xs px-3">
                    Saved
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <CategoryFilter value={category} onChange={setCategory} />
          </div>

          <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <LibraryIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium">No prompts match</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {items.length === 0
                    ? 'Save a generation from the studio to start your library.'
                    : 'Try a different category, search, or source filter.'}
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((item) => (
                    <LibraryCard
                      key={item.id}
                      item={item}
                      onOpen={() => setSelected(item)}
                      onDelete={
                        item.is_curated ? undefined : () => handleDelete(item.id)
                      }
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </ScrollArea>
        </div>

        <LibraryDetailDialog
          item={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      </div>
    </AnimatedPage>
  );
}
