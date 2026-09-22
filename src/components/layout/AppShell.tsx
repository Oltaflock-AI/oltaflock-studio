import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, LayoutGrid, Layers, Clock, MessageCircle, Settings as SettingsIcon, Coins, LogOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useGenerationStore } from '@/store/generationStore';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Sparkles;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Studio', icon: Sparkles },
  { to: '/library', label: 'Library', icon: LayoutGrid },
  { to: '/presets', label: 'Presets', icon: Layers },
  { to: '/library?tab=history', label: 'History', icon: Clock },
  { to: '/assistant', label: 'Assistant', icon: MessageCircle },
];

interface AppShellProps {
  children: ReactNode;
  /** Set false for pages (like Studio) that manage their own scroll/height internally. */
  scrollableContent?: boolean;
}

/**
 * Persistent left navigation rail + top-level chrome shared by every
 * authenticated page. Each page renders its own content inside this shell;
 * Studio keeps its existing internal 4-pane layout unchanged.
 */
export function AppShell({ children, scrollableContent = true }: AppShellProps) {
  const location = useLocation();
  const { displayName, initials, avatarUrl } = useProfile();
  const { balance } = useUserCredits();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const { clearAll } = useGenerationStore();
  const onHistory = location.pathname === '/library' && new URLSearchParams(location.search).get('tab') === 'history';

  const handleSignOut = async () => {
    // Same order as UserMenu: drop cached user data before the session goes.
    clearAll();
    queryClient.clear();
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground">
      <aside className="w-[240px] shrink-0 flex flex-col gap-6 px-4 py-6 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center justify-between px-2">
          <NavLink to="/" className="flex items-center gap-2">
            <img src={logoMark} alt="" className="w-[26px] h-[26px] object-contain shrink-0" />
            <span className="font-serif text-[19px] text-primary">Oltaflock</span>
          </NavLink>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.label === 'History' ? onHistory
              : item.label === 'Library' ? location.pathname === '/library' && !onHistory
              : location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-[11px] text-sm transition-smooth',
                  isActive ? 'bg-primary/10 text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/60'
                )}
              >
                <Icon className={cn('w-[17px] h-[17px]', isActive && 'text-primary')} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] bg-warning/10 border border-warning/25">
            <Coins className="w-[15px] h-[15px] text-warning shrink-0" strokeWidth={2} />
            <span className="text-xs text-warning">
              {balance != null ? `${Math.round(balance).toLocaleString()} credits` : 'Loading credits…'}
            </span>
          </div>
          <NavLink to="/settings" className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-smooth">
            <Avatar className="h-[26px] w-[26px] shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{displayName}</span>
            <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground/60 ml-auto shrink-0" />
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-smooth"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className={cn('flex-1 min-w-0', scrollableContent && 'overflow-y-auto')}>{children}</main>
    </div>
  );
}
