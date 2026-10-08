import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AtSign, Boxes, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ElementDialog } from '@/components/elements/ElementDialog';
import { ELEMENT_KINDS, useElements, type StudioElement } from '@/hooks/useElements';
import { useGenerationStore } from '@/store/generationStore';
import { referenceElement } from '@/components/studio/stage/generationActions';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const IDEAS = [
  { name: 'Peanut', kind: 'Character', text: 'Your mascot, pet or recurring model, the same face every time.' },
  { name: 'CrunchyBag', kind: 'Product', text: 'A pack shot that has to look exactly right in every ad.' },
  { name: 'Logo', kind: 'Logo', text: 'Your brand mark, ready to drop into any scene.' },
];

/** Reusable references: name them once, then "@Name" in any prompt. */
export default function Elements() {
  const navigate = useNavigate();
  const { elements, isLoading, error, deleteElement } = useElements();
  const [editing, setEditing] = useState<StudioElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<StudioElement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openInStudio = (e: StudioElement) => {
    const store = useGenerationStore.getState();
    const prompt = store.rawPrompt.trim();
    store.setRawPrompt(prompt ? `${prompt} @${e.name} ` : `@${e.name} `);
    referenceElement(e, { quiet: true });
    navigate('/');
    toast.success(`@${e.name} is in your prompt`, { description: 'Its images are attached as references.' });
  };

  const remove = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await deleteElement(confirm.id);
      toast.success(`Deleted @${confirm.name}`);
      setConfirm(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-5 px-4 pb-10 pt-5 sm:px-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] font-medium leading-tight">Elements</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Characters, products and logos you reuse. Type <span className="font-mono text-foreground">@Name</span> in any prompt to bring one in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-foreground px-4 text-[13px] font-semibold text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" /> New element
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="rounded-[16px] border border-border bg-card px-6 py-10 text-center">
            <p className="font-serif text-[22px]">Elements aren't set up yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">The elements table is missing. Run the elements migration, then reload.</p>
          </div>
        ) : elements.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border px-6 py-12">
            <div className="mx-auto flex max-w-[640px] flex-col items-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-primary/10 text-primary"><Boxes className="h-6 w-6" /></span>
              <h2 className="mt-4 font-serif text-[26px] leading-tight">Make something once, reuse it everywhere</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Save a character, product or logo with a few reference images and a name. Then write
                <span className="mx-1 font-mono text-foreground">@Peanut on a beach at sunset</span>
                and it comes along automatically.
              </p>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-foreground px-5 text-[13.5px] font-semibold text-background hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" /> Create your first element
              </button>
            </div>
            <div className="mx-auto mt-8 grid max-w-[860px] gap-3 sm:grid-cols-3">
              {IDEAS.map((i) => (
                <div key={i.name} className="rounded-[14px] border border-border bg-card p-4">
                  <p className="font-mono text-[13px] font-semibold">@{i.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{i.kind}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{i.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {elements.map((e) => (
              <ElementCard key={e.id} element={e} onUse={() => openInStudio(e)} onEdit={() => setEditing(e)} onDelete={() => setConfirm(e)} />
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border text-[13px] text-muted-foreground transition-smooth hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="h-5 w-5" /> New element
            </button>
          </div>
        )}
      </div>

      <ElementDialog open={creating} onOpenChange={setCreating} />
      <ElementDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} element={editing} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && !deleting && setConfirm(null)}>
        <AlertDialogContent className="max-w-[420px] rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete @{confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Prompts that mention @{confirm?.name} will no longer bring in its images. Your generations aren't affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-[13.5px] font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function ElementCard({ element: e, onUse, onEdit, onDelete }: { element: StudioElement; onUse: () => void; onEdit: () => void; onDelete: () => void }) {
  const kind = ELEMENT_KINDS.find((k) => k.id === e.kind)?.label ?? 'Other';
  const [cover, ...rest] = e.image_urls;
  return (
    <div className="group flex flex-col overflow-hidden rounded-[16px] border border-border bg-card transition-smooth hover:border-foreground/20 hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={cover} alt={e.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        {rest.length > 0 && (
          <div className="absolute bottom-2 left-2 flex -space-x-2">
            {rest.slice(0, 3).map((u) => (
              <img key={u} src={u} alt="" className="h-8 w-8 rounded-full border-2 border-card object-cover" />
            ))}
            {rest.length > 3 && <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-black/60 text-[11px] font-medium text-white">+{rest.length - 3}</span>}
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 touch:opacity-100">
          <button type="button" onClick={onEdit} aria-label={`Edit @${e.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onDelete} aria-label={`Delete @${e.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3">
        <div className="flex items-center gap-1.5">
          <AtSign className="h-3.5 w-3.5 text-primary" />
          <span className="truncate text-[15px] font-semibold">{e.name}</span>
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">{kind}</span>
        </div>
        <p className="line-clamp-2 min-h-[2.6em] text-[12.5px] leading-snug text-muted-foreground">{e.description || `${e.image_urls.length} reference image${e.image_urls.length === 1 ? '' : 's'}`}</p>
        <button
          type="button"
          onClick={onUse}
          className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-border text-[13px] font-medium hover:bg-secondary"
        >
          <Sparkles className="h-3.5 w-3.5" /> Use in Studio
        </button>
      </div>
    </div>
  );
}
