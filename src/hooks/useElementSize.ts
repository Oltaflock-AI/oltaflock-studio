import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The element's current layout size in CSS pixels (border box, ignoring transforms such as
 * entry animations), tracked with a ResizeObserver. 0 until measured.
 */
export function useElementSize(ref: RefObject<HTMLElement>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth, height = el.offsetHeight;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
