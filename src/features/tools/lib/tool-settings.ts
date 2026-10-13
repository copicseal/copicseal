import { platformRuntime } from '@/platform/providers/platform-runtime';

/**
 * 读取「更多功能」里已启用的小功能 id。
 *
 * 老配置里没有 `tools` 段（该字段是后加的）：返回 null 表示「配置里还没有这段」，
 * 调用方据此套用功能自带的默认启用状态，而不是当成「用户全关掉了」。
 */
export async function resolveEnabledTools(): Promise<string[] | null> {
  try {
    const config = await platformRuntime.getConfig();
    return config.tools?.enabled ?? null;
  } catch (error) {
    console.warn('读取小功能开关失败:', error);
    return null;
  }
}

/**
 * 把已启用的小功能写回配置（读-改-写，只动 `tools` 段）。
 *
 * 面板不在设置页里，拿不到设置页的 `configRef`，所以重新读一次配置再合并，
 * 避免把其它设置覆盖成旧值。
 */
export async function saveEnabledTools(enabled: readonly string[]): Promise<string[]> {
  const config = await platformRuntime.getConfig();
  const next = [...enabled];

  await platformRuntime.updateConfig({ ...config, tools: { enabled: next } });

  return next;
}
