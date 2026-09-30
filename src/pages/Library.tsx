import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, FolderTree, LayoutGrid, Loader2, Search, Star, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGenerations } from '@/hooks/useGenerations';
import { useAuth } from '@/hooks/useAuth';
import { useMarqueeSelect } from '@/components/library/useMarqueeSelect';
import { UPLOAD_ACCEPT, uploadProblem, uploadToLibrary } from '@/components/library/uploadToLibrary';
import { useFolders } from '@/hooks/useFolders';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { GridView, DEFAULT_TILE, MAX_TILE, MIN_TILE } from '@/components/library/GridView';
import { Slider } from '@/components/ui/slider';
import { OrganizeView } from '@/components/library/OrganizeView';
import { LibraryViewer } from '@/components/library/LibraryViewer';
import { SelectionBar } from '@/components/library/SelectionBar';
import { FolderDot } from '@/components/library/folders';
import { TYPE_FILTERS, applyFilters, useSelection, type Scope, type SortKey, type TypeFilter } from '@/components/library/libraryState';
import { cn } from '@/lib/utils';

type View = 'grid' | 'organize';

const clampTile = (n: number) => Math.min(MAX_TILE, Math.max(MIN_TILE, n));

function readTileSize(): number {
  try { const v = Number(localStorage.getItem('library-tile-size')); return v ? clampTile(v) : DEFAULT_TILE; } catch { return DEFAULT_TILE; }
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
  const [tileSize, setTileSizeState] = useState<number>(readTileSize);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const setTileSize = useCallback((next: number | ((prev: number) => number)) => {
    setTileSizeState((prev) => {
      const v = clampTile(typeof next === 'function' ? next(prev) : next);
      try { localStorage.setItem('library-tile-size', String(Math.round(v))); } catch { /* per-device nicety only */ }
      return v;
    });
  }, []);
  const zoomBy = useCallback((factor: number) => setTileSize((s) => s * factor), [setTileSize]);

  // Pinch on a trackpad (ctrl+wheel) and Cmd/Ctrl +/- zoom the grid instead of the page.
  useEffect(() => {
    if (view !== 'grid') return;
    const el = scrollRef.current;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.01));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomBy(1.2); }
      if (e.key === '-') { e.preventDefault(); zoomBy(1 / 1.2); }
    };
    el?.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => { el?.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); };
  }, [view, zoomBy]);

  // Upload from the device: via the button or by dropping files anywhere on the page.
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const uploadFiles = async (list: FileList | File[]) => {
    if (!user?.id) return;
    const files = Array.from(list);
    const bad = files.map(uploadProblem).filter((p): p is string => !!p);
    bad.forEach((p) => toast.error(p));
    const good = files.filter((f) => !uploadProblem(f));
    if (!good.length) return;
    const folderId = scope.kind === 'folder' ? scope.id : null;
    setUploading((n) => n + good.length);
    const results = await Promise.allSettled(good.map(async (f) => {
      try { return await uploadToLibrary(user.id, f, folderId); } finally { setUploading((n) => n - 1); }
    }));
    queryClient.invalidateQueries({ queryKey: ['generations', user.id] });
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (ok) toast.success(`Added ${ok === 1 ? '1 file' : `${ok} files`} to your library`);
    if (failed) toast.error(`${failed === 1 ? '1 file' : `${failed} files`} could not be uploaded`);
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current += 1; setDragging(true); },
    onDragOver: (e: React.DragEvent) => { if (hasFiles(e)) e.preventDefault(); },
    onDragLeave: (e: React.DragEvent) => { if (!hasFiles(e)) return; dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void uploadFiles(e.dataTransfer.files);
    },
  };

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
  const marquee = useMarqueeSelect({ containerRef: scrollRef, enabled: view === 'grid', selectedIds: selection.ids, onSelect: selection.set });

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
        <div className="relative flex h-full w-full flex-col overflow-hidden px-4 pt-5 sm:px-5" {...dropHandlers}>
          {dragging && (
            <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-[16px] border-2 border-dashed border-primary/60 bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-7 w-7 text-primary" />
                <p className="text-[15px] font-medium">Drop to add to {scopedFolder?.name ?? 'your library'}</p>
                <p className="text-[12.5px] text-muted-foreground">Images and videos, up to 95MB each</p>
              </div>
            </div>
          )}
          <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 pb-4">
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
                {isLoading ? 'Loading your generations…' : view === 'grid' && scope.kind === 'starred' ? `${counts.starred} starred` : `${generations.length} generation${generations.length === 1 ? '' : 's'} · ${folders.length} folder${folders.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              multiple
              hidden
              onChange={(e) => { if (e.target.files?.length) void uploadFiles(e.target.files); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload images or videos from your device (or drop them anywhere here)"
              className="inline-flex h-[42px] items-center gap-2 rounded-[12px] border border-border bg-card px-4 text-[13.5px] font-medium transition-smooth hover:bg-secondary"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? `Uploading ${uploading}…` : 'Upload'}
            </button>
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
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5 pb-4">
            {view === 'grid' && (
              <div className="inline-flex rounded-[10px] border border-border bg-card p-0.5" role="tablist" aria-label="Show">
                {([['all', 'All', counts.all], ['starred', 'Starred', counts.starred]] as const).map(([kind, label, count]) => {
                  const on = kind === 'starred' ? scope.kind === 'starred' : scope.kind !== 'starred';
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setScope({ kind })}
                      className={cn('inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] transition-smooth', on ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {kind === 'starred' && <Star className={cn('h-3.5 w-3.5', on ? 'fill-warning text-warning' : '')} />}
                      {label}
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
                <div className="flex h-9 items-center gap-1 rounded-[10px] border border-border bg-card px-1.5" title="Zoom (pinch or ⌘ +/−)">
                  <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)} disabled={tileSize <= MIN_TILE} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <Slider
                    aria-label="Thumbnail size"
                    className="w-[160px] px-1"
                    min={MIN_TILE}
                    max={MAX_TILE}
                    step={1}
                    value={[tileSize]}
                    onValueChange={([v]) => setTileSize(v)}
                  />
                  <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)} disabled={tileSize >= MAX_TILE} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto" onPointerDown={marquee.onPointerDown} onClick={(e) => view === 'grid' && e.target === e.currentTarget && selection.clear()}>
            {marquee.box && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-20 rounded-[4px] border border-primary bg-primary/15"
                style={{ left: marquee.box.left, top: marquee.box.top, width: marquee.box.width, height: marquee.box.height }}
              />
            )}
            {isLoading ? (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(tileSize)}px, 1fr))` }}>
                {Array.from({ length: 24 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-[8px] bg-muted" />)}
              </div>
            ) : view === 'grid' ? (
              <GridView items={items} scope={scope} tileSize={tileSize} selection={selection} isStarred={isStarred} onOpen={setOpenId} onScope={setScope} onMove={move} />
            ) : (
              <div className="h-full pb-6">
                <OrganizeView items={items} scope={scope} onScope={setScope} counts={counts} selection={selection} isStarred={isStarred} onOpen={setOpenId} />
              </div>
            )}
          </div>
        </div>

        <SelectionBar allowCreateFolder={view === 'organize'} selected={selected} total={items.length} onSelectAll={selection.selectAll} onClear={selection.clear} />
        <LibraryViewer items={items} openId={openId} onOpenId={setOpenId} />
      </AnimatedPage>
    </AppShell>
  );
}
