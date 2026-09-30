import { useCallback, useEffect, useRef, useState } from 'react';

/** Marquee in the scroll container's content coordinates. */
export interface MarqueeBox { left: number; top: number; width: number; height: number }

interface Options {
  /** The scrolling element that holds the tiles (marked with `data-tile-id`). */
  containerRef: React.RefObject<HTMLElement>;
  enabled: boolean;
  /** Ids currently selected, kept when the drag starts with Shift/Cmd/Ctrl. */
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

const THRESHOLD = 5; // px of movement before a press becomes a marquee
const EDGE = 48; // px from the top/bottom edge where the view auto-scrolls

/**
 * Click-and-drag rubber-band selection. Starts on empty space or on an
 * unselected tile; pressing a selected tile is left alone so it can still be
 * dragged into a folder.
 */
export function useMarqueeSelect({ containerRef, enabled, selectedIds, onSelect }: Options) {
  const [box, setBox] = useState<MarqueeBox | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!enabled || !el || e.button !== 0 || e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [data-no-marquee]')) return;
    const tile = target.closest<HTMLElement>('[data-tile-id]');
    if (tile?.getAttribute('aria-pressed') === 'true') return;
    // Ignore presses on the scrollbar.
    const bounds = el.getBoundingClientRect();
    if (e.clientX - bounds.left >= el.clientWidth) return;

    const toContent = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return { x: clientX - r.left + el.scrollLeft, y: clientY - r.top + el.scrollTop };
    };
    const start = toContent(e.clientX, e.clientY);
    const base = e.shiftKey || e.metaKey || e.ctrlKey ? selectedIds : [];
    let pointer = { x: e.clientX, y: e.clientY };
    let active = false;
    let frame = 0;
    // Layout doesn't change mid-drag, so measure every tile once in content coordinates.
    let tiles: Array<{ id: string; l: number; t: number; r: number; b: number }> = [];

    const update = () => {
      const cur = toContent(pointer.x, pointer.y);
      const l = Math.min(start.x, cur.x), t = Math.min(start.y, cur.y);
      const r = Math.max(start.x, cur.x), b = Math.max(start.y, cur.y);
      setBox({ left: l, top: t, width: r - l, height: b - t });
      const hit = tiles.filter((m) => m.l < r && m.r > l && m.t < b && m.b > t).map((m) => m.id);
      onSelect([...new Set([...base, ...hit])]);
    };

    const tick = () => {
      const r = el.getBoundingClientRect();
      const dy = pointer.y < r.top + EDGE ? -(r.top + EDGE - pointer.y) : pointer.y > r.bottom - EDGE ? pointer.y - (r.bottom - EDGE) : 0;
      if (dy) { el.scrollTop += Math.max(-24, Math.min(24, dy / 2)); update(); }
      frame = requestAnimationFrame(tick);
    };

    const onMove = (ev: PointerEvent) => {
      pointer = { x: ev.clientX, y: ev.clientY };
      if (!active) {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < THRESHOLD) return;
        active = true;
        const r = el.getBoundingClientRect();
        tiles = Array.from(el.querySelectorAll<HTMLElement>('[data-tile-id]')).map((node) => {
          const t = node.getBoundingClientRect();
          const x = t.left - r.left + el.scrollLeft, y = t.top - r.top + el.scrollTop;
          return { id: node.dataset.tileId!, l: x, t: y, r: x + t.width, b: y + t.height };
        });
        window.getSelection()?.removeAllRanges();
        document.body.style.userSelect = 'none';
        frame = requestAnimationFrame(tick);
      }
      update();
    };

    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', finish);
      cancelAnimationFrame(frame);
      document.body.style.userSelect = '';
      setBox(null);
      cleanup.current = null;
    };
    const onUp = () => {
      if (active) {
        // The click that follows a marquee must not open a tile or clear the selection.
        const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      }
      finish();
    };

    cleanup.current?.();
    cleanup.current = finish;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', finish);
  }, [containerRef, enabled, selectedIds, onSelect]);

  return { box, onPointerDown };
}
