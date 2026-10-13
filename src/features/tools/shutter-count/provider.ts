/**
 * 「快门数查询」的数据来源抽象。
 *
 * 现在只有 ExifTool(WASM) 一个实现，但**不要**让 UI 直接依赖它：
 * 以后要像 libheif 那样做插件（宿主侧原生实现、按需下载），只需给
 * `registerShutterCountProvider()` 注册一个更高优先级的实现，
 * 解析器会自动改用它，界面代码一行都不用动。
 */

export interface ShutterCountInput {
  bytes: Uint8Array;
  /** 带扩展名的文件名：ExifTool 靠它判断容器格式 */
  fileName: string;
}

export interface ShutterCountResult {
  make: string | null;
  model: string | null;
  /** 拍摄时的累计快门次数；读不到为 null（不要用 0 顶替） */
  shutterCount: number | null;
  /** 该数值取自哪个标签（如 `ShutterCount`），便于排查不同机型的口径差异 */
  sourceTag: string | null;
  /** 其它相关字段（序列号 / 固件 / 备用快门数等），按标签名原样给出 */
  extra: Record<string, string | number>;
  providerId: string;
  providerLabel: string;
}

export interface ShutterCountProvider {
  id: string;
  /** 展示在结果里的解析器名称，例如 `ExifTool (WASM)` */
  label: string;
  /** 当前环境是否可用；插件未安装/未启用时返回 false，解析器自动回退到下一个 */
  isAvailable: () => Promise<boolean>;
  read: (input: ShutterCountInput) => Promise<ShutterCountResult>;
}

interface RegisteredProvider {
  provider: ShutterCountProvider;
  /** 数字越小越优先；插件实现可注册一个更小的值来接管 */
  priority: number;
}

const providers: RegisteredProvider[] = [];

/**
 * 内置解析器：**按需加载**。
 *
 * 解析器实现（尤其 ExifTool + 24 MB WASM）不能静态 import 进主包，
 * 否则「懒加载」形同虚设；这里改成模块加载器，第一次真正要读的时候才拉进来。
 * 插件实现以后也是往这个列表里加（或由插件宿主注册）。
 */
const builtinProviderLoaders: Array<() => Promise<unknown>> = [
  () => import('./providers/exiftool-wasm'),
];

let builtinsLoaded = false;

async function ensureBuiltinProviders(): Promise<void> {
  if (builtinsLoaded) {
    return;
  }

  builtinsLoaded = true;
  await Promise.all(builtinProviderLoaders.map((load) => load()));
}

/** 注册一个解析器实现（插件宿主以后就走这里）。 */
export function registerShutterCountProvider(
  provider: ShutterCountProvider,
  options?: { priority?: number },
): void {
  const existing = providers.findIndex((item) => item.provider.id === provider.id);
  const entry: RegisteredProvider = { provider, priority: options?.priority ?? 100 };

  if (existing >= 0) {
    providers[existing] = entry;
  } else {
    providers.push(entry);
  }

  providers.sort((left, right) => left.priority - right.priority);
}

/** 列出可用解析器（按优先级），供设置/诊断展示。 */
export async function listShutterCountProviders(): Promise<ShutterCountProvider[]> {
  await ensureBuiltinProviders();

  const available: ShutterCountProvider[] = [];

  for (const item of providers) {
    try {
      if (await item.provider.isAvailable()) {
        available.push(item.provider);
      }
    } catch {
      // 探测失败视为不可用，继续看下一个
    }
  }

  return available;
}

/**
 * 读快门数：按优先级依次尝试，第一个成功的实现胜出。
 *
 * 全部失败时抛出**最后一个**错误（最可能是「文件里没有这个字段」这类可解释的原因）。
 */
export async function readShutterCount(input: ShutterCountInput): Promise<ShutterCountResult> {
  const available = await listShutterCountProviders();

  if (available.length === 0) {
    throw new Error('没有可用的快门数解析器');
  }

  let lastError: unknown = null;

  for (const provider of available) {
    try {
      return await provider.read(input);
    } catch (error) {
      lastError = error;
      console.warn(`解析器 ${provider.id} 读取失败，尝试下一个:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
