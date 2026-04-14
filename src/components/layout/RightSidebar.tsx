import { motion } from 'framer-motion';
import { staggerItem } from '@/lib/motion';
import { RequestDetailPanel } from '@/components/studio/RequestDetailPanel';

export function RightSidebar() {
  return (
    <motion.aside
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      className="w-72 bg-card rounded-xl border border-border/40 shadow-sm flex flex-col overflow-hidden shrink-0"
    >
      <div className="px-4 py-3 border-b border-border/30">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Request Details
        </h2>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <RequestDetailPanel />
      </div>
    </motion.aside>
  );
}
