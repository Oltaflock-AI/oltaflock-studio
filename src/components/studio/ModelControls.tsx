import { useGenerationStore } from '@/store/generationStore';
import { NanoBananaProControls } from './controls/NanoBananaProControls';
import { Seedream45Controls } from './controls/Seedream45Controls';

export function ModelControls() {
  const { selectedModel } = useGenerationStore();

  if (!selectedModel) return null;

  const controlsMap: Record<string, React.ComponentType> = {
    'nano-banana-pro': NanoBananaProControls,
    'seedream-4.5': Seedream45Controls,
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
