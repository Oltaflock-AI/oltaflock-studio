import { ModeSelector } from '@/components/studio/ModeSelector';
import { ModelSelector } from '@/components/studio/ModelSelector';
import { GenerationTypeSelector } from '@/components/studio/GenerationTypeSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { RequestsPanel } from '@/components/studio/RequestsPanel';
import { RequestDetailPanel } from '@/components/studio/RequestDetailPanel';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { useGenerationStore } from '@/store/generationStore';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-semibold tracking-tight">
          Oltaflock AI Studio
        </h1>
        <div className="text-xs text-muted-foreground font-mono">
          Internal Tool v1.0
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Mode + Requests */}
        <aside className="w-64 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Mode Selector */}
          <div className="p-3 border-b border-border">
            <ModeSelector />
          </div>
          
          {/* Requests Header */}
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Requests
            </h2>
          </div>
          
          {/* Requests List */}
          <div className="flex-1 overflow-hidden">
            <RequestsPanel />
          </div>
        </aside>

        {/* Center Panel - Controls & Output */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Side - Form Controls */}
          <div className="w-80 border-r border-border bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Raw Prompt - Primary input */}
              <PromptInput />

              <Separator />

              {/* Model Selection */}
              <ModelSelector />

              {/* Generation Type */}
              {selectedModel && <GenerationTypeSelector />}

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
            <div className="p-4 border-t border-border bg-card">
              <GenerateButton />
            </div>
          </div>

          {/* Right Side - Output Preview */}
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
            <OutputDisplay />
            <RatingPanel />
          </div>
        </main>

        {/* Right Panel - Request Details */}
        <aside className="w-72 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Request Details
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <RequestDetailPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
