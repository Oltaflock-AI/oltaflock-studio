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
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Refined with subtle elevation */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-card shrink-0 h-12 elevation-panel border-b border-border/50">
        <div className="flex items-center gap-3">
          <img src={oltaflockLogo} alt="OltaFlock" className="h-6 w-6 rounded-lg object-cover shadow-sm" />
          <h1 className="text-sm font-semibold tracking-tight hidden md:block">
            OltaFlock Creative Studio
          </h1>
          <h1 className="text-sm font-semibold tracking-tight md:hidden">
            Studio
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <BalanceButton />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Main Content - Refined panel widths */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Mode + Requests (w-48 = 192px) */}
        <aside className="w-48 border-r border-border/50 bg-card flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/50">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Mode
            </h2>
            <ModeSelector />
          </div>
          
          <div className="px-3 py-2 border-b border-border/50">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              History
            </h2>
          </div>
          
          <div className="flex-1 overflow-hidden min-h-0">
            <RequestsPanel />
          </div>
        </aside>

        {/* Center - Controls (w-72 = 288px) */}
        <div className="w-72 border-r border-border/50 bg-background flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
            <PromptInput />
            <Separator className="bg-border/50" />
            <ModelSelector />
            <ReferenceUpload />
            {selectedModel && generationType && (
              <>
                <Separator className="bg-border/50" />
                <ModelControls />
              </>
            )}
          </div>
          <div className="p-4 border-t border-border/50 bg-card/50 shrink-0">
            <GenerateButton />
          </div>
        </div>

        {/* Center - Output Preview (FLEXIBLE - Hero) */}
        <main className="flex-1 flex flex-col p-5 gap-4 overflow-hidden min-w-[400px]">
          <div className="flex-1 min-h-0 overflow-hidden">
            <OutputDisplay />
          </div>
          <RatingPanel />
        </main>

        {/* Right Sidebar - Request Details (w-72 = 288px) */}
        <aside className="w-72 border-l border-border/50 bg-card flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-border/50">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Request Details
            </h2>
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
