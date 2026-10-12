import { normalizeExifSettings } from '@/features/template/templates/exif-format';
import type { ExifSettings } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

/**
 * 读取「设置 → 边框水印 → EXIF」的显示口径。
 *
 * 老配置里可能整段没有 `exif` 键（该字段是后加的），这里统一按
 * `normalizeExifSettings` 补齐缺项与非法值，页面拿到的一定是完整设置。
 * 导出开关不在这里：它落在 `output.retain_exif`，由调用方直接读配置。
 */
export async function resolveExifSettings(): Promise<ExifSettings> {
  try {
    const config = await platformRuntime.getConfig();
    return normalizeExifSettings(config.exif);
  } catch (error) {
    console.warn('读取 EXIF 设置失败:', error);
    return normalizeExifSettings(null);
  }
}

/**
 * 读取「导出携带原图 EXIF」开关。
 *
 * 字段落在 `output.retain_exif` 而不是 `exif` 段（见契约里的说明），所以单独读一次。
 * 配置里缺这个键时按「开」处理：这也是它落地以来的默认值。
 */
export async function resolveRetainExifInExport(): Promise<boolean> {
  try {
    const config = await platformRuntime.getConfig();
    return config.output?.retain_exif ?? true;
  } catch (error) {
    console.warn('读取导出 EXIF 开关失败:', error);
    return true;
  }
}
