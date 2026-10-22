import { DEFAULT_NAV_SETTINGS, type NavSettings } from '@/app/nav-entries';
import { platformRuntime } from '@/platform/providers/platform-runtime';

/**
 * 读取侧栏 / 「更多功能」面板的显隐设置（`config.tools`）。
 *
 * 老配置里没有 `tools` 段（该字段是后加的）时套用默认值——常驻页面默认显示、
 * 小功能按注册表自带的默认启用状态；这里**不写回配置**，只有用户真的动过开关才落盘。
 */
export async function resolveNavSettings(): Promise<NavSettings> {
  try {
    const config = await platformRuntime.getConfig();

    return {
      enabledTools: config.tools?.enabled ?? DEFAULT_NAV_SETTINGS.enabledTools,
      hiddenEntries: config.tools?.hidden ?? [],
    };
  } catch (error) {
    console.warn('读取导航入口设置失败:', error);
    return DEFAULT_NAV_SETTINGS;
  }
}

/**
 * 把显隐设置写回配置（读-改-写，只动 `tools` 段）。
 *
 * 面板不在设置页里，拿不到设置页的 `configRef`，所以重新读一次配置再合并，
 * 避免把其它设置覆盖成旧值。
 */
export async function saveNavSettings(settings: NavSettings): Promise<NavSettings> {
  const config = await platformRuntime.getConfig();
  const next: NavSettings = {
    enabledTools: [...settings.enabledTools],
    hiddenEntries: [...settings.hiddenEntries],
  };

  await platformRuntime.updateConfig({
    ...config,
    tools: { enabled: next.enabledTools, hidden: next.hiddenEntries },
  });

  return next;
}
