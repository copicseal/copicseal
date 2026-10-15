import { platformRuntime } from '@/platform/providers/platform-runtime';
import { isComponentReady } from '@/shared/lib/components';
import {
  registerShutterCountProvider,
  type ShutterCountProvider,
  type ShutterCountResult,
} from '../provider';
import { buildShutterCountResult, EXIFTOOL_ARGS } from '../tags';

/**
 * 组件 id：与静态仓库、内置目录一致。
 *
 * 「哪个功能用哪个组件」属于功能域自己的知识，所以写在这里而不是全局层。
 */
const EXIFTOOL_COMPONENT = 'exiftool';

/**
 * 原生 ExifTool 实现（桌面端首选）。
 *
 * 优先级高于内置 WASM 版（见文件末尾的 `registerShutterCountProvider`）：
 * 只要「系统里已有 exiftool」或「用户在设置 → 插件里装了一份」就用它 ——
 * 具体用哪一份由 Rust 侧统一决定（装了就用装的，没装才用系统的）。
 * 两者都没有时，解析器自动回退到 WASM 版按字节解析。
 */
const nativeExiftoolProvider: ShutterCountProvider = {
  id: 'native-exiftool',
  label: 'ExifTool（系统 / 插件安装）',

  /**
   * 可用性探测**不吞异常**。
   *
   * 读组件状态失败（例如刚启动时后端还没就绪）必须与「确实没装」区分开：
   * 一旦在这里吞掉，上层只会看到一个「成功的 false」，就变成误报「没装 ExifTool」。
   * 另外打印一次组件状态，误报时能直接看出是没装、版本没扫到、还是命令失败。
   */
  isAvailable: async () => {
    const components = await platformRuntime.listPlugins();
    const component = components.find((item) => item.id === EXIFTOOL_COMPONENT) ?? null;
    const ready = isComponentReady(component);

    if (!ready) {
      console.info('[shutter] 未发现可用的 ExifTool，组件状态:', component);
    }

    return ready;
  },

  async read({ path }): Promise<ShutterCountResult> {
    if (!path) {
      throw new Error('原生 ExifTool 需要一个磁盘路径');
    }

    // 只读：Rust 侧负责解析该用哪个 exiftool 并执行
    const stdout = await platformRuntime.readExiftoolMetadata(path, EXIFTOOL_ARGS);
    const parsed = JSON.parse(stdout) as Array<Record<string, unknown>>;
    const tags = Array.isArray(parsed) ? (parsed[0] ?? {}) : {};

    return buildShutterCountResult(tags, nativeExiftoolProvider);
  },
};

// 优先级 10 < WASM 版的 100：能用原生就用原生
registerShutterCountProvider(nativeExiftoolProvider, { priority: 10 });
