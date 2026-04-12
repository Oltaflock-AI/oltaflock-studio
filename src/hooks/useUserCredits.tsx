import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  total_spent: number;
  total_generations: number;
  created_at: string;
  updated_at: string;
}

export interface CreditLog {
  id: string;
  user_id: string;
  balance: string;
  credits_used: number | null;
  generation_id: string | null;
  model: string | null;
  description: string | null;
  checked_at: string;
}

export function useUserCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const creditsQuery = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserCredits;
    },
    enabled: !!user?.id,
  });

  const creditLogsQuery = useQuery({
    queryKey: ['credit-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('credit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditLog[];
    },
    enabled: !!user?.id,
  });

  const deductCreditsMutation = useMutation({
    mutationFn: async ({
      credits,
      generationId,
      model,
      description,
    }: {
      credits: number;
      generationId: string;
      model: string;
      description: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current balance
      const { data: current, error: fetchError } = await supabase
        .from('user_credits')
        .select('balance, total_spent, total_generations')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!current) throw new Error('Credit record not found');

      const currentBalance = Number(current.balance);
      if (currentBalance < credits) {
        throw new Error(`Insufficient credits. You have ${currentBalance} but need ${credits}.`);
      }

      const newBalance = currentBalance - credits;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          total_spent: Number(current.total_spent) + credits,
          total_generations: current.total_generations + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log the transaction
      const { error: logError } = await supabase
        .from('credit_logs')
        .insert({
          user_id: user.id,
          balance: String(newBalance),
          credits_used: credits,
          generation_id: generationId,
          model,
          description,
          checked_at: new Date().toISOString(),
        });

      if (logError) console.error('Failed to log credit transaction:', logError);

      return { newBalance, creditsUsed: credits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['credit-logs', user?.id] });
    },
  });

  return {
    credits: creditsQuery.data,
    balance: creditsQuery.data ? Number(creditsQuery.data.balance) : null,
    totalSpent: creditsQuery.data ? Number(creditsQuery.data.total_spent) : 0,
    totalGenerations: creditsQuery.data?.total_generations ?? 0,
    isLoading: creditsQuery.isLoading,
    creditLogs: creditLogsQuery.data ?? [],
    logsLoading: creditLogsQuery.isLoading,
    deductCredits: deductCreditsMutation.mutateAsync,
    isDeducting: deductCreditsMutation.isPending,
    refetch: creditsQuery.refetch,
  };
}
