import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenerations } from '@/hooks/useGenerations';

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FolderWithCount extends Folder {
  count: number;
  /** Newest finished image or video in the folder, for a cover. */
  cover: string | null;
  coverType: 'image' | 'video' | null;
}

// Not in the generated Supabase types yet (same approach as the assistant tables).
const TABLE = 'generation_folders' as never;
const EMPTY: Folder[] = [];

export const FOLDER_COLORS = ['#0E84D6', '#7C5CFF', '#E0567A', '#F08A24', '#1F9D6B', '#6B7280'];

/** The signed-in user's library folders, with live counts from their generations. */
export function useFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { generations } = useGenerations();
  const key = ['generation_folders', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE).select('*').order('position').order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as Folder[];
    },
  });
  const folders = query.data ?? EMPTY;

  const withCounts = useMemo<FolderWithCount[]>(() => {
    return folders.map((f) => {
      const inside = generations.filter((g) => g.folder_id === f.id);
      const cover = inside.find((g) => g.status === 'done' && g.output_url && !g.is_nsfw);
      return { ...f, count: inside.length, cover: cover?.output_url ?? null, coverType: cover?.type ?? null };
    });
  }, [folders, generations]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not signed in');
      const clean = name.trim();
      if (!clean) throw new Error('Give the folder a name');
      if (folders.some((f) => f.name.toLowerCase() === clean.toLowerCase())) throw new Error(`You already have a folder called "${clean}"`);
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ user_id: user.id, name: clean, color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length], position: folders.length } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Folder;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; color?: string }) => {
      if (patch.name !== undefined) {
        patch.name = patch.name.trim();
        if (!patch.name) throw new Error('Give the folder a name');
        if (folders.some((f) => f.id !== id && f.name.toLowerCase() === patch.name!.toLowerCase())) {
          throw new Error(`You already have a folder called "${patch.name}"`);
        }
      }
      const { error } = await supabase.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Deletes the folder only; its generations become unfiled (FK is ON DELETE SET NULL). */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
    },
  });

  return {
    folders: withCounts,
    isLoading: query.isLoading,
    createFolder: create.mutateAsync,
    renameFolder: (id: string, name: string) => update.mutateAsync({ id, name }),
    recolorFolder: (id: string, color: string) => update.mutateAsync({ id, color }),
    deleteFolder: remove.mutateAsync,
  };
}
