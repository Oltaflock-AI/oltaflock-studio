import { useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DbGeneration } from '@/hooks/useGenerations';
import type { BrandJob } from '@/brands';
import { captionText, useBrandCopy } from '@/brands/useBrandCopy';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied', { duration: 1200 });
  } catch {
    toast.error('Could not copy');
  }
}

/** A ready-to-post caption, hashtags and alt text for a finished social result. */
export function CaptionDialog({ generation, job, open, onOpenChange }: {
  generation: DbGeneration;
  job?: BrandJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const copy = useBrandCopy();
  const p = (generation.model_params ?? {}) as Record<string, unknown>;
  const write = () => copy.mutate({
    kind: 'caption',
    jobId: job?.id ?? '',
    productId: typeof p.product_id === 'string' ? p.product_id : undefined,
    brief: {
      result: String(p.shot_label ?? generation.title ?? ''),
      ...(typeof p.brief === 'object' && p.brief ? (p.brief as Record<string, string>) : {}),
    },
  });

  // Write as soon as it opens; reopening keeps the last caption.
  useEffect(() => {
    if (open && !copy.data && !copy.isPending) write();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const data = copy.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[18px]">
        <DialogTitle className="text-[18px] font-semibold">Caption</DialogTitle>
        <DialogDescription className="text-[13px]">Written in the brand voice from this job's brief. Edit freely before posting.</DialogDescription>
        {generation.output_url && generation.type === 'image' && (
          <img src={generation.output_url} alt="" className="max-h-[220px] w-full rounded-[12px] bg-muted object-contain" />
        )}
        {copy.isPending && !data && (
          <div className="flex items-center gap-2 py-6 text-[13px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Writing…</div>
        )}
        {copy.isError && !data && <p className="text-[13px] text-destructive">{copy.error instanceof Error ? copy.error.message : 'Could not write a caption'}</p>}
        {data && (
          <div className="flex flex-col gap-3">
            <section className="rounded-[12px] bg-muted/60 p-3">
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{data.caption}</p>
              <p className="mt-2 text-[12.5px] text-primary">{data.hashtags.map((h) => `#${h}`).join(' ')}</p>
            </section>
            <section>
              <p className="text-[12px] font-medium text-muted-foreground">Alt text</p>
              <p className="text-[12.5px]">{data.alt_text}</p>
            </section>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={write} disabled={copy.isPending} className="h-9 gap-1.5 rounded-[10px]">
            {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Another version
          </Button>
          <Button onClick={() => data && copyText(captionText(data))} disabled={!data} className="h-9 gap-1.5 rounded-[10px]">
            <Copy className="h-4 w-4" /> Copy caption + hashtags
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
