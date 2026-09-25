import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { getSpec } from '@catalog/index.ts';
import { ModeSelector } from '@/components/studio/ModeSelector';
import { ModelPicker } from '@/components/studio/ModelPicker';
import { PromptInput } from '@/components/studio/PromptInput';
import { MediaInputs } from '@/components/studio/MediaInputs';
import { SchemaControls } from '@/components/studio/SchemaControls';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { CostPreview } from '@/components/studio/CostPreview';
import { PromptBrainToggle } from '@/components/studio/PromptBrainToggle';
import { useGenerationStore } from '@/store/generationStore';
import { cn } from '@/lib/utils';
import { STUDIO_PANEL, STUDIO_EYEBROW } from './studioSurface';

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h2 className={STUDIO_EYEBROW}>{title}</h2>
      {children}
    </section>
  );
}

/** The generation console: mode → prompt → model → inputs → settings, with a pinned Generate footer. */
export function ControlsPanel() {
  const { selectedModel } = useGenerationStore();
  const spec = selectedModel ? getSpec(selectedModel) : undefined;

  return (
    <motion.section
      aria-label="Generation console"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(STUDIO_PANEL, 'w-full lg:w-[360px] xl:w-[380px] 2xl:w-[420px] flex flex-col lg:overflow-hidden shrink-0')}
    >
      <motion.div variants={staggerItem} className="flex-1 lg:overflow-y-auto min-h-0 px-5 py-5 space-y-6">
        <ModeSelector />

        <Section title="Prompt">
          <PromptInput />
        </Section>

        <Section title="Model">
          <ModelPicker />
        </Section>

        {spec && spec.media.length > 0 && (
          <Section title="Inputs">
            <MediaInputs spec={spec} />
          </Section>
        )}

        {spec && (spec.fields.length > 0 || spec.editors?.length) && (
          <Section title="Settings">
            <SchemaControls key={spec.id} spec={spec} />
          </Section>
        )}
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="shrink-0 border-t border-border/60 px-5 py-4 space-y-3 bg-card rounded-b-[18px] max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:shadow-[0_-6px_16px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between gap-3">
          <PromptBrainToggle />
          <CostPreview />
        </div>
        <GenerateButton />
      </motion.div>
    </motion.section>
  );
}
