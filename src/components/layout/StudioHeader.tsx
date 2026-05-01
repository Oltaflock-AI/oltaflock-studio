import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Library as LibraryIcon, Sparkles } from 'lucide-react';
import { slideDown } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/studio/UserMenu';
import { BalanceButton } from '@/components/studio/BalanceButton';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import { cn } from '@/lib/utils';
import oltaflockLogo from '@/assets/oltaflock-icon.png';

export function StudioHeader() {
  const location = useLocation();
  const onLibrary = location.pathname.startsWith('/library');

  return (
    <motion.header
      variants={slideDown}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between px-5 py-2.5 bg-background shrink-0 h-14 border-b border-border/40"
    >
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <img
              src={oltaflockLogo}
              alt="Oltaflock"
              className="h-6 w-6 rounded-lg object-cover"
            />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold tracking-tight leading-tight">
              Oltaflock Creative Studio
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              For internal use only
            </p>
          </div>
          <h1 className="text-base font-bold tracking-tight md:hidden">Studio</h1>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 ml-3 border-l border-border/40 pl-3">
          <Button
            asChild
            variant={!onLibrary ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-8 gap-1.5 text-xs font-medium', onLibrary && 'text-muted-foreground')}
          >
            <Link to="/">
              <Sparkles className="h-3.5 w-3.5" />
              Studio
            </Link>
          </Button>
          <Button
            asChild
            variant={onLibrary ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-8 gap-1.5 text-xs font-medium', !onLibrary && 'text-muted-foreground')}
          >
            <Link to="/library">
              <LibraryIcon className="h-3.5 w-3.5" />
              Library
            </Link>
          </Button>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <BalanceButton />
        <ThemeToggle />
        <UserMenu />
      </div>
    </motion.header>
  );
}
