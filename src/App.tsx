import { useEffect, useState } from 'react';
import { type AppRoute, CoSidebar } from '@/components/CoSidebar';
import { CoTitlebar } from '@/components/CoTitlebar';
import { Toaster } from '@/components/ui/toaster';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PhotoProvider } from '@/hooks/usePhotos';
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

function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));

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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <CoTitlebar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CoSidebar route={route} onRouteChange={handleRouteChange} />
        <div className="min-w-0 flex-1">
          {route === '/settings' ? (
            <SettingsPage />
          ) : (
            <PhotoProvider key={route}>
              <BusinessWorkbench route={route} />
            </PhotoProvider>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
