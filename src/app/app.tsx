import { useEffect, useState } from 'react';
import { type AppRoute, navigate, normalizeRoute } from '@/app/routes';
import CollagePage from '@/features/collage';
import { SettingsPage } from '@/features/settings';
import TemplatePage from '@/features/template';
import { CoSidebar } from '@/shared/components/co-sidebar';
import { cn } from '@/shared/lib/utils';
import { PageActivityProvider } from '@/shared/providers/page-activity-provider';
import { PhotoProvider } from '@/shared/providers/photo-provider';
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

  // 首次进入某页时 render 早于上面的 effect，这里先补上当前页，避免闪一帧空白。
  const renderedRoutes = visitedRoutes.includes(route) ? visitedRoutes : [...visitedRoutes, route];

  const handleRouteChange = (nextRoute: AppRoute) => {
    navigate(nextRoute);
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
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <WindowStyleProvider>
      <AppContent />
    </WindowStyleProvider>
  );
}

export default App;
