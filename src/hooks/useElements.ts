import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ElementKind = 'character' | 'product' | 'logo' | 'place' | 'style' | 'other';

export const ELEMENT_KINDS: Array<{ id: ElementKind; label: string }> = [
  { id: 'character', label: 'Character' },
  { id: 'product', label: 'Product' },
  { id: 'logo', label: 'Logo' },
  { id: 'place', label: 'Place' },
  { id: 'style', label: 'Style' },
  { id: 'other', label: 'Other' },
];

/** A reusable, named reference: "@Name" in a prompt brings in its images and description. */
export interface StudioElement {
  id: string;
  user_id: string;
  name: string;
  kind: ElementKind;
  description: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export type ElementInput = Pick<StudioElement, 'name' | 'kind' | 'description' | 'image_urls'>;

/** Names are used as one word after "@", so letters, digits, "-" and "_" only. */
export const ELEMENT_NAME = /^[A-Za-z0-9_-]{1,40}$/;

// Not in the generated Supabase types yet (same approach as folders and the assistant tables).
const TABLE = 'elements' as never;
const EMPTY: StudioElement[] = [];

export function useElements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['elements', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE).select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudioElement[];
    },
  });
  const elements = query.data ?? EMPTY;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const friendly = (e: { message?: string; code?: string }) =>
    e.code === '23505' ? new Error('You already have an element with that name') : new Error(e.message ?? 'Something went wrong');

  const create = useMutation({
    mutationFn: async (input: ElementInput) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data, error } = await supabase.from(TABLE).insert({ ...input, user_id: user.id } as never).select().single();
      if (error) throw friendly(error);
      return data as unknown as StudioElement;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: ElementInput & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() } as never).eq('id', id);
      if (error) throw friendly(error);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const byName = useCallback(
    (name: string) => elements.find((e) => e.name.toLowerCase() === name.toLowerCase()),
    [elements],
  );

  return {
    elements,
    isLoading: query.isLoading,
    error: query.error,
    byName,
    createElement: create.mutateAsync,
    updateElement: update.mutateAsync,
    deleteElement: remove.mutateAsync,
    isSaving: create.isPending || update.isPending,
  };
}

/** "@Name" tokens in a prompt that match one of the user's elements. */
export function elementsInPrompt(prompt: string, elements: StudioElement[]): StudioElement[] {
  const names = new Set([...prompt.matchAll(/(^|\s)@([A-Za-z0-9_-]+)/g)].map((m) => m[2].toLowerCase()));
  return elements.filter((e) => names.has(e.name.toLowerCase()));
}

/**
 * The prompt the model sees: "@Name" becomes "Name", and each element's
 * description is added once so the model knows what the reference images show.
 */
export function expandElements(prompt: string, elements: StudioElement[]): string {
  const used = elementsInPrompt(prompt, elements);
  if (used.length === 0) return prompt;
  let text = prompt;
  for (const e of used) text = text.replace(new RegExp(`(^|\\s)@${e.name}(?![A-Za-z0-9_-])`, 'gi'), `$1${e.name}`);
  const notes = used
    .map((e) => `${e.name}${e.description?.trim() ? `: ${e.description.trim()}` : ''} (shown in the reference image${e.image_urls.length > 1 ? 's' : ''})`)
    .join('; ');
  return `${text.trim().replace(/[.\s]+$/, '')}. ${notes}.`;
}
