import { LayoutGrid, Settings2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { findNavEntry, visibleNavEntries } from '@/app/nav-entries';
import { type AppRoute, DEFAULT_ROUTE } from '@/app/routes';
import appLogoUrl from '@/assets/logo.svg';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import { resolveNavSettings } from '@/features/tools/lib/tool-settings';
import { MoreToolsDialog } from '@/features/tools/more-tools-dialog';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { useWindowStyle } from '@/shared/providers/window-style-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface CoSidebarProps {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

/** 侧栏图标按钮：导航项与「更多功能」「设置」共用同一套样式。 */
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
  const setHiddenNavEntries = useTemplateStore((state) => state.setHiddenNavEntries);
  const hiddenNavEntries = useTemplateStore((state) => state.hiddenNavEntries);

  /**
   * 启动时把「入口显隐设置」读进 store。
   *
   * 配置里还没有 `tools` 段时套用默认值（常驻页面全显示、小功能按注册表默认），
   * 但不写回配置——只有用户真的动过开关才落盘。
   */
  useEffect(() => {
    let cancelled = false;

    void resolveNavSettings().then((settings) => {
      if (cancelled) {
        return;
      }

      setEnabledTools(settings.enabledTools);
      setHiddenNavEntries(settings.hiddenEntries);
    });

    return () => {
      cancelled = true;
    };
  }, [setEnabledTools, setHiddenNavEntries]);

  const navItems = visibleNavEntries({ enabledTools, hiddenEntries: hiddenNavEntries });

  return (
    <TooltipProvider>
      <MoreToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        activeRoute={route}
        // 面板里把「当前页面」的入口隐藏掉时别把人留在没有侧栏入口的页面上：
        // 回到默认页，避免出现「高亮全无、也点不回自己」的中间态
        onActiveEntryHidden={() => onRouteChange(DEFAULT_ROUTE)}
        onOpenEntry={(id) => {
          const entry = findNavEntry(id);
          if (!entry) {
            return;
          }

          setToolsOpen(false);
          onRouteChange(entry.route);
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
                onClick={() => onRouteChange(DEFAULT_ROUTE)}
                className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-card text-primary shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <img src={appLogoUrl} alt="" className="size-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('common.brand.name')}</TooltipContent>
          </Tooltip>

          <div className="flex flex-col items-center gap-2">
            {/* 可见入口：边框水印（固定）→ 拼图（可隐藏）→ 已启用的小功能 */}
            {navItems.map((entry) => {
              const Icon = entry.icon;

              return (
                <RailButton
                  key={entry.id}
                  active={route === entry.route}
                  label={t(entry.nameKey)}
                  onClick={() => onRouteChange(entry.route)}
                >
                  <Icon className="size-4.5" />
                </RailButton>
              );
            })}

            {/* 「更多功能」：入口的管理面板（加 / 减），本身不是页面 */}
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
