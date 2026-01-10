import { ModelSelector } from '@/components/studio/ModelSelector';
import { GenerationTypeSelector } from '@/components/studio/GenerationTypeSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { MetadataPanel } from '@/components/studio/MetadataPanel';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { useGenerationStore } from '@/store/generationStore';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon } from 'lucide-react';

const Index = () => {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Oltaflock AI Studio
          </h1>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span>Image Generation</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Internal Tool v1.0
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - History */}
        <aside className="w-64 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Generation History
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <HistoryPanel />
          </div>
        </aside>

        {/* Center Panel - Controls & Output */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Form Controls */}
            <div className="w-80 border-r border-border bg-background flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Raw Prompt - Shown First for emphasis */}
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
          </div>
        </main>

        {/* Right Panel - Metadata */}
        <aside className="w-72 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Details
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <MetadataPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
