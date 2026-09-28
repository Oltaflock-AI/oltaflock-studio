import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FolderInput, Loader2, Trash2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useGenerationTitles } from '@/hooks/useGenerationTitles';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { downloadGeneration } from '@/lib/downloadGeneration';
import { MoveToFolderMenu } from './folders';

const BTN = 'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium text-background/90 transition-smooth hover:bg-background/15 hover:text-background disabled:opacity-50';

/** Floating actions for the current multi-selection. */
export function SelectionBar({ selected, total, onSelectAll, onClear }: { selected: DbGeneration[]; total: number; onSelectAll: () => void; onClear: () => void }) {
  const { deleteGenerations } = useGenerations();
  const { autoNameMany } = useGenerationTitles();
  const [confirm, setConfirm] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const ids = selected.map((g) => g.id);
  const untitled = selected.filter((g) => !g.title).length;
  const busy = selected.some((g) => g.status === 'queued' || g.status === 'running');

  const downloadAll = async () => {
    const ready = selected.filter((g) => g.status === 'done' && g.output_url);
    toast.info(`Downloading ${ready.length} file${ready.length === 1 ? '' : 's'}…`);
    for (const g of ready) await downloadGeneration(g, { quiet: true });
    toast.success(`Downloaded ${ready.length}`);
  };

  const autoName = async () => {
    setNaming(`0/${untitled}`);
    const named = await autoNameMany(selected, (d, t) => setNaming(`${d}/${t}`));
    setNaming(null);
    toast.success(named ? `Named ${named} generation${named === 1 ? '' : 's'}` : 'Nothing to name');
  };

  return (
    <>
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-6 left-[calc(50%+116px)] z-50 flex -translate-x-1/2 items-center gap-1 rounded-[16px] bg-foreground p-1.5 pl-4 text-background shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
          >
            <span className="mr-2 text-[13px] font-semibold tabular-nums">{selected.length} selected</span>
            {selected.length < total && (
              <button type="button" onClick={onSelectAll} className="mr-1 text-[12.5px] text-background/60 underline-offset-2 hover:text-background hover:underline">Select all {total}</button>
            )}
            <span className="mx-1 h-5 w-px bg-background/20" />
            <MoveToFolderMenu ids={ids} side="top" align="center">
              <button type="button" className={BTN}><FolderInput className="h-4 w-4" /> Move to</button>
            </MoveToFolderMenu>
            {untitled > 0 && (
              <button type="button" onClick={autoName} disabled={!!naming} className={BTN} title="Write names from the prompts">
                {naming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {naming ? `Naming ${naming}` : `Auto-name${untitled < selected.length ? ` ${untitled}` : ''}`}
              </button>
            )}
            <button type="button" onClick={downloadAll} className={BTN}><Download className="h-4 w-4" /> Download</button>
            <button type="button" onClick={() => setConfirm(true)} disabled={busy} className={`${BTN} hover:!bg-destructive hover:!text-destructive-foreground`}><Trash2 className="h-4 w-4" /> Delete</button>
            <button type="button" onClick={onClear} aria-label="Clear selection" className="ml-1 grid h-9 w-9 place-items-center rounded-[10px] text-background/70 hover:bg-background/15 hover:text-background"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} generation{selected.length === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>They're removed from your library and history for good. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await deleteGenerations(ids);
                  toast.success(`Deleted ${ids.length}`);
                  onClear();
                } catch {
                  toast.error('Could not delete. Try again.');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
