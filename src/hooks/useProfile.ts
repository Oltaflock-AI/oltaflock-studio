import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data as Profile) ?? null;
    },
    enabled: !!user,
  });

  const updateDisplayName = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          display_name: name.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Display name updated');
    },
    onError: () => {
      toast.error('Failed to update display name');
    },
  });

  const updateAvatar = useMutation({
    mutationFn: async (file: Blob) => {
      if (!user) throw new Error('Not authenticated');

      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Add cache-buster to force refresh
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      return avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Avatar updated');
    },
    onError: (error: any) => {
      console.error('Avatar upload error:', error);
      const msg = error?.message || error?.statusCode || 'Unknown error';
      toast.error(`Failed to upload avatar: ${msg}`);
    },
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    profile,
    isLoading,
    displayName,
    initials,
    avatarUrl: profile?.avatar_url ?? null,
    updateDisplayName,
    updateAvatar,
  };
}
