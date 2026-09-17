import { createContext, type FC, type ReactNode, useContext, useMemo } from 'react';

/**
 * 页面是否处于可见状态。
 *
 * 功能页改为常驻挂载后，隐藏页仍然活着，因此必须显式区分“挂载”与“激活”：
 * 隐藏页要暂停一切全局副作用（原生拖放、快捷键、粘贴），否则后台页面会
 * 抢同一个事件，例如拖入图片会同时写入两个页面的素材区。
 */
const PageActivityContext = createContext(true);

export const PageActivityProvider: FC<{ active: boolean; children: ReactNode }> = ({
  active,
  children,
}) => {
  const value = useMemo(() => active, [active]);

  return <PageActivityContext.Provider value={value}>{children}</PageActivityContext.Provider>;
};

/** 读取当前页面是否可见；未包裹 Provider 时默认视为激活。 */
export function usePageActive(): boolean {
  return useContext(PageActivityContext);
}
