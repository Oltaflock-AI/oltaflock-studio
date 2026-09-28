import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, EyeOff, Image as ImageIcon, Minus, Star, Video } from 'lucide-react';
import { format } from 'date-fns';
import type { DbGeneration } from '@/hooks/useGenerations';
import { useFolders } from '@/hooks/useFolders';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { GenerationTitle } from '@/components/studio/stage/GenerationTitle';
import { costLabel, displayTitle } from '@/components/studio/stage/generationMeta';
import { cn } from '@/lib/utils';
import { DRAG_TYPE, FolderDot } from './folders';
import { FolderSidebar } from './FolderSidebar';
import type { Scope } from './libraryState';

type Col = 'name' | 'model' | 'folder' | 'created';

interface Selection {
  has: (id: string) => boolean; count: number; ids: string[];
  click: (id: string, e?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  toggle: (id: string) => void; selectAll: () => void; clear: () => void;
}

function Checkbox({ state, onClick, label }: { state: 'on' | 'off' | 'some'; onClick: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'some' ? 'mixed' : state === 'on'}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className={cn(
        'grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-colors',
        state === 'off' ? 'border-foreground/25 bg-card hover:border-foreground/50' : 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {state === 'on' && <Check className="h-3 w-3" strokeWidth={3} />}
      {state === 'some' && <Minus className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

function Thumb({ g }: { g: DbGeneration }) {
  return (
    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-[9px] bg-muted">
      {g.status === 'done' && g.output_url && (
        <span className={cn('absolute inset-0', g.is_nsfw && 'scale-125 blur-md')}>
          {g.type === 'video'
            ? <video src={`${g.output_url}#t=1`} muted preload="metadata" className="h-full w-full object-cover" />
            : <img src={g.output_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </span>
      )}
      {g.is_nsfw && <span className="absolute inset-0 grid place-items-center bg-black/25 text-white"><EyeOff className="h-3.5 w-3.5" /></span>}
      {g.status === 'error' && <span className="absolute inset-0 grid place-items-center bg-destructive/10 text-destructive"><AlertCircle className="h-4 w-4" /></span>}
      {(g.status === 'queued' || g.status === 'running') && <span className="absolute inset-0 animate-pulse bg-primary/15" />}
    </span>
  );
}

/** Finder-style manager: folders on the left, the scoped generations as a sortable, selectable, draggable list. */
export function OrganizeView({
  items, scope, onScope, counts, selection, isStarred, onOpen,
}: {
  items: DbGeneration[]; scope: Scope; onScope: (s: Scope) => void; counts: { all: number; unfiled: number; starred: number };
  selection: Selection; isStarred: (id: string) => boolean; onOpen: (id: string) => void;
}) {
  const { folders } = useFolders();
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: 'created', dir: -1 });
  const [renaming, setRenaming] = useState<string | null>(null);
  const folderName = (id?: string | null) => folders.find((f) => f.id === id);

  const rows = useMemo(() => {
    const key = (g: DbGeneration): string => {
      if (sort.col === 'name') return displayTitle(g).toLowerCase();
      if (sort.col === 'model') return g.model.toLowerCase();
      if (sort.col === 'folder') return (folderName(g.folder_id)?.name ?? '￿').toLowerCase();
      return g.created_at;
    };
    return [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort, folders]);

  // F2 renames the single selected item; Enter opens it; Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'F2' && selection.count === 1) { e.preventDefault(); setRenaming(selection.ids[0]); }
      if (e.key === 'Enter' && selection.count === 1) onOpen(selection.ids[0]);
      if (e.key === 'Escape') selection.clear();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selection.selectAll(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, onOpen]);

  const header = (col: Col, label: string, className?: string) => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ col, dir: s.col === col ? (-s.dir as 1 | -1) : col === 'created' ? -1 : 1 }))}
      className={cn('inline-flex items-center gap-1 text-left hover:text-foreground', sort.col === col && 'text-foreground', className)}
    >
      {label}
      {sort.col === col && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  const all = selection.count > 0 && selection.count === rows.length ? 'on' : selection.count > 0 ? 'some' : 'off';
  const title = scope.kind === 'all' ? 'All generations' : scope.kind === 'unfiled' ? 'Unfiled' : scope.kind === 'starred' ? 'Starred' : folderName(scope.id)?.name ?? 'Folder';
  const GRID = 'grid grid-cols-[28px_minmax(0,1fr)_170px_150px_120px_96px] items-center gap-4';

  return (
    <div className="flex h-full min-h-0 gap-6">
      <FolderSidebar scope={scope} onScope={(s) => { onScope(s); selection.clear(); }} counts={counts} />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-border bg-card">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
          {scope.kind === 'folder' && <FolderDot color={folderName(scope.id)?.color ?? null} className="h-5 w-5" />}
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
          <span className="ml-auto text-[12px] text-muted-foreground">Drag rows onto a folder · F2 to rename · Shift or ⌘ to select more</span>
        </div>

        <div className={cn(GRID, 'shrink-0 border-b border-border/70 bg-secondary/40 px-5 py-2 text-[11.5px] font-medium text-muted-foreground')}>
          <Checkbox state={all} label="Select all" onClick={() => (all === 'on' ? selection.clear() : selection.selectAll())} />
          {header('name', 'Name')}
          {header('model', 'Model')}
          {header('folder', 'Folder')}
          {header('created', 'Created')}
          <span className="text-right">Cost</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-24" onClick={(e) => e.target === e.currentTarget && selection.clear()}>
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-24 text-center">
              <p className="font-serif text-[26px]">{scope.kind === 'folder' ? 'This folder is empty' : 'Nothing here'}</p>
              <p className="text-[13px] text-muted-foreground">{scope.kind === 'folder' ? 'Pick All generations, then drag items onto this folder.' : 'Try another folder or filter.'}</p>
            </div>
          )}
          {rows.map((g) => {
            const sel = selection.has(g.id);
            const folder = folderName(g.folder_id);
            return (
              <div
                key={g.id}
                role="row"
                aria-selected={sel}
                draggable={renaming !== g.id}
                onDragStart={(e) => {
                  if (!sel) selection.click(g.id);
                  const ids = sel ? selection.ids : [g.id];
                  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
                  e.dataTransfer.effectAllowed = 'move';
                  const ghost = document.createElement('div');
                  ghost.textContent = ids.length === 1 ? displayTitle(g) : `${ids.length} items`;
                  ghost.style.cssText = 'position:absolute;top:-999px;padding:6px 12px;border-radius:10px;background:#16161a;color:#fff;font:600 13px Geist,sans-serif';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 12, 12);
                  setTimeout(() => ghost.remove(), 0);
                }}
                onClick={(e) => selection.click(g.id, e)}
                onDoubleClick={() => onOpen(g.id)}
                className={cn(
                  GRID, 'cursor-default select-none border-b border-border/50 px-5 py-2 transition-colors',
                  sel ? 'bg-accent/70' : 'hover:bg-secondary/50',
                )}
              >
                <Checkbox state={sel ? 'on' : 'off'} label={`Select ${displayTitle(g)}`} onClick={() => selection.toggle(g.id)} />
                <div className="flex min-w-0 items-center gap-3">
                  <Thumb g={g} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(g.id); }}>
                      {g.type === 'video' ? <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      <GenerationTitle
                        g={g}
                        className="text-[13.5px] font-medium"
                        inputClassName="h-7 text-[13.5px] font-medium"
                        editing={renaming === g.id}
                        onEditingChange={(v) => setRenaming(v ? g.id : null)}
                      />
                      {isStarred(g.id) && <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />}
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">{g.user_prompt}</p>
                  </div>
                </div>
                <span className="flex min-w-0 items-center gap-2 text-[12.5px]"><ModelBadge modelId={g.model} size="sm" /><span className="truncate">{g.model}</span></span>
                <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                  {folder ? <><FolderDot color={folder.color} className="h-3.5 w-3.5" /><span className="truncate">{folder.name}</span></> : <span className="text-muted-foreground">—</span>}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{format(new Date(g.created_at), 'd MMM, h:mm a')}</span>
                <span className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">{costLabel(g)?.split(' · ')[0] ?? '—'}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
