import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { AnimatedPage } from '@/components/ui/animated-page';
import { AppShell } from '@/components/layout/AppShell';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { StudioOnboarding } from '@/components/studio/StudioOnboarding';
import { AssistantFab } from '@/components/studio/AssistantFab';
import { HistoryRail } from '@/components/studio/stage/HistoryRail';
import { StudioCanvas } from '@/components/studio/stage/StudioCanvas';
import { PromptDock } from '@/components/studio/stage/PromptDock';
import { DetailsPanel } from '@/components/studio/stage/DetailsCard';
import { useGenerations } from '@/hooks/useGenerations';
import { useGenerationStore } from '@/store/generationStore';
import { useElementSize } from '@/hooks/useElementSize';

/**
 * Studio: history rail, full-height canvas with a floating prompt dock, and
 * the selected generation's details in a drawer over the canvas.
 */
const Index = () => {
  const { generations, isLoading } = useGenerations();
  const { selectedJobId, setSelectedJobId } = useGenerationStore();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selected = generations.find((g) => g.id === selectedJobId);
  const isFirstRun = !isLoading && generations.length === 0;
  // The dock grows with the prompt and wraps on narrow screens, so what sits above it is placed from its real height.
  const dockRef = useRef<HTMLDivElement>(null);
  const dockHeight = useElementSize(dockRef).height || 130;

  // Returning users land on their newest output.
  useEffect(() => {
    if (!selectedJobId && generations[0]) setSelectedJobId(generations[0].id);
  }, [generations, selectedJobId, setSelectedJobId]);

  return (
    <AppShell scrollableContent={false}>
      <AnimatedPage className="h-full w-full">
        <div className="flex h-full gap-4 p-4 2xl:p-5">
          <HistoryRail />

          <StudioCanvas className="min-w-0 flex-1 rounded-[20px]" bottomInset={dockHeight + 20} topInset={40}>
            <h1 className="pointer-events-none absolute left-5 top-4 z-20 font-serif text-[28px] leading-none text-stage-foreground">Create</h1>

            {isFirstRun && (
              <div className="absolute inset-x-0 top-14 z-10 flex items-center justify-center px-6" style={{ bottom: dockHeight + 40 }}>
                <div className="max-h-full w-full max-w-[720px] overflow-y-auto rounded-[20px] bg-card text-foreground shadow-2xl">
                  <StudioOnboarding />
                </div>
              </div>
            )}

            {selected && (
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                aria-expanded={detailsOpen}
                className="absolute right-4 top-4 z-30 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3.5 text-[12.5px] font-medium text-white/90 backdrop-blur-md transition-smooth hover:text-white"
              >
                {detailsOpen ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />} Details
              </button>
            )}

            <AnimatePresence>
              {detailsOpen && selected && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  style={{ bottom: dockHeight + 34 }}
                  className="absolute right-4 top-16 z-30 w-[min(360px,calc(100%-32px))] overflow-y-auto rounded-[18px] border border-border/60 bg-card/95 p-4 text-foreground shadow-[0_24px_70px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
                >
                  <DetailsPanel g={selected} />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={dockRef} className="absolute bottom-5 left-1/2 z-30 w-[min(900px,calc(100%-40px))] -translate-x-1/2 space-y-2">
              <AnimatePresence>
                <RatingPanel />
              </AnimatePresence>
              <PromptDock />
            </div>
          </StudioCanvas>
        </div>
      </AnimatedPage>
      {/* Below xl the nav rail already has the Assistant, and the button would cover Generate. */}
      <AssistantFab className="hidden xl:flex" />
    </AppShell>
  );
};

export default Index;
