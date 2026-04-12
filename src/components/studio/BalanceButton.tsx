import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { creditsToUsd } from '@/config/pricing';

export function BalanceButton() {
  const [balance, setBalance] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckBalance = async () => {
    setIsChecking(true);
    
    try {
      console.log('Calling balance check edge function');
      
      const { data, error } = await supabase.functions.invoke('check-balance');
      
      if (error) {
        throw new Error(error.message);
      }

      console.log('Balance response:', data);

      // Check for error response from webhook
      if (data?.error) {
        toast.error(data.error, { duration: 4000 });
        return;
      }

      // Parse the response - edge function now wraps text in { balance: "..." }
      let balanceValue: string;
      
      if (data?.balance) {
        // New format: { balance: "Credits Remaining : 8825.4" }
        const match = data.balance.match(/[\d,]+\.?\d*/);
        if (match) {
          balanceValue = match[0];
        } else {
          balanceValue = data.balance.trim();
        }
      } else if (typeof data === 'string') {
        // Fallback for direct string response
        const match = data.match(/[\d,]+\.?\d*/);
        if (match) {
          balanceValue = match[0];
        } else {
          balanceValue = data.trim();
        }
      } else if (typeof data === 'number') {
        balanceValue = String(data);
      } else if (data?.remaining !== undefined) {
        balanceValue = String(data.remaining);
      } else if (data?.credits !== undefined) {
        balanceValue = String(data.credits);
      } else {
        // Fallback: warn and show raw
        console.warn('Unexpected balance format:', data);
        toast.warning('Balance format not recognized', { duration: 3000 });
        return;
      }
      
      setBalance(balanceValue);
      toast.success(`Credits: ${balanceValue}`, { duration: 3000 });
    } catch (error) {
      console.error('Failed to check balance:', error);
      toast.error('Unable to fetch balance. Try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {balance && (
        <div className="text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/10">
          <span className="tabular-nums">{balance}</span>
          <span className="text-primary/70 ml-1">credits</span>
          <span className="text-primary/50 mx-1.5">•</span>
          <span className="tabular-nums text-primary/70">
            ${(() => {
              const parsed = parseFloat(balance.replace(/,/g, ''));
              return isNaN(parsed) ? '—' : creditsToUsd(parsed).toFixed(2);
            })()}
          </span>
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCheckBalance}
        disabled={isChecking}
        className="h-8 px-3 gap-2 hover:bg-accent rounded-lg transition-smooth"
      >
        {isChecking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : balance ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Wallet className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline text-xs">
          {isChecking ? 'Checking...' : balance ? 'Refresh' : 'Balance'}
        </span>
      </Button>
    </div>
  );
}
