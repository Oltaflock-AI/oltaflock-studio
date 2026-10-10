import { useEffect, useRef, useState } from 'react';
import { host } from './bridge';

/** A generation as the server's generationView returns it. */
export interface Generation {
  id: string;
  title: string | null;
  type: 'image' | 'video';
  model: string;
  model_id: string | null;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number | null;
  output_url: string | null;
  error: string | null;
  prompt: string;
  folder_id: string | null;
  rating: number | null;
  credits: number | null;
  created_at: string;
  studio_url: string;
  starred?: boolean;
}

export interface Folder { id: string; name: string; color?: string | null }
export interface Element { id: string; name: string; kind: string; description: string | null; image_urls: string[] }
export interface ModelSummary {
  id: string; name: string; provider: string; mode: string; output: 'image' | 'video';
  best_for: string; price: string; featured: boolean; is_new: boolean; audio: boolean;
}

export const isPending = (g: Generation) => g.status === 'queued' || g.status === 'running';

const CDN = 'https://studio-cdn.promunch.in/';
/** Resized JPEG from the storage Worker for images in our bucket; the original otherwise. */
export function previewUrl(url: string | null, width: number): string {
  if (!url) return '';
  return url.startsWith(CDN) ? `https://studio-storage.promunch.in/preview/${url.slice(CDN.length)}?w=${width}` : url;
}

export const titleOf = (g: Pick<Generation, 'title' | 'prompt'>) => g.title?.trim() || g.prompt?.trim().slice(0, 60) || 'Untitled';

export function fileNameOf(g: Generation) {
  const ext = g.output_url?.split('?')[0].split('.').pop() || (g.type === 'video' ? 'mp4' : 'png');
  return `${titleOf(g).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'promunch'}.${ext}`;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Keeps unfinished generations fresh by polling studio_get_generations. */
export function usePolling(items: Generation[], onUpdate: (fresh: Generation[]) => void, everyMs = 5000) {
  const pendingIds = items.filter(isPending).map((g) => g.id).join(',');
  const update = useRef(onUpdate);
  update.current = onUpdate;
  useEffect(() => {
    if (!pendingIds || !host.canCallTools) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const res = await host.callTool<{ generations: Generation[] }>('studio_get_generations', { ids: pendingIds.split(','), wait_seconds: 0 });
        if (!stopped && res.generations?.length) update.current(res.generations);
      } catch { /* try again next tick */ }
    }, everyMs);
    return () => { stopped = true; clearInterval(timer); };
  }, [pendingIds, everyMs]);
}

/** Replaces items in `list` by id with any fresher copies. */
export function merge(list: Generation[], fresh: Generation[]): Generation[] {
  const byId = new Map(fresh.map((g) => [g.id, g]));
  return list.map((g) => byId.get(g.id) ?? g);
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Reads a File as base64 without the data: prefix. */
export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]+,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
