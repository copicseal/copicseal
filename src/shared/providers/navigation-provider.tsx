import { createContext, type ReactNode, useContext } from 'react';
import type { AppRoute } from '@/app/routes';

/**
 * 跳到某个路由。
 *
 * `targetId` 是目标页里的元素 id：目标页激活后会滚动到它并短暂高亮，
 * 用于「导出完成 → 更改导出目录」这类需要落到具体设置项的跳转。
 */
export type AppNavigate = (route: AppRoute, targetId?: string) => void;

const NavigationContext = createContext<AppNavigate | null>(null);

export function NavigationProvider({
  onNavigate,
  children,
}: {
  onNavigate: AppNavigate;
  children: ReactNode;
}) {
  return <NavigationContext.Provider value={onNavigate}>{children}</NavigationContext.Provider>;
}

/** 取路由跳转函数。侧边栏之外的深层组件（如 toast 里的按钮）靠它切页。 */
export function useAppNavigation(): AppNavigate {
  const navigate = useContext(NavigationContext);
  if (!navigate) {
    throw new Error('useAppNavigation must be used within NavigationProvider');
  }

  return navigate;
}
