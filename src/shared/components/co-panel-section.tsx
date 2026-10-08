import { ChevronDown, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface CoPanelSectionProps {
  /** 分区标题，标题所在区域整块都是折叠触发区。 */
  title: string;
  /** 分区说明。不占版面，挂在标题右侧的 info 图标上，悬浮或聚焦时显示。 */
  description?: string;
  /** 默认是否展开；折叠时只留头部。 */
  defaultOpen?: boolean;
  /** 头部右侧的附加操作，排在折叠箭头左边，不参与折叠触发。 */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * 侧边属性面板里的一片可折叠子面板。
 *
 * 字段多的时候可以逐片收起，避免一路滚到底。卡片外观与折叠前的
 * `<section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">`
 * 保持一致，替换时视觉上只多一个折叠箭头。
 *
 * 说明文字不铺在版面上，收进标题后的 info 气泡里；同时留一份 `sr-only`
 * 副本，保证读屏仍能读到（气泡只在悬浮/聚焦时挂载）。
 */
export function CoPanelSection({
  title,
  description,
  defaultOpen = true,
  actions,
  children,
}: CoPanelSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/panel rounded-lg border border-border/80 bg-background/70 shadow-sm"
    >
      <div className="flex items-start gap-2 px-4 py-4">
        <CollapsibleTrigger className="flex min-w-0 flex-1 flex-col items-start text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-sm font-semibold">{title}</span>
            {description ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground">
                      <Info aria-hidden="true" className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6} className="max-w-56">
                    {description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </span>
          {description ? <span className="sr-only">{description}</span> : null}
        </CollapsibleTrigger>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        <ChevronDown
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/panel:rotate-180"
        />
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
