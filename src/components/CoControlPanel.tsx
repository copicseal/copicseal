import type { ComponentType, ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  return (
    <div className={cn('flex min-h-0 flex-col border-l bg-card', className)}>
      <Accordion
        type="multiple"
        defaultValue={defaultOpen}
        className="min-h-0 flex-1 overflow-y-auto rounded-none border-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <AccordionItem key={tab.id} value={tab.id} className="border-b">
              <AccordionTrigger className="gap-2 px-3 py-2 hover:no-underline data-open:bg-muted/30 data-open:font-medium">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left">{tab.label}</span>
              </AccordionTrigger>
              <AccordionContent className="px-0">{tab.content}</AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
