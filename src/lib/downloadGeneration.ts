import { toast } from 'sonner';
import type { DbGeneration } from '@/hooks/useGenerations';
import { fileSlug } from '@/components/studio/stage/generationMeta';

/**
 * Downloads a generation's output named after its title (or a name derived
 * from the prompt), falling back to opening the file in a new tab when the
 * fetch is blocked. `quiet` skips the toasts, for bulk downloads.
 */
export async function downloadGeneration(
  generation: Pick<DbGeneration, 'output_url' | 'user_prompt' | 'type' | 'title'>,
  { quiet = false }: { quiet?: boolean } = {},
) {
  const url = generation.output_url;
  if (!url) return;

  const ext = generation.type === 'video' ? 'mp4' : 'png';
  const filename = `${fileSlug(generation as DbGeneration)}.${ext}`;

  try {
    if (!quiet) toast.info('Downloading...');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const originalBlob = await response.blob();
    const mimeType = ext === 'png' ? 'image/png' : 'video/mp4';
    const blob = new Blob([originalBlob], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    }, 1000);
    if (!quiet) toast.success(`Saved as ${filename}`);
  } catch (e) {
    console.error('Download failed:', e);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info('Opened in new tab');
  }
}
