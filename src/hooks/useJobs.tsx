import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { JobStatus } from '@/types/generation';
import type { Json } from '@/integrations/supabase/types';

export interface DbJob {
  id: string;
  user_id: string;
  job_id: string;
  mode: 'image' | 'video';
  model: string;
  generation_type: string;
  raw_prompt: string;
  refined_prompt: string | null;
  status: JobStatus;
  output_url: string | null;
  error_message: string | null;
  controls: Json | null;
  reference_files: Json | null;
  workflow_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export function useJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DbJob[];
    },
    enabled: !!user,
  });

  const createJobMutation = useMutation({
    mutationFn: async (job: {
      job_id: string;
      mode: string;
      model: string;
      generation_type: string;
      raw_prompt: string;
      refined_prompt?: string | null;
      status: string;
      output_url?: string | null;
      error_message?: string | null;
      controls?: Json | null;
      reference_files?: Json | null;
      workflow_id?: string | null;
      completed_at?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_id: job.job_id,
          mode: job.mode,
          model: job.model,
          generation_type: job.generation_type,
          raw_prompt: job.raw_prompt,
          refined_prompt: job.refined_prompt,
          status: job.status,
          output_url: job.output_url,
          error_message: job.error_message,
          controls: job.controls,
          reference_files: job.reference_files,
          workflow_id: job.workflow_id,
          completed_at: job.completed_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DbJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: {
      status?: string;
      output_url?: string | null;
      refined_prompt?: string | null;
      error_message?: string | null;
      completed_at?: string | null;
    } }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DbJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
    },
  });

  return {
    jobs: jobsQuery.data ?? [],
    isLoading: jobsQuery.isLoading,
    error: jobsQuery.error,
    createJob: createJobMutation.mutateAsync,
    updateJob: updateJobMutation.mutateAsync,
    deleteJob: deleteJobMutation.mutateAsync,
    refetch: jobsQuery.refetch,
  };
}
