import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Brief } from '@brand/types.ts';

export interface BrandCopy {
  headlines: string[];
  caption: string;
  hashtags: string[];
  alt_text: string;
}

interface CopyRequest {
  kind: 'headlines' | 'caption';
  jobId: string;
  brief: Brief;
  productId?: string;
}

/** Copy in the brand voice from the brand-copy function: headline options or a ready-to-post caption. */
export function useBrandCopy() {
  return useMutation({
    mutationFn: async ({ kind, jobId, brief, productId }: CopyRequest): Promise<BrandCopy> => {
      const text = Object.fromEntries(Object.entries(brief).filter(([, v]) => typeof v === 'string'));
      const { data, error } = await supabase.functions.invoke<BrandCopy & { error?: string }>('brand-copy', {
        body: { kind, job_id: jobId, brief: text, product_id: productId },
      });
      if (error || !data || data.error) {
        const context = (error as { context?: Response } | null)?.context;
        const detail = data?.error ?? (context ? (await context.json().catch(() => null))?.error : null);
        throw new Error(detail ?? 'The copywriter is unavailable right now');
      }
      return data;
    },
  });
}

/** Caption plus hashtags, ready to paste into Instagram. */
export const captionText = (c: BrandCopy) => `${c.caption.trim()}\n\n${c.hashtags.map((h) => `#${h}`).join(' ')}`;
