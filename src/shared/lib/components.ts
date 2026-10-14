import type { PluginState } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

/**
 * 本机组件（插件）的查询入口。
 *
 * 组件是**全局资源**：libheif、exiftool 都可能被多个功能用到，所以功能域只该关心两件事 ——
 * 「现在能不能用」（装了插件里的那份，或者系统里本来就有）。至于下载、校验、解压、
 * 该用 exe 还是 perl 跑，全在插件层（`plugin.rs` + 设置 → 插件页），功能域不必重复实现。
 *
 * 唯一的例外是**参数**：怎么跑起来、传什么参数，是功能自己的事（例如 exiftool 的标签选择）。
 */

/** 取某个组件的状态；组件不存在或读取失败时返回 null。 */
export async function findComponent(id: string): Promise<PluginState | null> {
  try {
    const components = await platformRuntime.listPlugins();

    return components.find((component) => component.id === id) ?? null;
  } catch (error) {
    console.warn(`读取组件状态失败（${id}）:`, error);
    return null;
  }
}

/** 组件现在能不能用：装了插件目录里的那份，或者系统里本来就有。 */
export function isComponentReady(state: PluginState | null): boolean {
  return Boolean(state?.active_version || state?.system_path);
}
