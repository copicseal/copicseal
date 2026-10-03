export type AppRoute = '/template' | '/collage' | '/settings';

export const DEFAULT_ROUTE: AppRoute = '/template';

export function normalizeRoute(pathname: string): AppRoute {
  if (pathname === '/collage' || pathname === '/settings' || pathname === '/template') {
    return pathname;
  }

  return DEFAULT_ROUTE;
}

/**
 * 写入路由。
 *
 * `targetId` 会作为 hash 写进地址栏，目标页读取它来定位到具体设置项；
 * 路由匹配只看 pathname，hash 不参与。
 */
export function navigate(route: AppRoute, targetId?: string) {
  const next = targetId ? `${route}#${targetId}` : route;
  if (`${window.location.pathname}${window.location.hash}` !== next) {
    window.history.pushState({}, '', next);
  }
}
