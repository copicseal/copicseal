import { findTool } from '@/features/tools/registry';

/** 小功能页面是动态路由：`/tools/<id>`，与「边框」「拼图」同级。 */
export type AppRoute = '/template' | '/collage' | '/settings' | `/tools/${string}`;

export const DEFAULT_ROUTE: AppRoute = '/template';

/** 小功能的页面路径。 */
export function toolRoute(toolId: string): AppRoute {
  return `/tools/${toolId}`;
}

export function normalizeRoute(pathname: string): AppRoute {
  if (pathname === '/collage' || pathname === '/settings' || pathname === '/template') {
    return pathname;
  }

  // 小功能页：只有注册表认识的 id 才算合法（配置里残留、手改地址栏都回落默认页）
  if (pathname.startsWith('/tools/') && findTool(pathname.slice('/tools/'.length))) {
    return pathname as AppRoute;
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
