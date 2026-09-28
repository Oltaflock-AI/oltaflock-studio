import { useState, type ReactNode } from 'react';
import { FolderPlus, Inbox, Layers, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFolders, type FolderWithCount } from '@/hooks/useFolders';
import { useGenerations } from '@/hooks/useGenerations';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { DRAG_TYPE, FolderDialog, FolderDot, readDraggedIds } from './folders';
import type { Scope } from './libraryState';

interface Counts { all: number; unfiled: number; starred: number }

function Row({
  active, icon, label, count, onClick, onDropIds, children,
}: {
  active: boolean; icon: ReactNode; label: string; count: number; onClick: () => void;
  onDropIds?: (ids: string[]) => void; children?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      onDragOver={onDropIds ? (e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); } } : undefined}
      onDragLeave={onDropIds ? () => setOver(false) : undefined}
      onDrop={onDropIds ? (e) => { e.preventDefault(); setOver(false); const ids = readDraggedIds(e); if (ids.length) onDropIds(ids); } : undefined}
      className={cn(
        'group flex h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-card font-medium text-foreground shadow-[0_1px_2px_hsl(240_10%_10%/0.06),0_0_0_1px_hsl(var(--border))] dark:bg-secondary' : 'text-foreground/80 hover:bg-secondary/70',
        over && 'bg-accent text-accent-foreground ring-2 ring-primary/50',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground group-hover:hidden">{count}</span>
      <span className="hidden group-hover:block">{children}</span>
    </div>
  );
}

/** Library scopes and folders. Folders accept dragged generations. */
export function FolderSidebar({ scope, onScope, counts }: { scope: Scope; onScope: (s: Scope) => void; counts: Counts }) {
  const { folders, deleteFolder } = useFolders();
  const { moveToFolder } = useGenerations();
  const [dialog, setDialog] = useState<{ open: boolean; folder: FolderWithCount | null }>({ open: false, folder: null });
  const [confirm, setConfirm] = useState<FolderWithCount | null>(null);

  const drop = (folderId: string | null, label: string) => async (ids: string[]) => {
    try {
      await moveToFolder(ids, folderId);
      toast.success(folderId ? `Moved ${ids.length === 1 ? '1 item' : `${ids.length} items`} to ${label}` : `Moved ${ids.length} to unfiled`);
    } catch {
      toast.error('Could not move. Try again.');
    }
  };

  return (
    <nav aria-label="Folders" className="flex h-full w-[248px] shrink-0 flex-col gap-5 overflow-y-auto pr-1">
      <div className="space-y-0.5">
        <Row active={scope.kind === 'all'} icon={<Layers className="h-4 w-4 text-muted-foreground" />} label="All generations" count={counts.all} onClick={() => onScope({ kind: 'all' })} />
        <Row active={scope.kind === 'unfiled'} icon={<Inbox className="h-4 w-4 text-muted-foreground" />} label="Unfiled" count={counts.unfiled} onClick={() => onScope({ kind: 'unfiled' })} onDropIds={drop(null, 'Unfiled')} />
        <Row active={scope.kind === 'starred'} icon={<Star className="h-4 w-4 text-warning" />} label="Starred" count={counts.starred} onClick={() => onScope({ kind: 'starred' })} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between px-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Folders</span>
          <button type="button" onClick={() => setDialog({ open: true, folder: null })} className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="New folder">
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
        {folders.length === 0 && (
          <button type="button" onClick={() => setDialog({ open: true, folder: null })} className="mx-1 flex w-[calc(100%-8px)] flex-col items-start gap-1 rounded-[12px] border border-dashed border-border px-3 py-3 text-left text-[12.5px] text-muted-foreground hover:border-foreground/30 hover:text-foreground">
            <span className="font-medium text-foreground">Create your first folder</span>
            Then drag generations onto it.
          </button>
        )}
        <div className="space-y-0.5">
          {folders.map((f) => (
            <Row
              key={f.id}
              active={scope.kind === 'folder' && scope.id === f.id}
              icon={<FolderDot color={f.color} />}
              label={f.name}
              count={f.count}
              onClick={() => onScope({ kind: 'folder', id: f.id })}
              onDropIds={drop(f.id, f.name)}
            >
              <DropdownMenu>
                <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${f.name} options`}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => setDialog({ open: true, folder: f })} className="gap-2 text-[13px]"><Pencil className="h-3.5 w-3.5" /> Rename or recolour</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setConfirm(f)} className="gap-2 text-[13px] text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete folder</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Row>
          ))}
        </div>
      </div>

      <FolderDialog open={dialog.open} folder={dialog.folder} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} onCreated={(id) => onScope({ kind: 'folder', id })} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirm?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the folder is deleted. Its {confirm?.count ?? 0} generation{confirm?.count === 1 ? '' : 's'} stay in your library as unfiled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirm) return;
                try {
                  await deleteFolder(confirm.id);
                  if (scope.kind === 'folder' && scope.id === confirm.id) onScope({ kind: 'all' });
                  toast.success(`Deleted ${confirm.name}`);
                } catch {
                  toast.error('Could not delete the folder');
                }
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
