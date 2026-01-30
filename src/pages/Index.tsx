import { ModeSelector } from '@/components/studio/ModeSelector';
import { ModelSelector } from '@/components/studio/ModelSelector';
import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceUpload } from '@/components/studio/ReferenceUpload';
import { ModelControls } from '@/components/studio/ModelControls';
import { OutputDisplay } from '@/components/studio/OutputDisplay';
import { RatingPanel } from '@/components/studio/RatingPanel';
import { RequestsPanel } from '@/components/studio/RequestsPanel';
import { RequestDetailPanel } from '@/components/studio/RequestDetailPanel';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { UserMenu } from '@/components/studio/UserMenu';
import { BalanceButton } from '@/components/studio/BalanceButton';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import { useGenerationStore } from '@/store/generationStore';
import { Separator } from '@/components/ui/separator';
import oltaflockLogo from '@/assets/oltaflock-logo.jpeg';

const Index = () => {
  const { selectedModel, generationType } = useGenerationStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Compact */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <img src={oltaflockLogo} alt="OltaFlock" className="h-7 w-7 rounded-md object-cover" />
          <h1 className="text-base font-semibold tracking-tight hidden md:block">
            OltaFlock Creative Studio
          </h1>
          <h1 className="text-base font-semibold tracking-tight md:hidden">
            Studio
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <BalanceButton />
          <ThemeToggle />
          <div className="text-[10px] text-muted-foreground font-mono hidden lg:block">
            v1.0
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content - Responsive */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Mode + Requests */}
        <aside className="w-48 lg:w-56 border-r border-border bg-card flex flex-col overflow-hidden shrink-0">
          {/* Mode Selector */}
          <div className="p-2 border-b border-border">
            <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Mode
            </h2>
            <ModeSelector />
          </div>
          
          {/* Requests Header */}
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Requests
            </h2>
          </div>
          
          {/* Requests List */}
          <div className="flex-1 overflow-hidden min-h-0">
            <RequestsPanel />
          </div>
        </aside>

        {/* Center Panel - Controls & Output */}
        <main className="flex-1 flex overflow-hidden min-w-0">
          {/* Left Side - Form Controls */}
          <div className="w-64 lg:w-72 border-r border-border bg-background flex flex-col overflow-hidden shrink-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
              {/* Raw Prompt - Primary input */}
              <PromptInput />

              <Separator />

              {/* Model Selection */}
              <ModelSelector />

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
            <div className="p-3 border-t border-border bg-card shrink-0">
              <GenerateButton />
            </div>
          </div>

          {/* Right Side - Output Preview */}
          <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden min-w-0">
            <OutputDisplay />
            <RatingPanel />
          </div>
        </main>

        {/* Right Panel - Request Details */}
        <aside className="w-64 lg:w-72 border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Request Details
            </h2>
            <p className="text-[9px] text-muted-foreground/70">Debug & Logs</p>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <RequestDetailPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
