import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  error: string | null;
  created_at: string;
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
  error?: string | null;
}

// Update type
export interface GenerationUpdate {
  status?: GenerationStatus;
  output_url?: string | null;
  final_prompt?: string | null;
  error?: string | null;
}

// Get untyped client for external table access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedSupabase = supabase as any;

export function useGenerations() {
  const queryClient = useQueryClient();

  const generationsQuery = useQuery({
    queryKey: ['generations'],
    queryFn: async () => {
      const { data, error } = await untypedSupabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DbGeneration[];
    },
  });

  const createGenerationMutation = useMutation({
    mutationFn: async (generation: GenerationInsert) => {
      const { data, error } = await untypedSupabase
        .from('generations')
        .insert({
          request_id: generation.request_id,
          type: generation.type,
          model: generation.model,
          user_prompt: generation.user_prompt,
          final_prompt: generation.final_prompt,
          model_params: generation.model_params,
          status: generation.status || 'queued',
          output_url: generation.output_url,
          error: generation.error,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DbGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
  });

  const updateGenerationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: GenerationUpdate }) => {
      const { data, error } = await untypedSupabase
        .from('generations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DbGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
  });

  const deleteGenerationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedSupabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] });
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
