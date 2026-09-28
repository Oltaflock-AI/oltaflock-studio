import { useEffect, useState, type ReactNode } from 'react';
import { Check, Folder as FolderIcon, FolderMinus, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useFolders, FOLDER_COLORS, type FolderWithCount } from '@/hooks/useFolders';
import { useGenerations } from '@/hooks/useGenerations';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** MIME type used when dragging generations onto a folder. */
export const DRAG_TYPE = 'application/x-oltaflock-generations';

export function FolderDot({ color, className }: { color: string | null; className?: string }) {
  return <FolderIcon className={cn('h-4 w-4 shrink-0', className)} style={{ color: color ?? 'currentColor' }} fill={color ?? 'none'} fillOpacity={0.18} />;
}

/** Create or rename a folder. With `folder`, it renames; otherwise it creates (and optionally files `moveIds` into it). */
export function FolderDialog({
  open, onOpenChange, folder, moveIds, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: FolderWithCount | null;
  moveIds?: string[];
  onCreated?: (id: string) => void;
}) {
  const { createFolder, renameFolder, recolorFolder } = useFolders();
  const { moveToFolder } = useGenerations();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(FOLDER_COLORS[0]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setName(folder?.name ?? ''); setColor(folder?.color ?? FOLDER_COLORS[0]); }
  }, [open, folder]);

  const submit = async () => {
    setBusy(true);
    try {
      if (folder) {
        if (name.trim() !== folder.name) await renameFolder(folder.id, name);
        if (color !== folder.color) await recolorFolder(folder.id, color);
        toast.success('Folder updated');
      } else {
        const created = await createFolder(name);
        if (color !== created.color) await recolorFolder(created.id, color);
        if (moveIds?.length) await moveToFolder(moveIds, created.id);
        toast.success(moveIds?.length ? `Moved ${moveIds.length} into ${created.name}` : `Created ${created.name}`);
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[26px] font-normal">{folder ? 'Edit folder' : 'New folder'}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {folder ? 'Rename it or pick a new colour.' : moveIds?.length ? `The ${moveIds.length} selected will go straight into it.` : 'Group generations by client, campaign or idea.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <input
            id="folder-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Blaze chips launch"
            className="h-11 w-full rounded-[12px] border border-border bg-secondary/50 px-3.5 text-[15px] outline-none focus:border-primary/60 focus:bg-card focus:ring-[3px] focus:ring-primary/15"
          />
          <div className="flex items-center gap-2">
            <span className="mr-1 text-[12.5px] text-muted-foreground">Colour</span>
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn('grid h-7 w-7 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110', color === c && 'ring-2 ring-foreground/70')}
                style={{ background: c }}
              >
                {color === c && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-[11px] px-4 text-[13.5px] text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className="h-10 rounded-[11px] bg-foreground px-5 text-[13.5px] font-semibold text-background hover:bg-foreground/90 disabled:opacity-50">
              {folder ? 'Save' : 'Create folder'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dropdown that files `ids` into a folder, back to unfiled, or into a new folder. */
export function MoveToFolderMenu({
  ids, children, align = 'start', side = 'bottom', currentFolderId,
}: {
  ids: string[];
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  side?: 'top' | 'bottom';
  currentFolderId?: string | null;
}) {
  const { folders } = useFolders();
  const { moveToFolder } = useGenerations();
  const [newOpen, setNewOpen] = useState(false);

  const move = async (folderId: string | null, label: string) => {
    try {
      await moveToFolder(ids, folderId);
      toast.success(folderId ? `Moved ${ids.length === 1 ? '1 item' : `${ids.length} items`} to ${label}` : `Removed from folder`);
    } catch {
      toast.error('Could not move. Try again.');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} className="w-[220px]">
          <DropdownMenuLabel className="text-[11.5px] font-medium text-muted-foreground">Move to folder</DropdownMenuLabel>
          {folders.length === 0 && <p className="px-2 py-1.5 text-[12.5px] text-muted-foreground">No folders yet</p>}
          {folders.map((f) => (
            <DropdownMenuItem key={f.id} onSelect={() => move(f.id, f.name)} className="gap-2 text-[13px]">
              <FolderDot color={f.color} />
              <span className="flex-1 truncate">{f.name}</span>
              {currentFolderId === f.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setNewOpen(true)} className="gap-2 text-[13px]">
            <FolderPlus className="h-4 w-4" /> New folder…
          </DropdownMenuItem>
          {currentFolderId !== undefined && currentFolderId !== null && (
            <DropdownMenuItem onSelect={() => move(null, '')} className="gap-2 text-[13px] text-muted-foreground">
              <FolderMinus className="h-4 w-4" /> Remove from folder
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <FolderDialog open={newOpen} onOpenChange={setNewOpen} moveIds={ids} />
    </>
  );
}

/** Reads dragged generation ids from a drop event. */
export function readDraggedIds(e: React.DragEvent): string[] {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
