import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface CreditLog {
  id: string;
  balance: string;
  raw_response: Json | null;
  checked_at: string;
}

export function useCreditLogs() {
  const queryClient = useQueryClient();

  // Query to get the latest credit log
  const latestCreditLogQuery = useQuery({
    queryKey: ['credit-logs', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CreditLog | null;
    },
  });

  // Mutation to create a new credit log
  const createCreditLogMutation = useMutation({
    mutationFn: async (params: { balance: string; raw_response: Json | null }) => {
      const { data, error } = await supabase
        .from('credit_logs')
        .insert({
          balance: params.balance,
          raw_response: params.raw_response,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CreditLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-logs'] });
    },
  });

  return {
    latestCreditLog: latestCreditLogQuery.data,
    isLoading: latestCreditLogQuery.isLoading,
    createCreditLog: createCreditLogMutation.mutateAsync,
    isCreating: createCreditLogMutation.isPending,
  };
}
