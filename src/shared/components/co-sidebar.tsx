import { Grid3x3, LayoutGrid, LayoutTemplate, Settings2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { type AppRoute, toolRoute } from '@/app/routes';
import appLogoUrl from '@/assets/logo.svg';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import { resolveEnabledTools } from '@/features/tools/lib/tool-settings';
import { MoreToolsDialog } from '@/features/tools/more-tools-dialog';
import { findTool, TOOLS, type ToolDefinition } from '@/features/tools/registry';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { useWindowStyle } from '@/shared/providers/window-style-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface CoSidebarProps {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

const items: Array<{
  route: AppRoute;
  labelKey: MessageKey;
  icon: typeof LayoutTemplate;
}> = [
  { route: '/template', labelKey: 'common.nav.template', icon: LayoutTemplate },
  { route: '/collage', labelKey: 'common.nav.collage', icon: Grid3x3 },
];

/** 侧栏图标按钮：导航项与「更多功能」共用同一套样式，避免三处各写一份类名。 */
function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'flex size-11 items-center justify-center rounded-2xl border transition-all',
            active
              ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_var(--color-primary)]'
              : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CoSidebar({ route, onRouteChange }: CoSidebarProps) {
  const t = useTranslate();
  const { variant } = useWindowStyle();
  const [toolsOpen, setToolsOpen] = useState(false);
  const setEnabledTools = useTemplateStore((state) => state.setEnabledTools);
  const enabledTools = useTemplateStore((state) => state.enabledTools);

  /**
   * 启动时把「已启用的小功能」读进 store。
   *
   * 配置里还没有 `tools` 段时套用注册表里的默认值（而不是当成「用户全关掉了」），
   * 但不写回配置——只有用户真的动过开关才落盘。
   */
  useEffect(() => {
    let cancelled = false;

    void resolveEnabledTools().then((enabled) => {
      if (cancelled) {
        return;
      }

      setEnabledTools(
        enabled ?? TOOLS.filter((tool) => tool.defaultEnabled).map((tool) => tool.id),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [setEnabledTools]);

  // 已添加的功能会各占一个侧栏图标（注册表里已删掉的 id 自动忽略）
  const toolItems = enabledTools
    .map((id) => findTool(id))
    .filter((tool): tool is ToolDefinition => Boolean(tool));

  return (
    <TooltipProvider>
      <MoreToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        onOpenTool={(id) => {
          setToolsOpen(false);
          onRouteChange(toolRoute(id));
        }}
      />
      <aside
        className="flex h-full w-[72px] shrink-0 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-muted),white_15%)_0%,var(--color-background)_100%)] pb-4"
        data-tauri-drag-region
      >
        <div
          className={cn('shrink-0', variant === 'win' ? 'h-3' : 'h-10')}
          data-tauri-drag-region
        />
        <div className="flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('common.brand.name')}
                onClick={() => onRouteChange('/template')}
                className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-card text-primary shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <img src={appLogoUrl} alt="" className="size-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('common.brand.name')}</TooltipContent>
          </Tooltip>

          <div className="flex flex-col items-center gap-2">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <RailButton
                  key={item.route}
                  active={route === item.route}
                  label={t(item.labelKey)}
                  onClick={() => onRouteChange(item.route)}
                >
                  <Icon className="size-4.5" />
                </RailButton>
              );
            })}

            {/* 已添加的小功能：与「边框」「拼图」同级，点进去是独立页面 */}
            {toolItems.map((tool) => {
              const Icon = tool.icon;
              const path = toolRoute(tool.id);

              return (
                <RailButton
                  key={tool.id}
                  active={route === path}
                  label={t(tool.nameKey)}
                  onClick={() => onRouteChange(path)}
                >
                  <Icon className="size-4.5" />
                </RailButton>
              );
            })}

            {/* 「更多功能」：小功能的管理入口（加 / 减），本身不是页面 */}
            <RailButton
              active={false}
              label={t('common.tools.title')}
              onClick={() => setToolsOpen(true)}
            >
              <LayoutGrid className="size-4.5" />
            </RailButton>
          </div>
        </div>

        <div className="mt-auto px-3">
          <RailButton
            active={route === '/settings'}
            label={t('common.nav.settings')}
            onClick={() => onRouteChange('/settings')}
          >
            <Settings2 className="size-4.5" />
          </RailButton>
        </div>
      </aside>
    </TooltipProvider>
  );
}
