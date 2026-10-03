import type { OutputPreset } from '@/platform/contracts';
import type { ExportPreset } from '@/shared/types/export';

/** 新建档位的默认目标尺寸 */
const DEFAULT_TARGET = { width: 2000, height: 2000 };

/** 与导出面板上的滑杆范围保持一致，回读历史配置时也要夹在同一区间 */
const SCALE_RANGE = { min: 1, max: 4 };
const QUALITY_RANGE = { min: 1, max: 100 };

let presetSeq = 0;

function nextPresetId(): string {
  presetSeq += 1;
  return `preset-${presetSeq}`;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

/** 新建一个导出档位：两轴必填，默认给一组方形目标，文件名留空走自动命名。 */
export function createExportPreset(): ExportPreset {
  return {
    id: nextPresetId(),
    format: 'png',
    width: DEFAULT_TARGET.width,
    height: DEFAULT_TARGET.height,
    scale: 1,
    quality: 90,
  };
}

/**
 * 设置里保存的默认档位（`config.output.presets`）→ 会话档位。
 *
 * 配置是过去某个版本写下的，不能假定它仍然合法：宽高必须是正整数
 * （Rust 侧是 `u32`），倍率与质量夹到滑杆区间，认不出的格式退回 PNG。
 */
export function parseDefaultPresets(list: readonly OutputPreset[]): ExportPreset[] {
  return list
    .map(
      (preset): ExportPreset => ({
        id: nextPresetId(),
        format: preset.type === 'jpeg' ? 'jpeg' : 'png',
        width: Math.round(preset.width),
        height: Math.round(preset.height),
        scale: clamp(preset.scale, SCALE_RANGE.min, SCALE_RANGE.max, 1),
        quality: clamp(preset.quality, QUALITY_RANGE.min, QUALITY_RANGE.max, 90),
      }),
    )
    .filter(isValidPreset);
}

/** 会话档位 → 设置里的默认档位。只有齐备的档位能存：宽高在 Rust 侧是 `u32`。 */
export function toDefaultPresets(presets: readonly ExportPreset[]): OutputPreset[] {
  return presets.filter(isValidPreset).map((preset) => ({
    id: preset.id,
    type: preset.format,
    width: Math.round(preset.width),
    height: Math.round(preset.height),
    scale: preset.scale,
    quality: preset.quality,
    // 位图尺寸显式给定，不是「跟随原图」档位
    is_original: false,
  }));
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
