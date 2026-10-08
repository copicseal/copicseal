import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type AppRoute, navigate, normalizeRoute } from '@/app/routes';
import CollagePage from '@/features/collage';
import { SettingsPage } from '@/features/settings';
import TemplatePage from '@/features/template';
import { platformCapabilities } from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { CoSidebar } from '@/shared/components/co-sidebar';
import { I18nProvider, translate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { NavigationProvider } from '@/shared/providers/navigation-provider';
import { PageActivityProvider } from '@/shared/providers/page-activity-provider';
import { PhotoProvider } from '@/shared/providers/photo-provider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { useWindowStyle, WindowStyleProvider } from '@/shared/providers/window-style-provider';
import { Toaster } from '@/shared/ui/toaster';
import './app.css';

function renderPage(route: AppRoute) {
  if (route === '/settings') {
    return <SettingsPage />;
  }

  // Template 与 Collage 各自持有独立的素材会话，因此各挂一份 PhotoProvider。
  return (
    <PhotoProvider>{route === '/template' ? <TemplatePage /> : <CollagePage />}</PhotoProvider>
  );
}

function AppContent() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
  // 访问过的页面保持挂载：页面内容（素材、模板参数、拼图布局）都是 React 会话状态，
  // 一旦卸载就会丢失。切换功能改为只切换可见性，卸载只发生在应用退出时。
  const [visitedRoutes, setVisitedRoutes] = useState<AppRoute[]>(() => [route]);
  const { variant, frameMode } = useWindowStyle();

  useEffect(() => {
    const normalized = normalizeRoute(window.location.pathname);
    if (normalized !== window.location.pathname) {
      navigate(normalized);
    }
    setRoute(normalized);

    const handlePopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setVisitedRoutes((prev) => (prev.includes(route) ? prev : [...prev, route]));
  }, [route]);

  // 启动后静默检查一次更新：失败不打扰用户，发现新版本时提示到设置页安装，
  // 同时把待安装的更新预热给设置页使用。
  useEffect(() => {
    if (!platformCapabilities.system.autoUpdate) return;

    let cancelled = false;

    void (async () => {
      try {
        const update = await platformRuntime.checkForUpdate();
        if (!cancelled && update) {
          // 这条提示在启动时只弹一次、不属于任何一次渲染的派生结果，所以走
          // `translate()` 取当前语言，而不是把 `t` 塞进 effect 依赖里反复触发更新检查。
          toast.info(translate('app.update.available', { version: update.version }), {
            description: translate('app.update.availableHint'),
          });
        }
      } catch {
        // 静默失败：检查更新不应影响启动流程。
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 首次进入某页时 render 早于上面的 effect，这里先补上当前页，避免闪一帧空白。
  const renderedRoutes = visitedRoutes.includes(route) ? visitedRoutes : [...visitedRoutes, route];

  // targetId 会写进地址栏 hash，由目标页读取后定位到对应设置项
  const handleRouteChange = (nextRoute: AppRoute, targetId?: string) => {
    navigate(nextRoute, targetId);
    setRoute(nextRoute);
  };

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-background text-foreground',
        variant === 'win' && frameMode === 'frameless' && 'rounded-lg border border-border',
      )}
      data-window-style={variant}
      data-window-frame-mode={frameMode}
    >
      <CoSidebar route={route} onRouteChange={handleRouteChange} />
      <NavigationProvider onNavigate={handleRouteChange}>
        <div className="relative min-h-0 min-w-0 flex-1">
          {renderedRoutes.map((pageRoute) => {
            const active = pageRoute === route;

            return (
              <PageActivityProvider key={pageRoute} active={active}>
                {/*
                  隐藏页用 visibility 而非 display 保留布局：预览自适应、面板尺寸与滚动位置
                  都依赖真实布局尺寸，保留布局可以让切回时不需要重新测量。
                */}
                <div
                  className={cn(
                    'absolute inset-0 h-full w-full',
                    !active && 'pointer-events-none invisible',
                  )}
                  aria-hidden={!active}
                  inert={!active}
                >
                  {renderPage(pageRoute)}
                </div>
              </PageActivityProvider>
            );
          })}
        </div>
        {/* Toaster 放在 Provider 内部：toast 的描述节点由 Toaster 渲染，上下文按渲染
            位置解析，放外面的话里面的「更改」跳转按钮拿不到导航函数 */}
        <Toaster />
      </NavigationProvider>
    </div>
  );
}

function App() {
  return (
    // I18nProvider / ThemeProvider 放最外层：toast、侧栏、窗口外壳都要能取到当前语言与外观
    <I18nProvider>
      <ThemeProvider>
        <WindowStyleProvider>
          <AppContent />
        </WindowStyleProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
