import { toast } from 'sonner';
import type { DbGeneration } from '@/hooks/useGenerations';

/**
 * Downloads a generation's output with a filename derived from its prompt.
 * Mirrors the Studio OutputDisplay download behaviour (blob download, falling
 * back to opening the file in a new tab when the fetch is blocked).
 */
export async function downloadGeneration(generation: Pick<DbGeneration, 'output_url' | 'user_prompt' | 'type'>) {
  const url = generation.output_url;
  if (!url) return;

  const words = (generation.user_prompt || '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((w) => w.length > 0);
  const promptSlug = words.length > 0 ? words.join('-').toLowerCase().slice(0, 60) : 'output';
  const ext = generation.type === 'video' ? 'mp4' : 'png';
  const filename = `oltaflock_${promptSlug}.${ext}`;

  try {
    toast.info('Downloading...');
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
    toast.success(`Saved as ${filename}`);
  } catch (e) {
    console.error('Download failed:', e);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info('Opened in new tab');
  }
}
