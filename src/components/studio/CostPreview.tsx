import { usePricing } from '@/hooks/usePricing';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CostPreview() {
  const { hasPrice, formattedCredits, formattedUsd } = usePricing();
  
  if (!hasPrice) return null;
  
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 px-3 rounded-lg",
      "bg-muted/30 border border-border/50"
    )}>
      <div className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Estimated Cost
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formattedCredits}
        </span>
        <span className="text-xs text-muted-foreground">credits</span>
        <span className="text-xs text-muted-foreground/60">•</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formattedUsd}
        </span>
      </div>
    </div>
  );
}
