import type { ReactNode } from 'react';

interface StudioLayoutProps {
  header: ReactNode;
  controlsPanel: ReactNode;
  mainContent: ReactNode;
  rightSidebar: ReactNode;
}

/**
 * Studio page frame, rendered inside AppShell's content area: a page header
 * over a three-column workspace (console, canvas, requests). Below `lg` the
 * columns stack and the page scrolls.
 */
export function StudioLayout({ header, controlsPanel, mainContent, rightSidebar }: StudioLayoutProps) {
  return (
    <div className="h-full w-full flex flex-col overflow-y-auto lg:overflow-hidden">
      {header}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 2xl:px-8 pb-6 lg:overflow-hidden lg:min-h-0">
        {controlsPanel}
        {mainContent}
        {rightSidebar}
      </div>
    </div>
  );
}
