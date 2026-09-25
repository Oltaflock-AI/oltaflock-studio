import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

// Status type matching the generations table
export type GenerationStatus = 'queued' | 'running' | 'done' | 'error';

// Stable reference so consumers that memoize on `generations` don't see a
// new array every render while the query has no data yet.
const EMPTY_GENERATIONS: DbGeneration[] = [];

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
  /** User-marked sensitive: previews stay blurred until explicitly revealed. */
  is_nsfw?: boolean;
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
  is_nsfw?: boolean;
}

export function useGenerations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Auto-timeout generations stuck for more than 10 minutes
  const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

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
      const generations = data as DbGeneration[];

      // Check for timed-out generations and mark them as errored
      const now = Date.now();
      for (const gen of generations) {
        if (
          (gen.status === 'running' || gen.status === 'queued') &&
          now - new Date(gen.created_at).getTime() > GENERATION_TIMEOUT_MS
        ) {
          await supabase
            .from('generations')
            .update({
              status: 'error',
              error_message: 'Generation timed out after 10 minutes',
            })
            .eq('id', gen.id)
            .eq('user_id', user.id);

          gen.status = 'error';
          gen.error_message = 'Generation timed out after 10 minutes';
        }
      }

      return generations;
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

  // Marks a generation sensitive (or not) and carries the flag to the user's
  // library items made from it, so it's blurred wherever it's previewed.
  const setNsfwMutation = useMutation({
    mutationFn: async ({ generation, isNsfw }: { generation: DbGeneration; isNsfw: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('generations')
        .update({ is_nsfw: isNsfw })
        .eq('id', generation.id)
        .eq('user_id', user.id);
      if (error) throw error;

      const library = supabase.from('prompt_library_items' as never);
      const matchesThis = generation.output_url
        ? `source_generation_id.eq.${generation.id},thumbnail_url.eq."${generation.output_url}"`
        : `source_generation_id.eq.${generation.id}`;
      const { error: libError } = await library
        .update({ is_nsfw: isNsfw } as never)
        .eq('user_id', user.id)
        .or(matchesThis);
      if (libError) console.warn('Could not sync NSFW flag to library:', libError);
    },
    onMutate: async ({ generation, isNsfw }) => {
      // Blur immediately rather than waiting for the round trip.
      const key = ['generations', user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DbGeneration[]>(key);
      queryClient.setQueryData<DbGeneration[]>(key, (gens) =>
        gens?.map((g) => (g.id === generation.id ? { ...g, is_nsfw: isNsfw } : g)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['generations', user?.id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prompt_library', user?.id] });
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
    generations: generationsQuery.data ?? EMPTY_GENERATIONS,
    isLoading: generationsQuery.isLoading,
    error: generationsQuery.error,
    createGeneration: createGenerationMutation.mutateAsync,
    updateGeneration: updateGenerationMutation.mutateAsync,
    deleteGeneration: deleteGenerationMutation.mutateAsync,
    setNsfw: (generation: DbGeneration, isNsfw: boolean) =>
      setNsfwMutation.mutateAsync({ generation, isNsfw }),
    refetch: generationsQuery.refetch,
  };
}
