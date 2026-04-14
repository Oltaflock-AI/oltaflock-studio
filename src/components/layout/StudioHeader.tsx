import { motion } from 'framer-motion';
import { slideDown } from '@/lib/motion';
import { UserMenu } from '@/components/studio/UserMenu';
import { BalanceButton } from '@/components/studio/BalanceButton';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import oltaflockLogo from '@/assets/oltaflock-icon.png';

export function StudioHeader() {
  return (
    <motion.header
      variants={slideDown}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between px-5 py-2.5 bg-background shrink-0 h-14 border-b border-border/40"
    >
      <div className="flex items-center gap-3">
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
        <h1 className="text-base font-bold tracking-tight md:hidden">
          Studio
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <BalanceButton />
        <ThemeToggle />
        <UserMenu />
      </div>
    </motion.header>
  );
}
