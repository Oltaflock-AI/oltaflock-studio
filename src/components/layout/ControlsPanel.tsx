import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { ModeSelector } from '@/components/studio/ModeSelector';
import { ModelSelector } from '@/components/studio/ModelSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { CostPreview } from '@/components/studio/CostPreview';
import { PromptBrainToggle } from '@/components/studio/PromptBrainToggle';
import { useGenerationStore } from '@/store/generationStore';
import { cn } from '@/lib/utils';
import { STUDIO_PANEL } from './studioSurface';

/** The generation console: mode, prompt, model + per-model controls, and the Generate CTA. */
export function ControlsPanel() {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <motion.section
      aria-label="Generation console"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-[320px] 2xl:w-[340px] flex flex-col gap-3.5 overflow-hidden shrink-0"
    >
      {/* Prompt card: mode pills + prompt */}
      <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'px-5 py-[18px] shrink-0 space-y-4')}>
        <ModeSelector />
        <PromptInput />
      </motion.div>

      {/* Model + controls card */}
      <motion.div
        variants={staggerItem}
        className={cn(STUDIO_PANEL, 'flex-1 flex flex-col overflow-hidden min-h-0')}
      >
        <div className="flex-1 overflow-y-auto px-5 py-[18px] space-y-4 min-h-0">
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

      {/* Generate card */}
      <motion.div variants={staggerItem} className={cn(STUDIO_PANEL, 'shrink-0 px-5 py-4 space-y-3')}>
        <PromptBrainToggle />
        <CostPreview />
        <GenerateButton />
      </motion.div>
    </motion.section>
  );
}
