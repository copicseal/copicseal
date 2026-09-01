import { type ReactNode, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';

export interface BusinessWorkbenchAssetsRenderProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

interface BusinessWorkbenchProps {
  header: ReactNode;
  workspace: ReactNode;
  assets: (props: BusinessWorkbenchAssetsRenderProps) => ReactNode;
  properties: () => ReactNode;
  assetsMinSize?: number;
  assetsResizable?: boolean;
}

export function BusinessWorkbench({
  header,
  workspace,
  assets,
  properties,
  assetsMinSize = 100,
  assetsResizable = true,
}: BusinessWorkbenchProps) {
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {header}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 min-w-0 flex-1">
        <ResizablePanel minSize={64} className="min-h-0 min-w-0">
          {assetsResizable ? (
            <ResizablePanelGroup orientation="vertical" className="h-full min-h-0 min-w-0">
              <ResizablePanel minSize={56} className="min-h-0 min-w-0">
                {workspace}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={180}
                minSize={assetsMinSize}
                maxSize={300}
                className="min-h-0 min-w-0"
              >
                {assets({
                  collapsed: assetsCollapsed,
                  toggleCollapsed: () => setAssetsCollapsed((value) => !value),
                })}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <div className="min-h-0 min-w-0 flex-1">{workspace}</div>
              <div
                className={cn(
                  'shrink-0 transition-[height] duration-200',
                  assetsCollapsed ? 'h-12' : 'h-[189px]',
                )}
              >
                {assets({
                  collapsed: assetsCollapsed,
                  toggleCollapsed: () => setAssetsCollapsed((value) => !value),
                })}
              </div>
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={280} minSize={200} maxSize={400} className="min-h-0 min-w-0">
          {properties()}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

interface BusinessWorkbenchWorkspaceProps {
  children: ReactNode;
}

export function BusinessWorkbenchWorkspace({ children }: BusinessWorkbenchWorkspaceProps) {
  return (
    <section className="relative flex min-h-0 min-w-0 h-full flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,var(--color-accent),transparent_45%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background),white_55%)_0%,var(--color-background)_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px)] bg-size-[32px_32px] opacity-35" />
      <div className="relative flex h-full w-full min-h-0 min-w-0">{children}</div>
    </section>
  );
}

interface BusinessWorkbenchAssetsPaneProps {
  children: ReactNode;
  className?: string;
}

export function BusinessWorkbenchAssetsPane({
  children,
  className,
}: BusinessWorkbenchAssetsPaneProps) {
  return (
    <section
      className={cn(
        'relative h-full min-h-0 min-w-0 overflow-hidden bg-card p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </section>
  );
}

interface BusinessWorkbenchPropertiesPaneProps {
  children: ReactNode;
}

export function BusinessWorkbenchPropertiesPane({
  children,
}: BusinessWorkbenchPropertiesPaneProps) {
  return <aside className="relative flex h-full min-w-0 flex-col bg-card/90">{children}</aside>;
}
