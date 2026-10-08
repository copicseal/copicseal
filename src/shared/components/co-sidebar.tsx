import { Grid3x3, LayoutTemplate, Settings2 } from 'lucide-react';
import type { AppRoute } from '@/app/routes';
import appLogoUrl from '@/assets/logo.svg';
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

export function CoSidebar({ route, onRouteChange }: CoSidebarProps) {
  const t = useTranslate();
  const { variant } = useWindowStyle();

  return (
    <TooltipProvider>
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
              const active = route === item.route;

              return (
                <Tooltip key={item.route}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t(item.labelKey)}
                      onClick={() => onRouteChange(item.route)}
                      className={cn(
                        'flex size-11 items-center justify-center rounded-2xl border transition-all',
                        active
                          ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_var(--color-primary)]'
                          : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t(item.labelKey)}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className="mt-auto px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('common.nav.settings')}
                onClick={() => onRouteChange('/settings')}
                className={cn(
                  'flex size-11 items-center justify-center rounded-2xl border transition-all',
                  route === '/settings'
                    ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_var(--color-primary)]'
                    : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground',
                )}
              >
                <Settings2 className="size-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('common.nav.settings')}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
