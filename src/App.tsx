import { useEffect, useState } from 'react';
import { type AppRoute, CoSidebar } from '@/components/CoSidebar';
import { Toaster } from '@/components/ui/toaster';
import { useWindowStyle, WindowStyleProvider } from '@/components/window-style-context';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PhotoProvider } from '@/hooks/usePhotos';
import { cn } from '@/lib/utils';
import { BusinessWorkbench } from '@/shared/layouts/BusinessWorkbench';
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
  const { variant } = useWindowStyle();

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
        variant === 'win' && 'rounded-lg border border-border',
      )}
      data-window-style={variant}
    >
      <CoSidebar route={route} onRouteChange={handleRouteChange} />
      <div className="min-h-0 min-w-0 flex-1">
        {route === '/settings' ? (
          <SettingsPage />
        ) : (
          <PhotoProvider key={route}>
            <BusinessWorkbench route={route} />
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
