export type AppRoute = '/template' | '/collage' | '/settings';

export const DEFAULT_ROUTE: AppRoute = '/template';

export function normalizeRoute(pathname: string): AppRoute {
  if (pathname === '/collage' || pathname === '/settings' || pathname === '/template') {
    return pathname;
  }

  return DEFAULT_ROUTE;
}

export function navigate(route: AppRoute) {
  if (window.location.pathname !== route) {
    window.history.pushState({}, '', route);
  }
}
