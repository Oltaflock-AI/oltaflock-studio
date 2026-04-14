import { motion, AnimatePresence } from 'framer-motion';
import { staggerItem } from '@/lib/motion';
import { AnimatedPage } from '@/components/ui/animated-page';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { StudioHeader } from '@/components/layout/StudioHeader';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { ControlsPanel } from '@/components/layout/ControlsPanel';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { useRetryGeneration } from '@/hooks/useRetryGeneration';

const Index = () => {
  const { retry, isRetrying } = useRetryGeneration();

  return (
    <AnimatedPage className="h-screen w-screen">
      <StudioLayout
        header={<StudioHeader />}
        leftSidebar={<LeftSidebar />}
        controlsPanel={<ControlsPanel />}
        mainContent={
          <motion.main
            variants={staggerItem}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col gap-3 overflow-hidden min-w-[400px]"
          >
            {/* Output Tile */}
            <div className="flex-1 min-h-0 overflow-hidden bg-card rounded-xl border border-border/40 shadow-sm p-4">
              <OutputDisplay onRetry={retry} isRetrying={isRetrying} />
            </div>
            <AnimatePresence>
              <RatingPanel />
            </AnimatePresence>
          </motion.main>
        }
        rightSidebar={<RightSidebar />}
      />
    </AnimatedPage>
  );
};

export default Index;
