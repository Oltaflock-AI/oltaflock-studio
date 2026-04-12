import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

// Status type matching the generations table
export type GenerationStatus = 'queued' | 'running' | 'done' | 'error';

// Database row type for generations table
export interface DbGeneration {
  id: string;
  request_id: string;
  type: 'image' | 'video';
  model: string;
  user_prompt: string;
  final_prompt: string | null;
  model_params: Record<string, unknown> | null;
  status: GenerationStatus;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  rating: number | null;
  user_id: string | null;
  progress: number;
  external_task_id: string | null;
}

// Insert type (omitting auto-generated fields)
export interface GenerationInsert {
  request_id: string;
  type: 'image' | 'video';
  model: string;
  user_prompt: string;
  final_prompt?: string | null;
  model_params?: Record<string, unknown> | null;
  status?: GenerationStatus;
  output_url?: string | null;
  error_message?: string | null;
}

// Update type
export interface GenerationUpdate {
  status?: GenerationStatus;
  output_url?: string | null;
  final_prompt?: string | null;
  error_message?: string | null;
  rating?: number | null;
  progress?: number;
  external_task_id?: string | null;
}

export function useGenerations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const generationsQuery = useQuery({
    queryKey: ['generations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DbGeneration[];
    },
    enabled: !!user?.id,
    // Poll every 5s if any record is still 'running' or 'queued'
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasPending = data?.some(g => g.status === 'running' || g.status === 'queued');
      return hasPending ? 5000 : false;
    },
  });

  const createGenerationMutation = useMutation({
    mutationFn: async (generation: GenerationInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('generations')
        .insert({
          request_id: generation.request_id,
          type: generation.type,
          model: generation.model,
          user_prompt: generation.user_prompt,
          final_prompt: generation.final_prompt,
          model_params: generation.model_params as Json,
          status: generation.status || 'queued',
          output_url: generation.output_url,
          error_message: generation.error_message,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DbGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
    },
  });

  const updateGenerationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: GenerationUpdate }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('generations')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as DbGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
    },
  });

  const deleteGenerationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
    },
  });

  return {
    generations: generationsQuery.data ?? [],
    isLoading: generationsQuery.isLoading,
    error: generationsQuery.error,
    createGeneration: createGenerationMutation.mutateAsync,
    updateGeneration: updateGenerationMutation.mutateAsync,
    deleteGeneration: deleteGenerationMutation.mutateAsync,
    refetch: generationsQuery.refetch,
  };
}
