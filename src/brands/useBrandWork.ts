import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DbGeneration } from '@/hooks/useGenerations';

export type ReviewStatus = 'approved' | 'changes';

export interface BrandReview {
  generation_id: string;
  status: ReviewStatus;
  note: string | null;
  reviewer_id: string | null;
  updated_at: string;
}

// Not in the generated Supabase types yet.
const REVIEWS = 'brand_reviews' as never;
const LIMIT = 300;

const pending = (g: DbGeneration) => g.status === 'queued' || g.status === 'running';

/**
 * Everything the team has made from brand jobs (newest first), with each
 * result's review. Refreshes every 5s while anything is still being made.
 */
export function useBrandWork(brandId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['brand-work', brandId];

  const work = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('model_params->>source', 'brand')
        .eq('model_params->>brand', brandId)
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      const generations = (data ?? []) as DbGeneration[];
      const ids = generations.map((g) => g.id);
      const reviews: BrandReview[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data: rows } = await supabase.from(REVIEWS).select('*').in('generation_id', ids.slice(i, i + 100));
        reviews.push(...((rows ?? []) as unknown as BrandReview[]));
      }
      return { generations, reviews };
    },
    refetchInterval: (q) => (q.state.data?.generations.some(pending) ? 5000 : false),
  });

  const generations = useMemo(() => work.data?.generations ?? [], [work.data]);
  const reviews = useMemo(() => new Map((work.data?.reviews ?? []).map((r) => [r.generation_id, r])), [work.data]);

  const review = useMutation({
    mutationFn: async ({ generationId, status, note }: { generationId: string; status: ReviewStatus | null; note?: string }) => {
      if (!user?.id) throw new Error('Not signed in');
      if (status === null) {
        const { error } = await supabase.from(REVIEWS).delete().eq('generation_id', generationId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from(REVIEWS).upsert({
        generation_id: generationId,
        status,
        note: note?.trim() || null,
        reviewer_id: user.id,
        updated_at: new Date().toISOString(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    generations,
    reviews,
    isLoading: work.isLoading,
    error: work.error,
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
    setReview: review.mutateAsync,
  };
}
