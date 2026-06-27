import { check } from '@tauri-apps/plugin-updater';
import {
  Grid3x3,
  LayoutTemplate,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type AppRoute = '/template' | '/collage' | '/settings';

interface CoSidebarProps {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

const items: Array<{
  route: AppRoute;
  label: string;
  icon: typeof LayoutTemplate;
}> = [
  { route: '/template', label: '边框水印', icon: LayoutTemplate },
  { route: '/collage', label: '拼图', icon: Grid3x3 },
  { route: '/settings', label: '设置', icon: Settings2 },
];

export function CoSidebar({ route, onRouteChange }: CoSidebarProps) {
  const handleCheckUpdate = async () => {
    const notificationId = toast.loading('检查更新中...');

    try {
      const update = await check();
      if (update) {
        toast.success(`发现新版本 ${update.version}`, { id: notificationId });
      } else {
        toast.success('已是最新版本', { id: notificationId });
      }
    } catch {
      toast.error('检查更新失败', { id: notificationId });
    }
  };

  return (
    <aside className="flex h-full w-[72px] shrink-0 flex-col border-r border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-muted),white_15%)_0%,var(--color-background)_100%)] py-4">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          title="Copicseal"
          onClick={() => onRouteChange('/template')}
          className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-card text-primary shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Sparkles className="size-5" />
        </button>

        <div className="flex flex-col items-center gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = route === item.route;

            return (
              <button
                key={item.route}
                type="button"
                title={item.label}
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
            );
          })}
        </div>
      </div>

      <div className="mt-auto px-3">
        <button
          type="button"
          title="检查更新"
          onClick={handleCheckUpdate}
          className="flex size-11 items-center justify-center rounded-2xl border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground"
        >
          <RefreshCw className="size-4.5" />
        </button>
      </div>
    </aside>
  );
}
