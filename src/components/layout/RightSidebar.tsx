import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { RequestsPanel } from '@/components/studio/RequestsPanel';
import { RequestDetailPanel } from '@/components/studio/RequestDetailPanel';
import { cn } from '@/lib/utils';
import { STUDIO_PANEL, STUDIO_EYEBROW } from './studioSurface';

/** Request history list (top) and the selected request's details (bottom). */
export function RightSidebar() {
  return (
    <motion.aside
      aria-label="Requests"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-[260px] 2xl:w-[300px] flex flex-col gap-3.5 overflow-hidden shrink-0"
    >
      <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'flex-1 flex flex-col overflow-hidden min-h-0')}>
        <div className="px-5 pt-4 pb-2.5 border-b border-border/50">
          <h2 className={STUDIO_EYEBROW}>History</h2>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <RequestsPanel />
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'flex-1 flex flex-col overflow-hidden min-h-0')}>
        <div className="px-5 pt-4 pb-2.5 border-b border-border/50">
          <h2 className={STUDIO_EYEBROW}>Request details</h2>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <RequestDetailPanel />
        </div>
      </motion.div>
    </motion.aside>
  );
}
