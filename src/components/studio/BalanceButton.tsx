import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BALANCE_WEBHOOK_URL = 'https://directive-ai.app.n8n.cloud/webhook/remainder-credits';

export function BalanceButton() {
  const [balance, setBalance] = useState<string | null>(null);
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
        body: JSON.stringify({
          action: 'check_balance',
          timestamp: new Date().toISOString(),
        }),
      });

      console.log('Balance webhook response status:', response.status);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Balance webhook response data:', data);
      
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
