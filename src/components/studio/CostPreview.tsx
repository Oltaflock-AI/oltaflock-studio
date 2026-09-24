import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertTriangle } from 'lucide-react';
import { usePricing } from '@/hooks/usePricing';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';

/** Compact cost chip: credits for the current settings, red when balance is short. */
export function CostPreview() {
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
