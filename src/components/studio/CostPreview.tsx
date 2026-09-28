import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertTriangle, Loader2 } from 'lucide-react';
import { getSpec } from '@catalog/index.ts';
import { useGenerationStore } from '@/store/generationStore';
import { useHiggsfieldEstimate } from '@/hooks/useHiggsfield';
import { usePricing } from '@/hooks/usePricing';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';

/** Compact cost chip: credits for the current settings, red when balance is short. */
export function CostPreview() {
  const selectedModel = useGenerationStore((s) => s.selectedModel);
  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  if (spec?.api === 'higgsfield') return <HiggsfieldCost />;
  return <KieCost />;
}

/** Live quote from Higgsfield's /estimate for the exact settings. */
function HiggsfieldCost() {
  const { selectedModel, rawPrompt, controls } = useGenerationStore();
  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  const { data, isFetching } = useHiggsfieldEstimate(spec, rawPrompt, controls);

  return (
    <div
      className="flex items-center gap-1.5 text-[12.5px] tabular-nums text-muted-foreground"
      title="Quoted by Higgsfield for these settings. Failed or moderated requests aren't charged."
    >
      {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
      {data?.description ? (
        <span className="cursor-help underline decoration-dotted underline-offset-2" title={data.description}>
          Metered pricing
        </span>
      ) : data ? (
        <>
          <span className="font-semibold text-foreground">${data.usd!.toFixed(3)}</span>
          {data.listUsd !== undefined && <span className="line-through opacity-60">${data.listUsd.toFixed(3)}</span>}
          <span>· {data.credits} HF cr</span>
        </>
      ) : (
        <span>{isFetching ? 'Pricing…' : 'Price after inputs'}</span>
      )}
    </div>
  );
}

function KieCost() {
  const { hasPrice, formattedCredits, credits } = usePricing();
  const { balance } = useUserCredits();

  if (!hasPrice) return null;

  const short = balance !== null && credits > 0 && balance < credits;

  return (
    <div
      className={cn('flex items-center gap-1.5 text-[12.5px] tabular-nums', short ? 'text-destructive' : 'text-muted-foreground')}
      title={balance !== null ? `${balance.toFixed(1)} credits left` : undefined}
    >
      {short ? <AlertTriangle className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
      <AnimatePresence mode="wait">
        <motion.span
          key={formattedCredits}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={{ duration: 0.15 }}
          className="font-semibold text-foreground"
        >
          {formattedCredits}
        </motion.span>
      </AnimatePresence>
      credits{short && ' · not enough'}
    </div>
  );
}
