import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ModelSpec } from '@catalog/types.ts';

/** Whether the server has Higgsfield API credentials configured. */
export function useHiggsfieldStatus(enabled = true) {
  return useQuery({
    queryKey: ['higgsfield-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('higgsfield', { body: { action: 'status' } });
      if (error) throw error;
      return { configured: !!(data as { configured?: boolean })?.configured };
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export interface HiggsfieldEstimate {
  credits: number;
  usd: number;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Live Higgsfield price for the current model + settings. The prompt only
 * matters for validity, so it's reduced to "has text" to avoid a request per keystroke.
 */
export function useHiggsfieldEstimate(spec: ModelSpec | undefined, prompt: string, controls: Record<string, unknown>) {
  const isHf = spec?.api === 'higgsfield';
  const key = useDebounced(isHf ? JSON.stringify([spec!.id, prompt.trim() ? 1 : 0, controls]) : '', 500);

  return useQuery({
    queryKey: ['higgsfield-estimate', key],
    queryFn: async (): Promise<HiggsfieldEstimate | null> => {
      const [model, , ctl] = JSON.parse(key) as [string, number, Record<string, unknown>];
      const { data, error } = await supabase.functions.invoke('higgsfield', {
        body: { action: 'estimate', model, prompt: prompt.trim() || '', controls: ctl },
      });
      if (error || !data || typeof (data as HiggsfieldEstimate).credits !== 'number') return null;
      return data as HiggsfieldEstimate;
    },
    enabled: !!key,
    staleTime: 10 * 60_000,
    retry: false,
  });
}
