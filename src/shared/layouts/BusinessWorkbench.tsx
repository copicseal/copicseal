import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
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
        <ResizablePanel defaultSize={74} minSize={64} className="min-h-0 min-w-0">
          <ResizablePanelGroup orientation="vertical" className="h-full min-h-0 min-w-0">
            <ResizablePanel defaultSize={76} minSize={56} className="min-h-0 min-w-0">
              {workspace}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={24} minSize={12} maxSize={40} className="min-h-0 min-w-0">
              {assets({
                collapsed: assetsCollapsed,
                toggleCollapsed: () => setAssetsCollapsed((value) => !value),
              })}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={26} minSize={22} maxSize={36} className="min-h-0 min-w-0">
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
    <section className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden border border-r-0 border-b-0 border-border/80 bg-[radial-gradient(circle_at_top,_var(--color-accent),transparent_45%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background),white_55%)_0%,var(--color-background)_100%)] p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
      <div className="relative flex h-full w-full min-h-0 min-w-0">{children}</div>
    </section>
  );
}

interface BusinessWorkbenchAssetsPaneProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: ReactNode;
}

export function BusinessWorkbenchAssetsPane({
  collapsed,
  onToggleCollapse,
  children,
}: BusinessWorkbenchAssetsPaneProps) {
  return (
    <section className="relative min-w-0 border border-r-0 border-border/80 bg-card p-4 shadow-sm">
      <div className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={onToggleCollapse}>
          {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>
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
  return (
    <aside className="relative flex h-full min-w-0 flex-col border-l border-border/80 bg-card/90">
      {children}
    </aside>
  );
}
