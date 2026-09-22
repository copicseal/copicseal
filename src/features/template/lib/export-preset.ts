import type { ExportPreset } from '@/shared/types/export';

/** 新建档位的默认目标尺寸 */
const DEFAULT_TARGET = { width: 2000, height: 2000 };

let presetSeq = 0;

/** 新建一个导出档位：两轴必填，默认给一组方形目标。 */
export function createExportPreset(): ExportPreset {
  presetSeq += 1;
  return {
    id: `preset-${presetSeq}`,
    label: `档位 ${presetSeq}`,
    format: 'png',
    width: DEFAULT_TARGET.width,
    height: DEFAULT_TARGET.height,
    scale: 1,
    quality: 90,
  };
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
