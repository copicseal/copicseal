import { useEffect, useState } from 'react';
import { type AppRoute, navigate, normalizeRoute } from '@/app/routes';
import CollagePage from '@/features/collage';
import { SettingsPage } from '@/features/settings';
import TemplatePage from '@/features/template';
import { CoSidebar } from '@/shared/components/co-sidebar';
import { cn } from '@/shared/lib/utils';
import { PhotoProvider } from '@/shared/providers/photo-provider';
import { useWindowStyle, WindowStyleProvider } from '@/shared/providers/window-style-provider';
import { Toaster } from '@/shared/ui/toaster';
import './app.css';

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
