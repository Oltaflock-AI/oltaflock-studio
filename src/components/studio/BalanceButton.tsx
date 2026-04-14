import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BalanceButton() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-balance');

      if (error) throw new Error(error.message);
      if (data?.balance) {
        setBalance(Number(data.balance));
      }
    } catch (err) {
      console.error('Balance fetch failed:', err);
      toast.error('Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {balance !== null && (
        <div className="text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/10">
          <span className="tabular-nums">{balance.toLocaleString()}</span>
          <span className="text-primary/70 ml-1">Kie credits</span>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={fetchBalance}
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
