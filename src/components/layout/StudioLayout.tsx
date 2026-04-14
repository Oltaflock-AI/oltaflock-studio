import type { ReactNode } from 'react';

interface StudioLayoutProps {
  header: ReactNode;
  leftSidebar: ReactNode;
  controlsPanel: ReactNode;
  mainContent: ReactNode;
  rightSidebar: ReactNode;
}

export function StudioLayout({
  header,
  leftSidebar,
  controlsPanel,
  mainContent,
  rightSidebar,
}: StudioLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-muted/30 overflow-hidden">
      {header}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">
        {leftSidebar}
        {controlsPanel}
        {mainContent}
        {rightSidebar}
      </div>
    </div>
  );
}
