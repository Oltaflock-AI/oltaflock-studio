import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { TiltCard } from '@/components/effects/TiltCard';
import { ModelSelector } from '@/components/studio/ModelSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { CostPreview } from '@/components/studio/CostPreview';
import { PromptBrainToggle } from '@/components/studio/PromptBrainToggle';
import { useGenerationStore } from '@/store/generationStore';

export function ControlsPanel() {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-[280px] flex flex-col gap-3 overflow-hidden shrink-0"
    >
      {/* Prompt Tile */}
      <motion.div
        variants={staggerItem}
        className="bg-card rounded-xl border border-border/40 shadow-sm p-4 shrink-0"
      >
        <PromptInput />
      </motion.div>

      {/* Model + Controls Tile */}
      <motion.div
        variants={staggerItem}
        className="flex-1 bg-card rounded-xl border border-border/40 shadow-sm flex flex-col overflow-hidden min-h-0"
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <ModelSelector />
          <ReferenceUpload />
          <AnimatePresence>
            {selectedModel && generationType && (
              <motion.div
                key="model-controls"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ModelControls />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Generate Tile */}
      <motion.div variants={staggerItem} className="shrink-0">
        <TiltCard intensity={4} className="bg-card rounded-xl border border-border/40 shadow-sm p-4 space-y-3">
          <PromptBrainToggle />
          <CostPreview />
          <GenerateButton />
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}
