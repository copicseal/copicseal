import { ChevronRight } from 'lucide-react';
import { type ComponentType, type ReactNode, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ControlPanelTab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  content: ReactNode;
}

interface ControlPanelProps {
  tabs: ControlPanelTab[];
  defaultOpen?: string[];
  className?: string;
}

export function ControlPanel({ tabs, defaultOpen = [], className }: ControlPanelProps) {
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set(defaultOpen));

  const toggleTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className={cn('flex min-h-0 flex-col border-l bg-card', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isOpen = openTabs.has(tab.id);

          return (
            <div key={tab.id}>
              <button
                type="button"
                onClick={() => toggleTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2 border-b px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50',
                  isOpen && 'bg-muted/30 font-medium text-foreground',
                  !isOpen && 'text-muted-foreground',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{tab.label}</span>
                <ChevronRight
                  className={cn('size-3 shrink-0 transition-transform', isOpen && 'rotate-90')}
                />
              </button>
              {isOpen && <div>{tab.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
