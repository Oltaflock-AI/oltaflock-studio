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

export function ModelControls() {
  const { selectedModel } = useGenerationStore();

  if (!selectedModel) return null;

  const controlsMap: Record<string, React.ComponentType> = {
    'nano-banana-pro': NanoBananaProControls,
    'seedream-4.5': Seedream45Controls,
    'flux-flex': FluxFlexControls,
    'flux-flex-pro': FluxFlexProControls,
    'gpt-4o': GPT4oControls,
    'z-image': ZImageControls,
    'veo-3.1': Veo31Controls,
    'sora-2-pro': Sora2ProControls,
    'kling-2.6': Kling26Controls,
    'seedance-1.0': Seedance10Controls,
    'grok-imagine': GrokImagineControls,
  };

  const ControlsComponent = controlsMap[selectedModel];

  if (!ControlsComponent) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
        Model Controls
      </h3>
      <ControlsComponent />
    </div>
  );
}
