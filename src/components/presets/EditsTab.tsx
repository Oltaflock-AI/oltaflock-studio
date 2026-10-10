import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, Sparkles, X } from 'lucide-react';
import { EDIT_CATEGORIES, PHOTO_EDITS, editPrompt, getEdit, type EditCategory, type PhotoEdit } from '@/config/photoEdits';
import { usePreferencesStore } from '@/store/preferencesStore';
import { applyPhotoEdit, editSpec } from '@/components/studio/stage/generationActions';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditCover } from './EditCover';
import { cn } from '@/lib/utils';

type Filter = EditCategory | 'all';

function matches(e: PhotoEdit, q: string) {
  if (!q) return true;
  const label = EDIT_CATEGORIES.find((c) => c.id === e.category)?.label ?? '';
  const hay = [e.name, e.tagline, label, ...e.notes, ...(e.choice?.options ?? [])].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/**
 * Presets → Photo edits: one-click recipes for a photo the user brings
 * (headshot, GTA, change pose…) and quick tools (upscale, remove background).
 * Picking one sets up the Studio; the user adds their photo and generates.
 */
export function EditsTab({ tabs }: { tabs: React.ReactNode }) {
  const navigate = useNavigate();
  const recents = usePreferencesStore((s) => s.recentEdits);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => PHOTO_EDITS.filter((e) => matches(e, q) && (filter === 'all' || e.category === filter)),
    [q, filter],
  );
  const grouped = filter === 'all' && !q;
  const recent = recents.map(getEdit).filter((e): e is PhotoEdit => !!e);
  const open = getEdit(openId);

  const use = (edit: PhotoEdit, choice?: string) => {
    // Go first so the toast knows we're in the Studio and skips its "Open Studio" button.
    navigate('/create');
    applyPhotoEdit(edit, { choice });
  };

  const card = (e: PhotoEdit) => (
    <EditCard key={e.id} edit={e} onOpen={() => setOpenId(e.id)} onUse={() => use(e)} />
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {tabs}
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headshot, upscale, GTA…"
            aria-label="Search photo edits"
            className="h-9 rounded-[10px] pl-9 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="-mt-1 text-[12.5px] text-muted-foreground">
        Bring a photo, pick what to do with it. The Studio is set up with the right model and instructions; you add the photo and press Generate.
        You can also run these from the <span className="font-medium text-foreground">Edit</span> button on any image you've made.
      </p>

      {grouped && recent.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><Clock className="h-3.5 w-3.5" /> Recently used</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setOpenId(e.id)}
                className="inline-flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-[12.5px] hover:border-foreground/25"
              >
                <EditCover edit={e} className="h-6 w-6 rounded-full" />
                {e.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-5 sm:px-5" role="group" aria-label="Filter photo edits">
        {[{ id: 'all' as const, label: 'All' }, ...EDIT_CATEGORIES].map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilter(p.id)}
              aria-pressed={on}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-[15px] py-2 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                on ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border py-14 text-center">
          <p className="text-[14px] font-medium">No edits match</p>
          <p className="max-w-[340px] text-[12.5px] text-muted-foreground">Try another word, or clear the filters.</p>
          <Button variant="outline" size="sm" className="mt-2 rounded-[9px]" onClick={() => { setQuery(''); setFilter('all'); }}>
            Show all edits
          </Button>
        </div>
      ) : grouped ? (
        EDIT_CATEGORIES.map((c) => (
          <section key={c.id} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 text-[13px] font-semibold">
              {c.label}
              <span className="font-normal text-muted-foreground">{c.blurb}</span>
            </h2>
            <Grid>{PHOTO_EDITS.filter((e) => e.category === c.id).map(card)}</Grid>
          </section>
        ))
      ) : (
        <Grid>{shown.map(card)}</Grid>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <EditPreview key={open.id} edit={open} onUse={(choice) => use(open, choice)} />}
      </Dialog>
    </>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{children}</div>;
}

function EditCard({ edit, onOpen, onUse }: { edit: PhotoEdit; onOpen: () => void; onUse: () => void }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[15px] border border-border bg-card transition-smooth hover:border-foreground/20">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${edit.name}`}
        className="absolute inset-0 z-[1] rounded-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <EditCover edit={edit} sizes="(min-width: 1024px) 22vw, 45vw" className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.035]" />
        {edit.isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">New</span>
        )}
        <button
          type="button"
          onClick={onUse}
          className={cn(
            'absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-black shadow-sm backdrop-blur',
            'opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 touch:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Sparkles className="h-3 w-3" /> Use
        </button>
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2.5">
        <span className="font-serif text-[19px] leading-tight">{edit.name}</span>
        <span className="line-clamp-1 text-[12px] text-muted-foreground">{edit.tagline}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {edit.notes.slice(0, 3).map((n) => (
            <span key={n} className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Large view of an edit: pick its blank (expression, pose…), see the instruction, use it. */
function EditPreview({ edit, onUse }: { edit: PhotoEdit; onUse: (choice?: string) => void }) {
  const [choice, setChoice] = useState(edit.choice?.options[0] ?? '');
  const spec = editSpec(edit);
  const category = EDIT_CATEGORIES.find((c) => c.id === edit.category)?.label;

  return (
    <DialogContent className="max-h-[92vh] w-[min(980px,94vw)] max-w-none gap-0 overflow-hidden rounded-[20px] p-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <EditCover edit={edit} sizes="480px" className="aspect-[4/5] w-full md:aspect-auto md:min-h-[560px]" />

      <div className="flex max-h-[92vh] flex-col overflow-y-auto p-6 sm:p-7">
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Photo edit · {category}</span>
        <DialogTitle className="mt-1 font-serif text-[34px] font-normal leading-[1.05]">{edit.name}</DialogTitle>
        <DialogDescription className="mt-2 text-[14px] text-muted-foreground">{edit.tagline}</DialogDescription>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {edit.notes.map((n) => (
            <span key={n} className="rounded-full border border-border px-2.5 py-1 text-[12px]">{n}</span>
          ))}
          {spec && <span className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground">Runs on {spec.name}</span>}
        </div>

        {edit.choice && (
          <div className="mt-6">
            <p className="text-[12px] font-medium text-muted-foreground">{edit.choice.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {edit.choice.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setChoice(o)}
                  aria-pressed={choice === o}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[12.5px] transition-colors',
                    choice === o ? 'bg-primary font-medium text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            <Input
              value={edit.choice.options.includes(choice) ? '' : choice}
              onChange={(e) => setChoice(e.target.value || edit.choice!.options[0])}
              placeholder={`Or type your own ${edit.choice.label.toLowerCase()}…`}
              className="mt-2 h-9 rounded-[10px]"
            />
          </div>
        )}

        {edit.prompt ? (
          <div className="mt-6">
            <p className="text-[12px] font-medium text-muted-foreground">Instruction sent with your photo (you can edit it in the Studio)</p>
            <p className="mt-1.5 max-h-[180px] overflow-y-auto rounded-[12px] bg-muted/60 p-3 text-[12.5px] leading-relaxed">{editPrompt(edit, choice)}</p>
          </div>
        ) : (
          <p className="mt-6 text-[13px] text-muted-foreground">No prompt needed. Add your image and generate.</p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button onClick={() => onUse(choice)} className="h-10 gap-1.5 rounded-[11px] px-5 font-semibold">
            <Sparkles className="h-4 w-4" /> Use this edit
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
