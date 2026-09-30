import { useState } from 'react';
import { AlertCircle, Check, EyeOff, Loader2, Pencil, Play, Star } from 'lucide-react';
import { toast } from 'sonner';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { GenerationTitle } from '@/components/studio/stage/GenerationTitle';
import type { DbGeneration } from '@/hooks/useGenerations';
import { useFolders } from '@/hooks/useFolders';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { ProgressRing } from '@/components/studio/stage/GenerationTile';
import { displayTitle } from '@/components/studio/stage/generationMeta';
import { cn } from '@/lib/utils';
import { DRAG_TYPE, FolderDot, readDraggedIds } from './folders';
import type { Scope } from './libraryState';

/** Thumbnail width in px: the Library's zoom slider range. */
export const MIN_TILE = 72;
export const MAX_TILE = 520;
export const DEFAULT_TILE = 200;

interface Selection { has: (id: string) => boolean; count: number; ids: string[]; click: (id: string, e?: React.MouseEvent) => void; toggle: (id: string) => void }

function Tile({ g, selection, starred, compact, onOpen }: { g: DbGeneration; selection: Selection; starred: boolean; compact: boolean; onOpen: () => void }) {
  const selected = selection.has(g.id);
  const selecting = selection.count > 0;
  const active = g.status === 'queued' || g.status === 'running';
  const name = displayTitle(g);
  const [renaming, setRenaming] = useState(false);
  const [starring, setStarring] = useState(false);
  const { quickStar } = usePromptLibrary();
  const canStar = g.status === 'done' && !!g.output_url;

  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canStar || starring) return;
    setStarring(true);
    try {
      const res = await quickStar(g);
      toast.success(res.starred ? `Starred “${name}”` : 'Unstarred');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not star');
    } finally {
      setStarring(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={name}
      aria-pressed={selected}
      data-tile-id={g.id}
      // Only selected tiles drag to folders; pressing an unselected one starts a marquee.
      draggable={selected && !renaming}
      onDragStart={(e) => {
        const ids = selected ? selection.ids : [g.id];
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => (selecting || e.metaKey || e.ctrlKey || e.shiftKey ? selection.click(g.id, e) : onOpen())}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter') onOpen();
        if (e.key === ' ') { e.preventDefault(); selection.toggle(g.id); }
        if (e.key === 'F2') { e.preventDefault(); setRenaming(true); }
      }}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        compact ? 'rounded-[4px]' : 'rounded-[8px]',
        selected && 'ring-[3px] ring-primary ring-offset-1 ring-offset-background',
      )}
    >
      {g.status === 'done' && g.output_url && (
        <span className={cn('absolute inset-0', g.is_nsfw && 'scale-125 blur-2xl saturate-50')}>
          {g.type === 'video' ? (
            <video src={`${g.output_url}#t=1`} muted playsInline preload="metadata" draggable={false} className="h-full w-full object-cover" aria-hidden="true" />
          ) : (
            <img src={g.output_url} alt="" loading="lazy" draggable={false} className={cn('h-full w-full object-cover transition-transform duration-300', !selected && 'group-hover:scale-[1.03]')} />
          )}
        </span>
      )}
      {g.is_nsfw && g.status === 'done' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/20 text-[12px] font-medium text-white"><EyeOff className="h-4 w-4" /> Sensitive</span>
      )}
      {active && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-secondary">
          <ProgressRing value={Math.round(g.progress)} size={40} />
          <span className="text-[12px] text-muted-foreground">Generating</span>
        </span>
      )}
      {g.status === 'error' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/[0.07] text-destructive">
          <AlertCircle className="h-5 w-5" /><span className="text-[12px] font-medium">Failed</span>
        </span>
      )}

      {(!compact || renaming) && <span
        onClick={(e) => renaming && e.stopPropagation()}
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10 transition-all duration-150',
          renaming ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
        )}
      >
        <span onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }} className="min-w-0">
          <GenerationTitle
            g={g}
            editing={renaming}
            onEditingChange={setRenaming}
            showPencil={false}
            className="text-[13px] font-semibold text-white"
            inputClassName="h-7 text-[13px] font-semibold text-foreground"
          />
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-white/75">
          <ModelBadge modelId={g.model} size="sm" className="ring-1 ring-black/20" /> <span className="truncate">{g.model}</span>
        </span>
      </span>}

      <button
        type="button"
        aria-label={selected ? 'Deselect' : 'Select'}
        onClick={(e) => { e.stopPropagation(); selection.click(g.id, { ...e, metaKey: true } as React.MouseEvent); }}
        className={cn(
          'absolute left-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-opacity',
          selected ? 'border-primary bg-primary text-primary-foreground opacity-100' : 'border-white/90 bg-black/25 text-transparent backdrop-blur-sm',
          !selected && (selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'),
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>
      <span className="absolute right-2.5 top-2.5 flex gap-1">
        {g.type === 'video' && g.status === 'done' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm"><Play className="h-2.5 w-2.5 fill-white" /> Video</span>
        )}
        {canStar && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            aria-label="Rename"
            title="Rename (F2)"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white/90 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/65 hover:text-white group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canStar && (
          <button
            type="button"
            onClick={toggleStar}
            aria-label={starred ? 'Unstar' : 'Star'}
            aria-pressed={starred}
            title={starred ? 'Unstar' : 'Star'}
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-opacity hover:bg-black/65',
              starred || starring ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            {starring ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Star className={cn('h-3.5 w-3.5', starred ? 'fill-warning text-warning' : 'text-white')} />}
          </button>
        )}
      </span>
    </div>
  );
}

function FolderCard({ id, name, color, count, cover, coverType, onOpen, onDropIds }: {
  id: string; name: string; color: string | null; count: number; cover: string | null; coverType: 'image' | 'video' | null;
  onOpen: () => void; onDropIds: (ids: string[]) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      key={id}
      data-no-marquee
      onClick={onOpen}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const ids = readDraggedIds(e); if (ids.length) onDropIds(ids); }}
      className={cn(
        'group flex w-[200px] shrink-0 flex-col gap-2 rounded-[16px] border border-border bg-card p-2 text-left transition-smooth hover:border-foreground/20 hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)]',
        over && 'border-primary ring-2 ring-primary/40',
      )}
    >
      <span className="relative block h-[96px] overflow-hidden rounded-[11px] bg-secondary">
        {cover ? (
          coverType === 'video'
            ? <video src={`${cover}#t=1`} muted preload="metadata" className="h-full w-full object-cover" />
            : <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
        ) : (
          <span className="grid h-full place-items-center text-[12px] text-muted-foreground">Drop items here</span>
        )}
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: color ?? undefined }} />
      </span>
      <span className="flex items-center gap-2 px-1 pb-0.5">
        <FolderDot color={color} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{name}</span>
        <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">{count}</span>
      </span>
    </button>
  );
}

/** Visual grid of generations, with folder covers on top when browsing everything. */
export function GridView({
  items, scope, tileSize, selection, isStarred, onOpen, onScope, onMove,
}: {
  items: DbGeneration[]; scope: Scope; tileSize: number; selection: Selection;
  isStarred: (id: string) => boolean; onOpen: (id: string) => void; onScope: (s: Scope) => void; onMove: (ids: string[], folderId: string, name: string) => void;
}) {
  const { folders } = useFolders();
  const compact = tileSize < 140;

  return (
    <div className="space-y-7 pb-28">
      {scope.kind === 'all' && folders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Folders</h2>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {folders.map((f) => (
              <FolderCard key={f.id} {...f} onOpen={() => onScope({ kind: 'folder', id: f.id })} onDropIds={(ids) => onMove(ids, f.id, f.name)} />
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <p className="font-serif text-[28px]">{scope.kind === 'folder' ? 'This folder is empty' : scope.kind === 'starred' ? 'No starred generations yet' : 'Nothing here yet'}</p>
          <p className="max-w-[360px] text-[13.5px] text-muted-foreground">
            {scope.kind === 'folder'
              ? 'Drag generations onto the folder, or select some and use Move to.'
              : scope.kind === 'starred'
                ? 'Hover any generation and tap the star to keep your favourites here.'
                : 'Try a different filter, or make something in the Studio.'}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className={cn('grid', compact ? 'gap-[3px]' : 'gap-1')} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(tileSize)}px, 1fr))` }}>
          {items.map((g) => (
            <Tile key={g.id} g={g} selection={selection} starred={isStarred(g.id)} compact={compact} onOpen={() => onOpen(g.id)} />
          ))}
        </div>
      )}

    </div>
  );
}
