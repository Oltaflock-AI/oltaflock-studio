import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DbGeneration } from '@/hooks/useGenerations';

const isPending = (g: DbGeneration | null | undefined) => g?.status === 'queued' || g?.status === 'running';

/**
 * Fetches a single generation by id for the current user.
 *
 * Keys live under ['generations', userId, ...] so every mutation in
 * useGenerations (which invalidates ['generations', userId]) also refreshes
 * this detail view. Returns `null` data when the row doesn't exist, isn't the
 * user's, or the id isn't a valid uuid.
 */
export function useGeneration(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['generations', user?.id, 'detail', id],
    queryFn: async (): Promise<DbGeneration | null> => {
      if (!user?.id || !id) return null;
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // 22P02 = invalid uuid syntax → treat as "not found" rather than an error.
        if (error.code === '22P02') return null;
        throw error;
      }
      return (data as DbGeneration | null) ?? null;
    },
    enabled: !!user?.id && !!id,
    refetchInterval: (query) => (isPending(query.state.data) ? 5000 : false),
  });
}

/**
 * Other generations that share a request_id (the generation's job id) with
 * the given one, oldest first. Excludes the generation itself.
 */
export function useGenerationSiblings(generation: DbGeneration | null | undefined) {
  const { user } = useAuth();
  const requestId = generation?.request_id;
  const selfId = generation?.id;

  return useQuery({
    queryKey: ['generations', user?.id, 'siblings', requestId, selfId],
    queryFn: async (): Promise<DbGeneration[]> => {
      if (!user?.id || !requestId || !selfId) return [];
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_id', requestId)
        .neq('id', selfId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as DbGeneration[];
    },
    enabled: !!user?.id && !!requestId && !!selfId,
    refetchInterval: (query) => (query.state.data?.some(isPending) ? 5000 : false),
  });
}
