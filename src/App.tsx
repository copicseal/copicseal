import { useEffect, useState } from 'react';
import { type AppRoute, CoSidebar } from '@/components/CoSidebar';
import { Toaster } from '@/components/ui/toaster';
import { useWindowStyle, WindowStyleProvider } from '@/components/window-style-context';
import CollagePage from '@/features/collage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import TemplatePage from '@/features/template';
import { PhotoProvider } from '@/hooks/usePhotos';
import { cn } from '@/lib/utils';
import './App.css';

const DEFAULT_ROUTE: AppRoute = '/template';

function normalizeRoute(pathname: string): AppRoute {
  if (pathname === '/collage' || pathname === '/settings' || pathname === '/template') {
    return pathname;
  }

  return DEFAULT_ROUTE;
}

function navigate(route: AppRoute) {
  if (window.location.pathname !== route) {
    window.history.pushState({}, '', route);
  }
}

function AppContent() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
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
      <div className="min-h-0 min-w-0 flex-1">
        {route === '/settings' ? (
          <SettingsPage />
        ) : route === '/template' ? (
          <PhotoProvider key={route}>
            <TemplatePage />
          </PhotoProvider>
        ) : (
          <PhotoProvider key={route}>
            <CollagePage />
          </PhotoProvider>
        )}
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
