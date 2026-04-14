import { AnimatePresence, motion } from 'framer-motion';
import { fadeIn } from '@/lib/motion';
import { useGenerationStore } from '@/store/generationStore';
import { NanoBananaProControls } from './controls/NanoBananaProControls';
import { Seedream45Controls } from './controls/Seedream45Controls';
import { FluxFlexControls } from './controls/FluxFlexControls';
import { FluxFlexProControls } from './controls/FluxFlexProControls';
import { GPT4oControls } from './controls/GPT4oControls';
import { ZImageControls } from './controls/ZImageControls';
import { Veo31Controls } from './controls/Veo31Controls';
import { Sora2ProControls } from './controls/Sora2ProControls';
import { Kling26Controls } from './controls/Kling26Controls';
import { Seedance10Controls } from './controls/Seedance10Controls';
import { GrokImagineControls } from './controls/GrokImagineControls';
// Image-to-Image Controls
import { NanoBananaProI2IControls } from './controls/NanoBananaProI2IControls';
import { Seedream45EditControls } from './controls/Seedream45EditControls';
import { FluxFlexI2IControls } from './controls/FluxFlexI2IControls';
import { FluxProI2IControls } from './controls/FluxProI2IControls';
import { QwenImageEditControls } from './controls/QwenImageEditControls';

export function ModelControls() {
  const { selectedModel } = useGenerationStore();

  if (!selectedModel) return null;

  const controlsMap: Record<string, React.ComponentType> = {
    // Text-to-Image
    'nano-banana-pro': NanoBananaProControls,
    'seedream-4.5': Seedream45Controls,
    'flux-flex': FluxFlexControls,
    'flux-flex-pro': FluxFlexProControls,
    'gpt-4o': GPT4oControls,
    'z-image': ZImageControls,
    // Text-to-Video
    'veo-3.1': Veo31Controls,
    'sora-2-pro': Sora2ProControls,
    'kling-2.6': Kling26Controls,
    'seedance-1.0': Seedance10Controls,
    'grok-imagine': GrokImagineControls,
    // Image-to-Image
    'nano-banana-pro-i2i': NanoBananaProI2IControls,
    'seedream-4.5-edit': Seedream45EditControls,
    'flux-flex-i2i': FluxFlexI2IControls,
    'flux-pro-i2i': FluxProI2IControls,
    'qwen-image-edit': QwenImageEditControls,
  };

  const ControlsComponent = controlsMap[selectedModel];

  if (!ControlsComponent) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
        Model Controls
      </h3>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedModel}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <ControlsComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
