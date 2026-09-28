import { toast } from 'sonner';
import type { DbGeneration } from '@/hooks/useGenerations';
import { supabase } from '@/integrations/supabase/client';
import { fileSlug } from '@/components/studio/stage/generationMeta';

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

/** Straight from the file's host; fails when the host sends no CORS headers. */
async function fetchDirect(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/** Through the `download` edge function, which streams the user's own output. */
async function fetchViaProxy(generationId: string): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ generationId }),
  });
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  return res.blob();
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(href); a.remove(); }, 1000);
}

/**
 * Saves a generation's output to disk, named after its title (or a name from
 * the prompt). Never navigates away: if the file can't be fetched, it says so
 * and offers to open it. `quiet` skips the toasts, for bulk downloads.
 */
export async function downloadGeneration(
  generation: Pick<DbGeneration, 'id' | 'output_url' | 'user_prompt' | 'type' | 'title'>,
  { quiet = false }: { quiet?: boolean } = {},
) {
  const url = generation.output_url;
  if (!url) return;
  const toastId = quiet ? undefined : toast.loading('Downloading…');

  let blob: Blob;
  try {
    blob = await fetchDirect(url).catch(() => fetchViaProxy(generation.id));
  } catch (e) {
    console.error('Download failed:', e);
    if (!quiet) {
      toast.error('Could not download this file', {
        id: toastId,
        description: 'The provider link may have expired.',
        action: { label: 'Open file', onClick: () => window.open(url, '_blank', 'noopener,noreferrer') },
      });
    }
    return;
  }

  const fallbackExt = generation.type === 'video' ? 'mp4' : 'png';
  const ext = EXT_BY_TYPE[blob.type.split(';')[0]] ?? fallbackExt;
  const filename = `${fileSlug(generation as DbGeneration)}.${ext}`;
  saveBlob(blob, filename);
  if (!quiet) toast.success(`Saved as ${filename}`, { id: toastId });
}
