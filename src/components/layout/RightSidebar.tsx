import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { RequestsPanel } from '@/components/studio/RequestsPanel';
import { RequestDetailPanel } from '@/components/studio/RequestDetailPanel';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useGenerationStore } from '@/store/generationStore';
import { STUDIO_PANEL, STUDIO_EYEBROW } from './studioSurface';

/** Request history list (top) and the selected request's details (bottom). */
export function RightSidebar() {
  const { showStudioSidebar } = usePreferencesStore();
  const selectedJobId = useGenerationStore((s) => s.selectedJobId);
  if (!showStudioSidebar) return null;

  return (
    <motion.aside
      aria-label="Requests"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="hidden xl:flex w-[290px] 2xl:w-[320px] flex-col gap-4 overflow-hidden shrink-0"
    >
      <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'flex-1 flex flex-col overflow-hidden min-h-0')}>
        <div className="px-4 pt-4 pb-3 border-b border-border/70">
          <h2 className={STUDIO_EYEBROW}>History</h2>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <RequestsPanel />
        </div>
      </motion.div>

      {/* Details only take space once something is selected. */}
      {selectedJobId && (
        <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'flex-1 flex flex-col overflow-hidden min-h-0')}>
          <div className="px-4 pt-4 pb-3 border-b border-border/70">
            <h2 className={STUDIO_EYEBROW}>Details</h2>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <RequestDetailPanel />
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
