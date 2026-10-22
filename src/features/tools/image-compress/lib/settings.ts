import type { CompressPreset } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

export interface CompressConfigSnapshot {
  /** 默认输出目录：沿用设置里的导出目录，用户可直接改 */
  outputDir: string;
  presets: CompressPreset[];
  /** 缓存目录（预览图与拖入临时文件都放这里） */
  cacheDir: string;
}

/** 读压缩页需要的配置（输出目录 / 已保存预设 / 缓存目录）。 */
export async function loadCompressConfig(): Promise<CompressConfigSnapshot> {
  try {
    const config = await platformRuntime.getConfig();

    return {
      outputDir: config.output?.default_path ?? '',
      presets: config.compress?.presets ?? [],
      cacheDir: config.cache?.directory ?? '',
    };
  } catch (error) {
    console.warn('读取压缩设置失败:', error);
    return { outputDir: '', presets: [], cacheDir: '' };
  }
}

/**
 * 只把预设写回 `config.compress`。
 *
 * 与「批量改名」「更多功能」的持久化同样走读-改-写：面板拿不到设置页的 configRef，
 * 直接拼一份新配置会把别的设置覆盖成旧值。
 */
export async function saveCompressPresets(
  presets: readonly CompressPreset[],
): Promise<CompressPreset[]> {
  const config = await platformRuntime.getConfig();
  const next = [...presets];

  await platformRuntime.updateConfig({
    ...config,
    compress: { presets: next },
  });

  return next;
}
