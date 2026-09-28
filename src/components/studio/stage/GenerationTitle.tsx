import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { DbGeneration } from '@/hooks/useGenerations';
import { useGenerationTitles } from '@/hooks/useGenerationTitles';
import { cn } from '@/lib/utils';
import { displayTitle } from './generationMeta';

interface Props {
  g: DbGeneration;
  className?: string;
  inputClassName?: string;
  /** Controlled edit mode (e.g. F2 in the Organize list). */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Show the pencil affordance on hover. */
  showPencil?: boolean;
  /** Wrap long names over two lines instead of truncating. */
  wrap?: boolean;
}

/** A generation's name that turns into an input to rename it. Enter saves, Esc cancels. */
export function GenerationTitle({ g, className, inputClassName, editing: controlled, onEditingChange, showPencil = true, wrap = false }: Props) {
  const { rename } = useGenerationTitles();
  const [own, setOwn] = useState(false);
  const editing = controlled ?? own;
  const setEditing = (v: boolean) => (onEditingChange ? onEditingChange(v) : setOwn(v));
  const inputRef = useRef<HTMLInputElement>(null);
  const name = displayTitle(g);

  const save = async () => {
    const next = (inputRef.current?.value ?? '').trim();
    setEditing(false);
    if (next === (g.title ?? name)) return;
    try {
      await rename(g.id, next);
      if (next) toast.success(`Renamed to “${next}”`);
    } catch {
      toast.error('Could not rename. Try again.');
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        defaultValue={g.title ?? name}
        maxLength={120}
        aria-label="Name"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={save}
        className={cn('w-full min-w-0 rounded-[7px] border border-primary/60 bg-card px-1.5 outline-none ring-[3px] ring-primary/15', inputClassName)}
      />
    );
  }

  return (
    <span className={cn('group/title inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      <span className={wrap ? 'line-clamp-2' : 'truncate'} title={name}>{name}</span>
      {showPencil && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          aria-label="Rename"
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/title:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
