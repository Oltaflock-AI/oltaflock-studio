import { useState } from 'react';
import { AtSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { MediaUpload } from '@/components/studio/MediaUpload';
import { ReferencePicker } from '@/components/studio/ReferencePicker';
import { ELEMENT_KINDS, ELEMENT_NAME, useElements, type ElementKind, type StudioElement } from '@/hooks/useElements';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 8;

const DESCRIPTION_HINT: Record<ElementKind, string> = {
  character: 'e.g. small beige pug with a red collar and a white patch on the chest',
  product: 'e.g. matte red chip bag, gold logo top-centre, jalapeño on the front',
  logo: 'e.g. white wordmark in rounded sans-serif, keep it crisp and unchanged',
  place: 'e.g. sunlit café with terracotta tiles and a long wooden counter',
  style: 'e.g. soft film grain, warm pastels, lots of negative space',
  other: 'What should the model keep consistent every time?',
};

interface ElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this element; create a new one when omitted. */
  element?: StudioElement | null;
  /** Prefill images, e.g. when creating an element from a generation. */
  initialImages?: string[];
  /** Prefill the rest of a new element, e.g. a brand product's name and description. */
  initialValues?: { name?: string; kind?: ElementKind; description?: string };
  onSaved?: (element: { name: string }) => void;
}

export function ElementDialog(props: ElementDialogProps) {
  // Remount per open so the form starts from the element (or blank) each time.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <ElementForm {...props} />}
    </Dialog>
  );
}

function ElementForm({ onOpenChange, element, initialImages, initialValues, onSaved }: ElementDialogProps) {
  const { createElement, updateElement, isSaving } = useElements();
  const [name, setName] = useState(element?.name ?? initialValues?.name ?? '');
  const [kind, setKind] = useState<ElementKind>(element?.kind ?? initialValues?.kind ?? 'character');
  const [description, setDescription] = useState(element?.description ?? initialValues?.description ?? '');
  const [images, setImages] = useState<string[]>(element?.image_urls ?? initialImages ?? []);
  const [touched, setTouched] = useState(false);

  const nameError = !name
    ? 'Give it a name'
    : !ELEMENT_NAME.test(name)
      ? 'One word: letters, numbers, - or _ (e.g. CrunchyBag)'
      : null;
  const imageError = images.length === 0 ? 'Add at least one image' : null;

  const save = async () => {
    setTouched(true);
    if (nameError || imageError) return;
    const input = { name, kind, description: description.trim() || null, image_urls: images };
    try {
      if (element) await updateElement({ id: element.id, ...input });
      else await createElement(input);
      toast.success(element ? `Saved @${name}` : `Created @${name}`, { description: 'Type @ in any prompt to use it.' });
      onSaved?.({ name });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  };

  return (
    <DialogContent className="flex max-h-[90vh] w-[min(640px,94vw)] max-w-none flex-col gap-0 overflow-hidden rounded-[20px] p-0">
      <div className="border-b border-border px-6 pb-4 pt-5 pr-12">
        <DialogTitle className="text-[18px] font-semibold">{element ? `Edit @${element.name}` : 'New element'}</DialogTitle>
        <DialogDescription className="mt-1 text-[13px]">
          Something you reuse: a character, a product, a logo. Type <span className="font-mono text-foreground">@{name || 'Name'}</span> in a prompt and its images come along as references.
        </DialogDescription>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label className="text-[13px] font-medium">Reference images</label>
            <span className="font-mono text-[11px] text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
          </div>
          <MediaUpload kind="image" maxFiles={MAX_IMAGES} value={images} onChange={setImages} maxSizeMB={10} />
          <ReferencePicker kind="image" max={MAX_IMAGES} value={images} onChange={setImages} />
          <p className="text-[12px] text-muted-foreground">A few clear angles work best: front, side, close-up.</p>
          {touched && imageError && <p className="text-[12px] text-destructive">{imageError}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="element-name" className="text-[13px] font-medium">Name</label>
          <div className={cn(
            'flex h-10 items-center rounded-[10px] border bg-card px-3 focus-within:ring-[3px]',
            touched && nameError ? 'border-destructive focus-within:ring-destructive/15' : 'border-border focus-within:border-primary/60 focus-within:ring-primary/15',
          )}>
            <AtSign className="h-4 w-4 text-muted-foreground" />
            <input
              id="element-name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/\s+/g, ''))}
              placeholder="Peanut"
              maxLength={40}
              autoFocus={!element}
              className="w-full bg-transparent pl-1 text-[14px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
            />
          </div>
          {touched && nameError && <p className="text-[12px] text-destructive">{nameError}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {ELEMENT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  'h-8 rounded-full border px-3 text-[12.5px] transition-smooth',
                  kind === k.id ? 'border-foreground bg-foreground font-medium text-background' : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="element-description" className="text-[13px] font-medium">
            Description <span className="font-normal text-muted-foreground">· optional, added to the prompt</span>
          </label>
          <textarea
            id="element-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={DESCRIPTION_HINT[kind]}
            className="w-full resize-none rounded-[10px] border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-[3px] focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-3.5">
        <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-[11px] px-4 text-[13.5px] text-muted-foreground hover:bg-secondary hover:text-foreground">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-foreground px-5 text-[13.5px] font-semibold text-background hover:bg-foreground/90 disabled:opacity-70"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {element ? 'Save' : 'Create element'}
        </button>
      </div>
    </DialogContent>
  );
}
