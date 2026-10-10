import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TeamRole = 'admin' | 'member';

export interface TeamMember {
  user_id: string;
  role: TeamRole;
  created_at: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// Not in the generated Supabase types yet (same approach as folders and elements).
const MEMBERS = 'team_members' as never;
const PROFILES = 'profiles' as never;

/** Display name for a teammate: their name, else the part of their email before @. */
export const memberName = (m: Pick<TeamMember, 'display_name' | 'email'> | undefined) =>
  m?.display_name?.trim() || m?.email?.split('@')[0] || 'Someone';

async function teamAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>('team-admin', { body });
  if (error || data?.error) {
    const context = (error as { context?: Response } | null)?.context;
    const detail = data?.error ?? (context ? (await context.json().catch(() => null))?.error : null);
    throw new Error(detail ?? error?.message ?? 'Something went wrong');
  }
  return data;
}

/** The PROMUNCH team: who's on it, their roles, and (for admins) invite / remove. */
export function useTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['team', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: members, error }, { data: profiles }] = await Promise.all([
        supabase.from(MEMBERS).select('user_id, role, created_at').order('created_at'),
        supabase.from(PROFILES).select('user_id, email, display_name, avatar_url'),
      ]);
      if (error) throw error;
      const byId = new Map(((profiles ?? []) as unknown as TeamMember[]).map((p) => [p.user_id, p]));
      return ((members ?? []) as unknown as Array<Pick<TeamMember, 'user_id' | 'role' | 'created_at'>>).map((m) => ({
        ...m,
        email: byId.get(m.user_id)?.email ?? null,
        display_name: byId.get(m.user_id)?.display_name ?? null,
        avatar_url: byId.get(m.user_id)?.avatar_url ?? null,
      })) as TeamMember[];
    },
  });

  const members = useMemo(() => query.data ?? [], [query.data]);
  const byId = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);
  const isAdmin = byId.get(user?.id ?? '')?.role === 'admin';
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const invite = useMutation({ mutationFn: (v: { email: string; role: TeamRole }) => teamAdmin({ action: 'invite', ...v }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (userId: string) => teamAdmin({ action: 'remove', user_id: userId }), onSuccess: invalidate });
  const setRole = useMutation({ mutationFn: (v: { userId: string; role: TeamRole }) => teamAdmin({ action: 'set_role', user_id: v.userId, role: v.role }), onSuccess: invalidate });

  return {
    members,
    byId,
    isAdmin,
    isLoading: query.isLoading,
    error: query.error,
    invite: invite.mutateAsync,
    inviting: invite.isPending,
    remove: remove.mutateAsync,
    setRole: setRole.mutateAsync,
  };
}
