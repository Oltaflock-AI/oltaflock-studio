import { ModeToggle } from '@/components/studio/ModeToggle';
import { ModelSelector } from '@/components/studio/ModelSelector';
import { GenerationTypeSelector } from '@/components/studio/GenerationTypeSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { useGenerationStore } from '@/store/generationStore';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight">
            Oltaflock Studio
          </h1>
          <Separator orientation="vertical" className="h-6" />
          <ModeToggle />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Internal Tool v1.0
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <aside className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Model Selection */}
            <ModelSelector />

            {/* Generation Type */}
            {selectedModel && <GenerationTypeSelector />}

            {/* Prompt Input */}
            {selectedModel && generationType && <PromptInput />}

            {/* Reference Upload */}
            <ReferenceUpload />

            {/* Model-specific Controls */}
            {selectedModel && generationType && (
              <>
                <Separator />
                <ModelControls />
              </>
            )}
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-border">
            <GenerateButton />
          </div>
        </aside>

        {/* Center - Output Display */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <OutputDisplay />
          <RatingPanel />
        </main>

        {/* Right Panel - History */}
        <aside className="w-72 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              History
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <HistoryPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
