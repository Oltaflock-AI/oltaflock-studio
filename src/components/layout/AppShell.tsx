import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, LayoutGrid, Layers, MessageCircle, Settings as SettingsIcon, Coins, LogOut, Boxes, Store } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useGenerationStore } from '@/store/generationStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { BrandBadge, BrandMark } from '@/components/brand/BrandMark';
import { IDENTITY } from '@/brands/identity';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Sparkles;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Store },
  { to: '/create', label: 'Create', icon: Sparkles },
  { to: '/library', label: 'Library', icon: LayoutGrid },
  { to: '/presets', label: 'Presets', icon: Layers },
  { to: '/elements', label: 'Packs & assets', icon: Boxes },
  { to: '/assistant', label: 'Assistant', icon: MessageCircle },
];

interface AppShellProps {
  children: ReactNode;
  /** Set false for pages (like Studio) that manage their own scroll/height internally. */
  scrollableContent?: boolean;
  /** Icon-only rail, for pages (like Assistant) that need the horizontal space. Always on below 1280px (tablets). */
  compactNav?: boolean;
}

function RailTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-[12.5px]">{label}</TooltipContent>
    </Tooltip>
  );
}

const compactNumber = (n: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/**
 * Persistent left navigation rail + top-level chrome shared by every
 * authenticated page. Each page renders its own content inside this shell.
 */
export function AppShell({ children, scrollableContent = true, compactNav = false }: AppShellProps) {
  const location = useLocation();
  const { displayName, initials, avatarUrl } = useProfile();
  const { balance, balanceError } = useUserCredits();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const { clearAll } = useGenerationStore();

  const handleSignOut = async () => {
    // Drop cached user data before the session goes.
    clearAll();
    queryClient.clear();
    await signOut();
    toast.success('Signed out successfully');
  };

  const isActive = (item: NavItem) => location.pathname === item.to;
  const wide = useMediaQuery('(min-width: 1280px)');

  if (compactNav || !wide) {
    return (
      <div className="h-dvh w-screen flex overflow-hidden bg-background text-foreground">
        <aside className="w-[68px] shrink-0 flex flex-col items-center gap-6 py-5 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <RailTip label={IDENTITY.appName}>
            <NavLink to="/" aria-label={`${IDENTITY.appName} home`} className="flex items-center justify-center">
              <BrandBadge />
            </NavLink>
          </RailTip>
          <nav className="flex flex-col items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <RailTip key={item.label} label={item.label}>
                  <NavLink
                    to={item.to}
                    aria-label={item.label}
                    className={cn(
                      'relative h-10 w-10 flex items-center justify-center rounded-[12px] transition-smooth',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    )}
                  >
                    {active && <span className="absolute -left-[14px] top-2 bottom-2 w-[3px] rounded-r-full bg-sidebar-primary" />}
                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.75} />
                  </NavLink>
                </RailTip>
              );
            })}
          </nav>
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-2">
            <RailTip label={balance != null ? `Team credits · ${balance.toLocaleString(undefined, { maximumFractionDigits: 1 })}` : 'Team credits'}>
              <div className="w-12 py-1.5 rounded-[10px] border border-sidebar-border bg-sidebar-accent flex flex-col items-center gap-0.5">
                <Coins className="w-3.5 h-3.5 text-sidebar-muted" strokeWidth={2} />
                <span className="font-mono text-[11px] font-medium tabular-nums">{balance != null ? compactNumber(balance) : balanceError ? '—' : '…'}</span>
              </div>
            </RailTip>
            <ThemeToggle />
            <RailTip label={`${displayName} · Settings`}>
              <NavLink to="/settings" className="p-1 rounded-full hover:bg-sidebar-accent transition-smooth">
                <Avatar className="h-[30px] w-[30px]">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{initials}</AvatarFallback>
                </Avatar>
              </NavLink>
            </RailTip>
            <RailTip label="Sign out">
              <button type="button" onClick={handleSignOut} aria-label="Sign out" className="h-8 w-8 flex items-center justify-center rounded-[10px] text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-smooth">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </RailTip>
          </div>
        </aside>
        <main className={cn('flex-1 min-w-0', scrollableContent && 'overflow-y-auto')}>{children}</main>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex overflow-hidden bg-background text-foreground">
      <aside className="w-[232px] shrink-0 flex flex-col gap-7 px-3.5 py-5 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center justify-between px-2">
          <NavLink to="/" aria-label={`${IDENTITY.appName} home`} className="flex flex-col">
            <BrandMark tone="dark" />
            <span className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Studio</span>
          </NavLink>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 h-9 rounded-[10px] text-[14.5px] font-semibold transition-smooth',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="w-[17px] h-[17px]" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex flex-col gap-2.5">
          <div className="px-3 py-2.5 rounded-[10px] bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-1.5 text-[11.5px] text-sidebar-muted">
              <Coins className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              Team credits
            </div>
            <div className="mt-0.5 font-mono text-[15px] font-medium tabular-nums text-sidebar-foreground">
              {balance != null
                ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                : balanceError ? 'Unavailable' : '…'}
              {balance != null && <span className="ml-1 font-sans text-[12px] font-normal text-sidebar-muted">credits</span>}
            </div>
          </div>
          <NavLink to="/settings" className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-smooth">
            <Avatar className="h-[26px] w-[26px] shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-[13px] text-sidebar-foreground/85 truncate">{displayName}</span>
            <SettingsIcon className="w-3.5 h-3.5 text-sidebar-muted ml-auto shrink-0" />
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-smooth"
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
