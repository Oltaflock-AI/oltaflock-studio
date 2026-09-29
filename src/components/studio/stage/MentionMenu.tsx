import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { AtSign, Play, Plus } from 'lucide-react';
import { useGenerations, type DbGeneration } from '@/hooks/useGenerations';
import { useElements, type StudioElement } from '@/hooks/useElements';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { cn } from '@/lib/utils';
import { displayTitle } from './generationMeta';
import { referenceElement, referenceGeneration } from './generationActions';

const ELEMENT_LIMIT = 5;
const GENERATION_LIMIT = 8;

type Item = { type: 'element'; element: StudioElement } | { type: 'generation'; generation: DbGeneration };
const itemKey = (i: Item) => (i.type === 'element' ? `e:${i.element.id}` : `g:${i.generation.id}`);

/** The "@word" being typed just before the caret, if any. */
function activeMention(value: string, caret: number): { start: number; query: string } | null {
  const m = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null;
}

/**
 * "@" in the prompt: pick one of your elements (kept as "@Name", expanded at
 * generate time) or a past generation (attached as a reference).
 * Returns the menu to render plus a keydown handler for the textarea.
 */
export function useMentions(textareaRef: RefObject<HTMLTextAreaElement>, value: string, setValue: (v: string) => void) {
  const { generations } = useGenerations();
  const { elements } = useElements();
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [index, setIndex] = useState(0);
  // Esc closes the menu for this "@" until a new one is typed.
  const dismissedAt = useRef<number | null>(null);

  const pool = useMemo(
    () => generations.filter((g) => g.status === 'done' && g.output_url && !g.is_nsfw),
    [generations],
  );
  const search = useCallback((query: string): Item[] => {
    const q = query.toLowerCase();
    const els = (q ? elements.filter((e) => `${e.name} ${e.kind} ${e.description ?? ''}`.toLowerCase().includes(q)) : elements)
      .slice()
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, ELEMENT_LIMIT);
    const gens = (q ? pool.filter((g) => `${displayTitle(g)} ${g.user_prompt} ${g.model}`.toLowerCase().includes(q)) : pool)
      .slice(0, GENERATION_LIMIT);
    return [
      ...els.map((element) => ({ type: 'element' as const, element })),
      ...gens.map((generation) => ({ type: 'generation' as const, generation })),
    ];
  }, [elements, pool]);
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

  const pick = (item: Item, at = live() ?? mention) => {
    if (!at) return;
    const el = textareaRef.current;
    const text = el?.value ?? value;
    const end = at.start + 1 + at.query.length;
    // Elements stay in the prompt as "@Name"; a generation only leaves its attachment behind.
    const insert = item.type === 'element' ? `@${item.element.name} ` : '';
    const rest = item.type === 'element' ? text.slice(end).replace(/^ +/, '') : text.slice(end);
    const next = (text.slice(0, at.start) + insert + rest).replace(/ {2,}/g, ' ');
    const caret = at.start + insert.length;
    setValue(next);
    setMention(null);
    if (item.type === 'element') referenceElement(item.element);
    else referenceGeneration(item.generation);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
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
      const still = highlighted && current.find((c) => itemKey(c) === itemKey(highlighted));
      pick(still ?? current[0], at);
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

  const row = (item: Item, i: number) => {
    const on = i === index;
    const buttonProps = {
      type: 'button' as const,
      onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      onMouseEnter: () => setIndex(i),
      onClick: () => pick(item),
      className: cn('flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left', on && 'bg-secondary'),
    };
    if (item.type === 'element') {
      const e = item.element;
      return (
        <li key={itemKey(item)} role="option" aria-selected={on}>
          <button {...buttonProps}>
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/25">
              <img src={e.image_urls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold">@{e.name}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">
                <span className="capitalize">{e.kind}</span> · {e.image_urls.length} image{e.image_urls.length === 1 ? '' : 's'}{e.description ? ` · ${e.description}` : ''}
              </span>
            </span>
          </button>
        </li>
      );
    }
    const g = item.generation;
    return (
      <li key={itemKey(item)} role="option" aria-selected={on}>
        <button {...buttonProps}>
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
    );
  };

  const elementRows = matches.filter((m) => m.type === 'element');
  const generationRows = matches.filter((m) => m.type === 'generation');
  const heading = (text: string) => (
    <li role="presentation" className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{text}</li>
  );

  const menu = mention ? (
    <div
      role="listbox"
      aria-label="Reference an element or generation"
      className="absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-[16px] border border-border bg-popover text-popover-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2 text-[11.5px] text-muted-foreground">
        <AtSign className="h-3.5 w-3.5 text-primary" />
        {mention.query ? <>Matching <span className="font-medium text-foreground">“{mention.query}”</span></> : 'Reference an element or a past generation'}
        <span className="ml-auto hidden font-mono text-[10.5px] sm:inline">↑↓ · ↵ to add · esc</span>
      </div>
      {matches.length === 0 ? (
        <p className="px-3.5 py-4 text-[13px] text-muted-foreground">
          {pool.length || elements.length ? 'Nothing matches.' : 'Nothing generated yet.'}
        </p>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto p-1.5">
          {elementRows.length > 0 && heading('Elements')}
          {elementRows.map((item) => row(item, matches.indexOf(item)))}
          {generationRows.length > 0 && heading('Your generations')}
          {generationRows.map((item) => row(item, matches.indexOf(item)))}
        </ul>
      )}
      <Link
        to="/elements"
        onMouseDown={(e) => e.preventDefault()}
        className="flex items-center gap-1.5 border-t border-border px-3.5 py-2 text-[12px] text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> {elements.length ? 'Manage elements' : 'Create an element to reuse a character, product or logo'}
      </Link>
    </div>
  ) : null;

  const close = () => setMention(null);
  return { menu, onKeyDown, close };
}
