import { createContext, type ReactNode, useContext, useEffect } from 'react';
import type { AppRoute } from '@/app/routes';

/**
 * 跳到某个路由。
 *
 * `targetId` 是目标页里的元素 id：目标页激活后会滚动到它并短暂高亮，
 * 用于「导出完成 → 更改导出目录」这类需要落到具体设置项的跳转。
 */
export type AppNavigate = (route: AppRoute, targetId?: string) => void;

const NavigationContext = createContext<AppNavigate | null>(null);

/**
 * 组件外（如 toast 的按钮回调、导入失败提示）用的兜底引用。
 *
 * 那些地方拿不到 hook，但同样是「用户点了要切页」的入口，所以留一个模块级引用。
 */
let globalNavigate: AppNavigate | null = null;

/** 在组件外跳路由（可带目标元素 id）；没有 Provider 时静默忽略。 */
export function appNavigate(route: AppRoute, targetId?: string): void {
  globalNavigate?.(route, targetId);
}

export function NavigationProvider({
  onNavigate,
  children,
}: {
  onNavigate: AppNavigate;
  children: ReactNode;
}) {
  useEffect(() => {
    globalNavigate = onNavigate;

    return () => {
      globalNavigate = null;
    };
  }, [onNavigate]);

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
