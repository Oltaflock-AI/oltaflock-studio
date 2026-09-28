import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DbGeneration } from '@/hooks/useGenerations';

/**
 * Asks the generate-title function for a short name from the prompt and saves
 * it, unless the user has named the generation in the meantime.
 */
export async function autoNameGeneration(g: Pick<DbGeneration, 'id' | 'user_prompt' | 'type' | 'model'>): Promise<string | null> {
  if (!g.user_prompt.trim()) return null;
  const { data, error } = await supabase.functions.invoke<{ title?: string }>('generate-title', {
    body: { prompt: g.user_prompt, category: `${g.type} made with ${g.model}` },
  });
  const title = data?.title?.trim();
  if (error || !title) return null;
  const { error: saveError } = await supabase
    .from('generations')
    .update({ title } as never)
    .eq('id', g.id)
    .is('title' as never, null);
  return saveError ? null : title;
}

/** Rename and bulk auto-name, keeping the generations cache in sync. */
export function useGenerationTitles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const key = ['generations', user?.id];

  const patchCache = useCallback((id: string, title: string | null) => {
    queryClient.setQueryData<DbGeneration[]>(key, (gens) => gens?.map((g) => (g.id === id ? { ...g, title } : g)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  const rename = useCallback(async (id: string, title: string) => {
    const clean = title.trim().slice(0, 120);
    patchCache(id, clean || null);
    const { error } = await supabase.from('generations').update({ title: clean || null } as never).eq('id', id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: key });
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchCache, queryClient, user?.id]);

  /** Names every untitled generation given, three at a time. Resolves to how many were named. */
  const autoNameMany = useCallback(async (rows: DbGeneration[], onProgress?: (done: number, total: number) => void) => {
    const queue = rows.filter((g) => !g.title && g.user_prompt.trim());
    let done = 0, named = 0;
    const worker = async () => {
      for (let g = queue.shift(); g; g = queue.shift()) {
        const title = await autoNameGeneration(g).catch(() => null);
        if (title) { named++; patchCache(g.id, title); }
        onProgress?.(++done, rows.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    queryClient.invalidateQueries({ queryKey: key });
    return named;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchCache, queryClient, user?.id]);

  return { rename, autoNameMany };
}
