import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WandSparkles } from 'lucide-react';
import { EDIT_CATEGORIES, PHOTO_EDITS, type PhotoEdit } from '@/config/photoEdits';
import { EditCover } from '@/components/presets/EditCover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { applyPhotoEdit } from './generationActions';
import { cn } from '@/lib/utils';

/**
 * Prompt-dock chip for photo edits and tools (headshot, change pose, upscale…).
 * Picking one keeps the attached photo, switches to the right model and writes
 * the instruction; edits with a blank show its options to pick from first.
 */
export function EditPicker({ chipClassName }: { chipClassName: string }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<PhotoEdit | null>(null);

  const run = (edit: PhotoEdit, choice?: string) => {
    applyPhotoEdit(edit, { choice });
    setAsking(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setAsking(null); }}>
      <PopoverTrigger className={chipClassName} title="Photo edits and tools: headshot, change pose, upscale…">
        <WandSparkles className="h-3.5 w-3.5" /> Edits
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[460px] max-w-[94vw] rounded-[16px] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-semibold">{asking ? asking.name : 'Edit a photo'}</span>
          {asking ? (
            <button type="button" onClick={() => setAsking(null)} className="text-[12px] text-muted-foreground hover:text-foreground">Back</button>
          ) : (
            <Link to="/presets?kind=edits" onClick={() => setOpen(false)} className="text-[12px] text-muted-foreground hover:text-foreground">
              Browse all
            </Link>
          )}
        </div>

        {asking?.choice ? (
          <div className="p-4">
            <p className="text-[12px] text-muted-foreground">{asking.choice.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {asking.choice.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => run(asking, o)}
                  className="rounded-full bg-muted px-3 py-1.5 text-[12.5px] text-foreground/90 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {o}
                </button>
              ))}
            </div>
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const v = new FormData(e.currentTarget).get('custom');
                if (typeof v === 'string' && v.trim()) run(asking, v);
              }}
            >
              <input
                name="custom"
                autoFocus
                placeholder={`Or type your own ${asking.choice.label.toLowerCase()} and press Enter`}
                className="h-9 w-full rounded-[10px] border border-border bg-transparent px-3 text-[13px] outline-none focus:border-foreground/30"
              />
            </form>
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto p-3">
            {EDIT_CATEGORIES.map((c) => (
              <section key={c.id} className="mb-3 last:mb-0">
                <p className="mb-1.5 px-0.5 text-[11.5px] font-medium text-muted-foreground">{c.label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {PHOTO_EDITS.filter((e) => e.category === c.id).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => (e.choice ? setAsking(e) : run(e))}
                      title={e.tagline}
                      className={cn(
                        'relative block aspect-square w-full overflow-hidden rounded-[10px] ring-offset-2 ring-offset-popover transition-shadow hover:ring-2 hover:ring-foreground/20',
                      )}
                    >
                      <EditCover edit={e} sizes="100px" className="absolute inset-0" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-5 text-left text-[11px] font-medium leading-tight text-white">
                        {e.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
