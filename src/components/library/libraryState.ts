import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DbGeneration } from '@/hooks/useGenerations';

export type Scope = { kind: 'all' } | { kind: 'unfiled' } | { kind: 'starred' } | { kind: 'folder'; id: string };
export type TypeFilter = 'all' | 'image' | 'video' | 'failed';
export type SortKey = 'newest' | 'oldest' | 'model';

export const TYPE_FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'failed', label: 'Failed' },
];

export function applyFilters(
  rows: DbGeneration[],
  { scope, type, query, sort, isStarred }: { scope: Scope; type: TypeFilter; query: string; sort: SortKey; isStarred: (id: string) => boolean },
): DbGeneration[] {
  const q = query.trim().toLowerCase();
  const out = rows.filter((g) => {
    if (scope.kind === 'unfiled' && g.folder_id) return false;
    if (scope.kind === 'starred' && !isStarred(g.id)) return false;
    if (scope.kind === 'folder' && g.folder_id !== scope.id) return false;
    if (type === 'image' && g.type !== 'image') return false;
    if (type === 'video' && g.type !== 'video') return false;
    if (type === 'failed' && g.status !== 'error') return false;
    return !q || `${g.user_prompt} ${g.final_prompt ?? ''} ${g.model}`.toLowerCase().includes(q);
  });
  if (sort === 'oldest') out.reverse();
  if (sort === 'model') out.sort((a, b) => a.model.localeCompare(b.model) || b.created_at.localeCompare(a.created_at));
  return out;
}

/**
 * Finder-style selection over an ordered list: click selects one, Cmd/Ctrl
 * toggles, Shift extends from the last clicked item. Drops ids that vanish.
 */
export function useSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);

  useEffect(() => {
    const live = new Set(orderedIds);
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [orderedIds]);

  const click = useCallback((id: string, e?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }, additive = false) => {
    setSelected((prev) => {
      if (e?.shiftKey && anchor.current) {
        const a = orderedIds.indexOf(anchor.current), b = orderedIds.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [from, to] = a < b ? [a, b] : [b, a];
          return new Set([...prev, ...orderedIds.slice(from, to + 1)]);
        }
      }
      anchor.current = id;
      if (additive || e?.metaKey || e?.ctrlKey) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, [orderedIds]);

  const api = useMemo(() => ({
    selected,
    ids: [...selected],
    count: selected.size,
    has: (id: string) => selected.has(id),
    click,
    toggle: (id: string) => click(id, undefined, true),
    selectAll: () => setSelected(new Set(orderedIds)),
    clear: () => { setSelected(new Set()); anchor.current = null; },
  }), [selected, click, orderedIds]);

  return api;
}
