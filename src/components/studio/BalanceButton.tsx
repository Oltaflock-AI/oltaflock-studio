import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { useCreditLogs } from '@/hooks/useCreditLogs';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

const BALANCE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/remainder-credits';

export function BalanceButton() {
  const { latestCreditLog, isLoading, createCreditLog, isCreating } = useCreditLogs();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckBalance = async () => {
    setIsChecking(true);
    
    try {
      console.log('Calling balance webhook:', BALANCE_WEBHOOK_URL);
      
      const response = await fetch(BALANCE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      console.log('Balance webhook response status:', response.status);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Balance webhook response data:', data);
      
      // Extract balance from response - handle multiple response formats
      const balance = data.balance || data.remaining || data.credits || 
                      data.data?.balance || data.data?.remaining || data.data?.credits ||
                      (typeof data === 'number' ? String(data) : JSON.stringify(data));
      
      // Store in database
      await createCreditLog({
        balance: String(balance),
        raw_response: data as Json,
      });

      toast.success('Balance updated');
    } catch (error) {
      console.error('Failed to check balance:', error);
      toast.error('Failed to check balance');
    } finally {
      setIsChecking(false);
    }
  };

  const isButtonLoading = isChecking || isCreating;

  return (
    <div className="flex items-center gap-2">
      {/* Display balance if available */}
      {latestCreditLog && !isLoading && (
        <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          Balance: {latestCreditLog.balance}
        </div>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheckBalance}
        disabled={isButtonLoading}
        className="gap-2"
      >
        {isButtonLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            {latestCreditLog ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              <Wallet className="h-3 w-3" />
            )}
            {latestCreditLog ? 'Refresh' : 'Check Balance'}
          </>
        )}
      </Button>
    </div>
  );
}
