import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGenerationStore } from '@/store/generationStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileDialog } from './ProfileDialog';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { clearAll } = useGenerationStore();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching display name:', error);
        }

        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      } catch (error) {
        if (!cancelled) console.error('Error fetching display name:', error);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const email = user.email || 'Unknown';
  const nameToShow = displayName || email.split('@')[0];
  const initials = nameToShow
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    // Clear all cached data first
    clearAll();
    queryClient.clear();
    
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">
              {nameToShow}
            </span>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              {displayName && (
                <p className="text-sm font-medium">{displayName}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );
}
