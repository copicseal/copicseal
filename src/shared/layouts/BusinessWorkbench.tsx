import { type ReactNode, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export interface BusinessWorkbenchAssetsRenderProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

interface BusinessWorkbenchProps {
  header: ReactNode;
  workspace: ReactNode;
  assets: (props: BusinessWorkbenchAssetsRenderProps) => ReactNode;
  properties: () => ReactNode;
}

export function BusinessWorkbench({
  header,
  workspace,
  assets,
  properties,
}: BusinessWorkbenchProps) {
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {header}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 min-w-0 flex-1">
        <ResizablePanel minSize={64} className="min-h-0 min-w-0">
          <ResizablePanelGroup orientation="vertical" className="h-full min-h-0 min-w-0">
            <ResizablePanel minSize={56} className="min-h-0 min-w-0">
              {workspace}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={180}
              minSize={100}
              maxSize={300}
              className="min-h-0 min-w-0"
            >
              {assets({
                collapsed: assetsCollapsed,
                toggleCollapsed: () => setAssetsCollapsed((value) => !value),
              })}
            </ResizablePanel>
          </ResizablePanelGroup>
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
    <section className="relative flex min-h-0 min-w-0 h-full flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,var(--color-accent),transparent_45%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background),white_55%)_0%,var(--color-background)_100%)] p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px)] bg-size-[32px_32px] opacity-35" />
      <div className="relative flex h-full w-full min-h-0 min-w-0">{children}</div>
    </section>
  );
}

interface BusinessWorkbenchAssetsPaneProps {
  children: ReactNode;
}

export function BusinessWorkbenchAssetsPane({ children }: BusinessWorkbenchAssetsPaneProps) {
  return <section className="relative min-w-0 bg-card p-4 shadow-sm">{children}</section>;
}

interface BusinessWorkbenchPropertiesPaneProps {
  children: ReactNode;
}

export function BusinessWorkbenchPropertiesPane({
  children,
}: BusinessWorkbenchPropertiesPaneProps) {
  return <aside className="relative flex h-full min-w-0 flex-col bg-card/90">{children}</aside>;
}
