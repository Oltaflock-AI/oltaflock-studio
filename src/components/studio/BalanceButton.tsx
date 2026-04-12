import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { creditsToUsd, formatCredits } from '@/config/pricing';
import { useUserCredits } from '@/hooks/useUserCredits';

export function BalanceButton() {
  const { balance, totalSpent, totalGenerations, isLoading, refetch } = useUserCredits();

  return (
    <div className="flex items-center gap-2">
      {balance !== null && (
        <div className="text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/10">
          <span className="tabular-nums">{formatCredits(balance)}</span>
          <span className="text-primary/70 ml-1">credits</span>
          <span className="text-primary/50 mx-1.5">&bull;</span>
          <span className="tabular-nums text-primary/70">
            ${creditsToUsd(balance).toFixed(2)}
          </span>
          {totalGenerations > 0 && (
            <>
              <span className="text-primary/50 mx-1.5">&bull;</span>
              <span className="text-primary/50">{totalGenerations} gen{totalGenerations !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => refetch()}
        disabled={isLoading}
        className="h-8 px-3 gap-2 hover:bg-accent rounded-lg transition-smooth"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : balance !== null ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Wallet className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline text-xs">
          {isLoading ? 'Loading...' : balance !== null ? 'Refresh' : 'Balance'}
        </span>
      </Button>
    </div>
  );
}
