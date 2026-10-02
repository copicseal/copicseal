import type { ExportPreset } from '@/shared/types/export';

/** 新建档位的默认目标尺寸 */
const DEFAULT_TARGET = { width: 2000, height: 2000 };

let presetSeq = 0;

/** 新建一个导出档位：两轴必填，默认给一组方形目标，文件名留空走自动命名。 */
export function createExportPreset(): ExportPreset {
  presetSeq += 1;
  return {
    id: `preset-${presetSeq}`,
    format: 'png',
    width: DEFAULT_TARGET.width,
    height: DEFAULT_TARGET.height,
    scale: 1,
    quality: 90,
  };
}

/**
 * 档位实际使用的文件名主干（不含扩展名）。
 *
 * 用户填了就用用户的；留空则回落到 `<原图名>@<宽>x<高>`——所以改目标尺寸时
 * 名字会跟着变，而手填过的名字不会被覆盖。
 */
export function resolvePresetFileName(preset: ExportPreset, baseName: string): string {
  const custom = preset.fileName?.trim();
  if (custom) {
    return custom;
  }

  if (!Number.isFinite(preset.width) || !Number.isFinite(preset.height)) {
    return baseName;
  }

  return `${baseName}@${preset.width}x${preset.height}`;
}

/** 参数是否可用于解算：两轴都必须是正数。 */
export function isValidPreset(preset: ExportPreset): boolean {
  return (
    Number.isFinite(preset.width) &&
    preset.width > 0 &&
    Number.isFinite(preset.height) &&
    preset.height > 0
  );
}
