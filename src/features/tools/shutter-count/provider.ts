/**
 * 「快门数查询」的数据来源抽象。
 *
 * 目前只有一个实现：`providers/native-exiftool.ts` —— 用**系统里已有、或插件目录里安装的
 * 原生 ExifTool**（「用哪一份」由 Rust 侧统一决定）。UI 只认这里的接口，
 * 将来换实现（做成插件、换别的元数据库）都不需要改界面代码。
 */

/**
 * 错误码：系统里没有、插件目录里也没装 ExifTool。
 *
 * 与 Rust 侧 `exiftool.rs::EXIFTOOL_MISSING_CODE` 一致。带上这个标记，
 * 界面就能把「去设置 → 插件安装」的入口显示出来（见 `platform/errors` 的 `parseFailureReason`）。
 */
export const EXIFTOOL_MISSING_CODE = 'exiftool-missing';

export interface ShutterCountInput {
  /** 文件字节：只有「没有磁盘路径、也没有原生 ExifTool」的网页端才用得上 */
  bytes?: Uint8Array;
  /**
   * 文件在磁盘上的路径；原生 ExifTool 必须在真实文件上跑。
   *
   * 拖入的文件只有字节，界面会先按原样落成一个临时文件再把路径传进来。
   */
  path?: string;
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
  // 原生 ExifTool：系统里已有，或用户在「设置 → 插件」里装了一份
  //（内置的 WASM 版已移除：它给应用带来约 24 MB 的 wasm 资源，桌面端用不上）
  () => import('./providers/native-exiftool'),
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
 * 当前是否有可用的解析器。
 *
 * 与 `listShutterCountProviders` 的区别：**探测失败**（而不是「确实没装」）会抛出来。
 * 应用刚启动时 `list_plugins` 可能还没就绪，把这种瞬时失败当成「没装 ExifTool」
 * 会误报，界面据此可以重试，而不是直接提示用户去安装。
 */
export async function hasShutterCountProvider(): Promise<boolean> {
  await ensureBuiltinProviders();

  let probeFailed = false;
  let available = false;

  await Promise.all(
    providers.map(async (item) => {
      try {
        if (await item.provider.isAvailable()) {
          available = true;
        }
      } catch (error) {
        probeFailed = true;
        console.warn(`探测解析器 ${item.provider.id} 可用性失败:`, error);
      }
    }),
  );

  if (available) {
    return true;
  }

  if (probeFailed) {
    throw new Error('探测 ExifTool 可用性失败（可能是应用刚启动、插件状态还没就绪）');
  }

  return false;
}

/**
 * 读快门数：按优先级依次尝试，第一个成功的实现胜出。
 *
 * 全部失败时抛出**最后一个**错误（最可能是「文件里没有这个字段」这类可解释的原因）。
 */
export async function readShutterCount(input: ShutterCountInput): Promise<ShutterCountResult> {
  const available = await listShutterCountProviders();

  if (available.length === 0) {
    throw new Error(
      `[[co:${EXIFTOOL_MISSING_CODE}]]没有可用的 ExifTool：系统里没找到，插件目录里也没装`,
    );
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
