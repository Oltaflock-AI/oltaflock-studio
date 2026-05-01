import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';
import type { LibraryItem, LibraryItemInsert } from '@/types/library';

// Table not yet in generated supabase types — cast through `as never` for the table name
// and assert the row shape on the way out.
const TABLE = 'prompt_library_items' as never;

export function usePromptLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const libraryQuery = useQuery({
    queryKey: ['prompt_library', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('is_curated', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as LibraryItem[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const saveToLibrary = useMutation({
    mutationFn: async (input: LibraryItemInsert) => {
      if (!user?.id) throw new Error('User not authenticated');

      const row = {
        user_id: user.id,
        is_curated: false,
        title: input.title,
        prompt: input.prompt,
        category: input.category,
        thumbnail_url: input.thumbnail_url,
        mode: input.mode,
        generation_type: input.generation_type,
        model: input.model,
        model_params: (input.model_params ?? null) as Json | null,
        source_generation_id: input.source_generation_id ?? null,
      };

      const { data, error } = await supabase
        .from(TABLE)
        .insert(row as never)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as LibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt_library', user?.id] });
    },
  });

  const deleteFromLibrary = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt_library', user?.id] });
    },
  });

  return {
    items: libraryQuery.data ?? [],
    isLoading: libraryQuery.isLoading,
    error: libraryQuery.error,
    saveToLibrary: saveToLibrary.mutateAsync,
    isSaving: saveToLibrary.isPending,
    deleteFromLibrary: deleteFromLibrary.mutateAsync,
    isDeleting: deleteFromLibrary.isPending,
    refetch: libraryQuery.refetch,
  };
}
