import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { ModeSelector } from '@/components/studio/ModeSelector';
import { RequestsPanel } from '@/components/studio/RequestsPanel';

export function LeftSidebar() {
  return (
    <motion.aside
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-52 flex flex-col gap-3 overflow-hidden shrink-0"
    >
      {/* Mode Tile */}
      <motion.div
        variants={staggerItem}
        className="bg-card rounded-xl border border-border/40 shadow-sm p-3 shrink-0"
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          Mode
        </h2>
        <ModeSelector />
      </motion.div>

      {/* History Tile */}
      <motion.div
        variants={staggerItem}
        className="flex-1 bg-card rounded-xl border border-border/40 shadow-sm flex flex-col overflow-hidden min-h-0"
      >
        <div className="px-3.5 py-2.5 border-b border-border/30">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            History
          </h2>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <RequestsPanel />
        </div>
      </motion.div>
    </motion.aside>
  );
}
