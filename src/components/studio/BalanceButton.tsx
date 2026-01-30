import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
        toast.error(data.error);
        return;
      }

      // Extract balance from response - handle various response formats
      let balanceValue: string;
      if (typeof data === 'number') {
        balanceValue = String(data);
      } else if (typeof data === 'string') {
        balanceValue = data;
      } else if (data.balance !== undefined) {
        balanceValue = String(data.balance);
      } else if (data.remaining !== undefined) {
        balanceValue = String(data.remaining);
      } else if (data.credits !== undefined) {
        balanceValue = String(data.credits);
      } else if (data.data?.balance !== undefined) {
        balanceValue = String(data.data.balance);
      } else if (data.data?.remaining !== undefined) {
        balanceValue = String(data.data.remaining);
      } else if (data.data?.credits !== undefined) {
        balanceValue = String(data.data.credits);
      } else {
        // If we can't parse it, show the raw response
        balanceValue = JSON.stringify(data);
      }
      
      setBalance(balanceValue);
      toast.success('Balance updated');
    } catch (error) {
      console.error('Failed to check balance:', error);
      toast.error('Failed to check balance');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Display balance if available */}
      {balance && (
        <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          Balance: {balance}
        </div>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheckBalance}
        disabled={isChecking}
        className="gap-2"
      >
        {isChecking ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            {balance ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              <Wallet className="h-3 w-3" />
            )}
            {balance ? 'Refresh' : 'Check Balance'}
          </>
        )}
      </Button>
    </div>
  );
}
