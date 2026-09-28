import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AtSign, Play } from 'lucide-react';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { cn } from '@/lib/utils';
import { displayTitle } from './generationMeta';
import { referenceGeneration } from './generationActions';

const LIMIT = 8;

/** The "@word" being typed just before the caret, if any. */
function activeMention(value: string, caret: number): { start: number; query: string } | null {
  const m = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null;
}

/**
 * "@" in the prompt: pick one of your generations to use as a reference.
 * Returns the menu to render plus a keydown handler for the textarea.
 */
export function useMentions(textareaRef: RefObject<HTMLTextAreaElement>, value: string, setValue: (v: string) => void) {
  const { generations } = useGenerations();
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [index, setIndex] = useState(0);
  // Esc closes the menu for this "@" until a new one is typed.
  const dismissedAt = useRef<number | null>(null);

  const pool = useMemo(
    () => generations.filter((g) => g.status === 'done' && g.output_url && !g.is_nsfw),
    [generations],
  );
  const search = useCallback((query: string) => {
    const q = query.toLowerCase();
    return (q ? pool.filter((g) => `${displayTitle(g)} ${g.user_prompt} ${g.model}`.toLowerCase().includes(q)) : pool).slice(0, LIMIT);
  }, [pool]);
  const matches = useMemo(() => (mention ? search(mention.query) : []), [mention, search]);

  /** The "@word" as it is in the textarea right now (state can trail fast typing). */
  const live = () => {
    const el = textareaRef.current;
    return el ? activeMention(el.value, el.selectionStart ?? el.value.length) : null;
  };

  // Re-read the "@word" whenever the text changes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || document.activeElement !== el) return;
    const at = live();
    if (at?.start !== dismissedAt.current) dismissedAt.current = null;
    setMention(at && dismissedAt.current === null ? at : null);
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pick = (g: DbGeneration, at = live() ?? mention) => {
    if (!at) return;
    const el = textareaRef.current;
    const text = el?.value ?? value;
    const end = at.start + 1 + at.query.length;
    const next = (text.slice(0, at.start) + text.slice(end)).replace(/ {2,}/g, ' ');
    setValue(next);
    setMention(null);
    referenceGeneration(g);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at.start, at.start);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const at = live();
    if (!at || dismissedAt.current === at.start) return false;
    const current = search(at.query);
    if (current.length === 0) return false;
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Keep the highlighted row only if it's still in the up-to-date results.
      const highlighted = matches[index];
      pick(highlighted && current.includes(highlighted) ? highlighted : current[0], at);
      return true;
    }
    if (!mention) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissedAt.current = at.start;
      setMention(null);
      return true;
    }
    return false;
  };

  const menu = mention ? (
    <div
      role="listbox"
      aria-label="Reference a generation"
      className="absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-[16px] border border-border bg-popover text-popover-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2 text-[11.5px] text-muted-foreground">
        <AtSign className="h-3.5 w-3.5 text-primary" />
        {mention.query ? <>Generations matching <span className="font-medium text-foreground">“{mention.query}”</span></> : 'Reference one of your generations'}
        <span className="ml-auto hidden font-mono text-[10.5px] sm:inline">↑↓ · ↵ to add · esc</span>
      </div>
      {matches.length === 0 ? (
        <p className="px-3.5 py-4 text-[13px] text-muted-foreground">{pool.length ? 'No generations match.' : 'Nothing generated yet.'}</p>
      ) : (
        <ul className="max-h-[320px] overflow-y-auto p-1.5">
          {matches.map((g, i) => (
            <li key={g.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setIndex(i)}
                onClick={() => pick(g)}
                className={cn('flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left', i === index && 'bg-secondary')}
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-muted">
                  {g.type === 'video' ? (
                    <>
                      <video src={`${g.output_url}#t=1`} muted preload="metadata" className="h-full w-full object-cover" />
                      <Play className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 fill-white text-white" />
                    </>
                  ) : (
                    <img src={g.output_url!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{displayTitle(g)}</span>
                  <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <ModelBadge modelId={g.model} size="sm" />
                    <span className="truncate">{g.model} · {formatDistanceToNowStrict(new Date(g.created_at), { addSuffix: true })}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null;

  const close = () => setMention(null);
  return { menu, onKeyDown, close };
}
