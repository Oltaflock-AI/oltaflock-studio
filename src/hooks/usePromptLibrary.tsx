import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';
import {
  normalizeCollectionName,
  type LibraryCollection,
  type LibraryItem,
  type LibraryItemInsert,
} from '@/types/library';
import type { DbGeneration } from '@/hooks/useGenerations';
import type { GenerationMode, GenerationType } from '@/types/generation';

function fallbackTitleFromPrompt(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 8).join(' ');
  return words.length > 0 ? words.slice(0, 80) : 'Untitled';
}

export async function generateTitle(prompt: string, category?: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: { prompt, category },
    });
    if (error) throw error;
    const title = (data as { title?: string } | null)?.title?.trim();
    if (title && title.length > 0) return title;
    throw new Error('Empty title');
  } catch (e) {
    console.warn('generate-title fallback:', e);
    return fallbackTitleFromPrompt(prompt);
  }
}

function inferMode(gen: DbGeneration): GenerationMode {
  return gen.type === 'video' ? 'video' : 'image';
}

function inferGenerationType(gen: DbGeneration): GenerationType {
  return gen.type === 'video' ? 'text-to-video' : 'text-to-image';
}

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
        ...(input.is_nsfw ? { is_nsfw: true } : {}),
        // Only send `collection` when set, so saving keeps working even before the
        // library_collections migration has been applied.
        ...(normalizeCollectionName(input.collection)
          ? { collection: normalizeCollectionName(input.collection) }
          : {}),
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

  const setCollectionMutation = useMutation({
    mutationFn: async ({ ids, collection }: { ids: string[]; collection: string | null }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (ids.length === 0) return;
      const { error } = await supabase
        .from(TABLE)
        .update({ collection: normalizeCollectionName(collection) } as never)
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt_library', user?.id] });
    },
  });

  const setItemNsfwMutation = useMutation({
    mutationFn: async ({ id, isNsfw }: { id: string; isNsfw: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from(TABLE)
        .update({ is_nsfw: isNsfw } as never)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt_library', user?.id] });
    },
  });

  const items = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);

  /** True when the current user owns this item (can edit/delete/move it). */
  const isOwnItem = useCallback(
    (item: LibraryItem) => !item.is_curated && !!user?.id && item.user_id === user.id,
    [user?.id]
  );

  /** Distinct collections across the current user's own items, with counts, sorted by name. */
  const collections = useMemo<LibraryCollection[]>(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (!isOwnItem(it)) continue;
      const name = normalizeCollectionName(it.collection);
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [items, isOwnItem]);

  /**
   * For an item the user doesn't own (curated, or shared by a teammate), returns the
   * user's own saved copy of it, if any.
   */
  const findSavedCopy = useCallback(
    (item: LibraryItem): LibraryItem | undefined =>
      items.find(
        (it) =>
          it.id !== item.id &&
          isOwnItem(it) &&
          it.prompt === item.prompt &&
          it.thumbnail_url === item.thumbnail_url
      ),
    [items, isOwnItem]
  );

  const findByGenerationId = useCallback(
    (genId: string): LibraryItem | undefined =>
      items.find((it) => it.source_generation_id === genId),
    [items]
  );

  const quickStar = useCallback(
    async (gen: DbGeneration) => {
      if (!gen.output_url) throw new Error('Generation has no output');
      const existing = items.find((it) => it.source_generation_id === gen.id);
      if (existing) {
        await deleteFromLibrary.mutateAsync(existing.id);
        return { starred: false };
      }
      const title = await generateTitle(gen.user_prompt, 'other');
      await saveToLibrary.mutateAsync({
        title,
        prompt: gen.user_prompt,
        category: 'other',
        thumbnail_url: gen.output_url,
        mode: inferMode(gen),
        generation_type: inferGenerationType(gen),
        model: gen.model,
        model_params: gen.model_params ?? null,
        source_generation_id: gen.id,
        is_nsfw: !!gen.is_nsfw,
      });
      return { starred: true };
    },
    [items, saveToLibrary, deleteFromLibrary]
  );

  /** Copies an item the user doesn't own into their library (a "star" on a curated card). */
  const saveCopy = useCallback(
    (item: LibraryItem, collection?: string | null) =>
      saveToLibrary.mutateAsync({
        title: item.title,
        prompt: item.prompt,
        category: item.category,
        thumbnail_url: item.thumbnail_url,
        mode: item.mode,
        generation_type: item.generation_type,
        model: item.model,
        model_params: item.model_params ?? null,
        source_generation_id: null,
        is_nsfw: !!item.is_nsfw,
        collection: collection ?? null,
      }),
    [saveToLibrary]
  );

  /** Re-inserts a previously deleted own item (used for "Undo" after un-starring). */
  const restoreItem = useCallback(
    (item: LibraryItem) =>
      saveToLibrary.mutateAsync({
        title: item.title,
        prompt: item.prompt,
        category: item.category,
        thumbnail_url: item.thumbnail_url,
        mode: item.mode,
        generation_type: item.generation_type,
        model: item.model,
        model_params: item.model_params ?? null,
        source_generation_id: item.source_generation_id,
        is_nsfw: !!item.is_nsfw,
        collection: item.collection ?? null,
      }),
    [saveToLibrary]
  );

  return {
    items,
    isLoading: libraryQuery.isLoading,
    error: libraryQuery.error,
    saveToLibrary: saveToLibrary.mutateAsync,
    isSaving: saveToLibrary.isPending,
    deleteFromLibrary: deleteFromLibrary.mutateAsync,
    isDeleting: deleteFromLibrary.isPending,
    refetch: libraryQuery.refetch,
    findByGenerationId,
    quickStar,
    isStarToggling: saveToLibrary.isPending || deleteFromLibrary.isPending,
    isOwnItem,
    collections,
    setCollection: (ids: string[], collection: string | null) =>
      setCollectionMutation.mutateAsync({ ids, collection }),
    isSettingCollection: setCollectionMutation.isPending,
    findSavedCopy,
    saveCopy,
    restoreItem,
    setItemNsfw: (id: string, isNsfw: boolean) => setItemNsfwMutation.mutateAsync({ id, isNsfw }),
  };
}
