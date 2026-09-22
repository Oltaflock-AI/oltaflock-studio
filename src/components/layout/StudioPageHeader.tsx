import { motion } from 'framer-motion';
import { slideDown } from '@/lib/motion';
import { BalanceButton } from '@/components/studio/BalanceButton';
import { UserMenu } from '@/components/studio/UserMenu';

/**
 * Studio page title row. Navigation, credits and theme live in AppShell; this
 * keeps the page-specific tools that used to sit in the old top bar: the
 * provider balance check and the account menu (with sign out).
 */
export function StudioPageHeader() {
  return (
    <motion.header
      variants={slideDown}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between gap-4 px-6 2xl:px-8 pt-7 pb-[18px] shrink-0"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="font-serif font-medium text-[28px] leading-tight">Create</h1>
        <p className="text-[13px] text-muted-foreground">Every model, one canvas</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <BalanceButton />
        <UserMenu />
      </div>
    </motion.header>
  );
}
