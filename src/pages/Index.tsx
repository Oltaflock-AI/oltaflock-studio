import { motion, AnimatePresence } from 'framer-motion';
import { staggerItem } from '@/lib/motion';
import { AnimatedPage } from '@/components/ui/animated-page';
import { AppShell } from '@/components/layout/AppShell';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { StudioPageHeader } from '@/components/layout/StudioPageHeader';
import { ControlsPanel } from '@/components/layout/ControlsPanel';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { STUDIO_PANEL } from '@/components/layout/studioSurface';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { RecentGenerations } from '@/components/studio/RecentGenerations';
import { StudioOnboarding } from '@/components/studio/StudioOnboarding';
import { AssistantFab } from '@/components/studio/AssistantFab';
import { useRetryGeneration } from '@/hooks/useRetryGeneration';
import { useGenerations } from '@/hooks/useGenerations';
import { cn } from '@/lib/utils';

const Index = () => {
  const { retry, isRetrying } = useRetryGeneration();
  const { generations, isLoading } = useGenerations();
  const isFirstRun = !isLoading && generations.length === 0;

  return (
    <AppShell scrollableContent={false}>
      <AnimatedPage className="h-full w-full">
        <StudioLayout
          header={<StudioPageHeader />}
          controlsPanel={<ControlsPanel />}
          mainContent={
            <motion.section
              aria-label="Canvas"
              variants={staggerItem}
              initial="hidden"
              animate="visible"
              className="flex-1 flex flex-col gap-3.5 overflow-hidden min-w-[380px]"
            >
              {isFirstRun ? (
                <div className={cn(STUDIO_PANEL, 'flex-1 min-h-0 overflow-y-auto')}>
                  <StudioOnboarding />
                </div>
              ) : (
                <>
                  <div className={cn(STUDIO_PANEL, 'flex-1 min-h-0 overflow-hidden p-4')}>
                    <OutputDisplay onRetry={retry} isRetrying={isRetrying} />
                  </div>
                  <AnimatePresence>
                    <RatingPanel />
                  </AnimatePresence>
                  <RecentGenerations />
                </>
              )}
            </motion.section>
          }
          rightSidebar={<RightSidebar />}
        />
      </AnimatedPage>
      <AssistantFab />
    </AppShell>
  );
};

export default Index;
