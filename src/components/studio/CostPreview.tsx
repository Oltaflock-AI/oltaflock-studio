import { usePricing } from '@/hooks/usePricing';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Coins, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CostPreview() {
  const { hasPrice, formattedCredits, credits } = usePricing();
  const { balance } = useUserCredits();

  if (!hasPrice) return null;

  const insufficientCredits = balance !== null && credits > 0 && balance < credits;

  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 px-3 rounded-lg",
      "bg-muted/30 border border-border/50",
      insufficientCredits && "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex items-center gap-2">
        {insufficientCredits ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className={cn(
          "text-xs font-medium uppercase tracking-wide",
          insufficientCredits ? "text-destructive" : "text-muted-foreground"
        )}>
          {insufficientCredits ? 'Insufficient Credits' : 'Estimated Cost'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          insufficientCredits && "text-destructive"
        )}>
          {formattedCredits}
        </span>
        <span className="text-xs text-muted-foreground">credits</span>
        {balance !== null && (
          <>
            <span className="text-xs text-muted-foreground/60">&bull;</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {balance.toFixed(1)} left
            </span>
          </>
        )}
      </div>
    </div>
  );
}
