import type { CompressOptions, CompressPreset } from '@/platform/contracts';
import type { MessageKey } from '@/shared/i18n';

/**
 * 压缩参数的初值。
 *
 * 取值都偏保守：保持原格式、质量 80、不缩放、保留元数据 —— 用户不调任何东西也能得到
 * 「肉眼几乎看不出差别、体积明显变小」的结果。
 */
export const DEFAULT_OPTIONS: CompressOptions = {
  output_mode: 'custom',
  output_format: 'keep',
  quality: 80,
  resize_mode: 'original',
  max_edge: 2048,
  box_width: 2048,
  box_height: 2048,
  target_bytes: null,
  metadata: 'keep',
  background: '#ffffff',
  suffix: '-compressed',
  on_conflict: 'rename',
};

/** 透明图转 JPEG 的默认背景色（白）。 */
export const DEFAULT_BACKGROUND = '#ffffff';

/** 一次压缩最多处理多少张，避免一次拖进几千张把界面拖死。 */
export const MAX_TASKS = 2000;

/** 内置预设：只读，写在代码里（与「批量改文件名」的内置规则同思路）。 */
export interface BuiltinPreset {
  id: string;
  nameKey: MessageKey;
  options: Partial<CompressOptions>;
}

export const BUILTIN_PRESETS: readonly BuiltinPreset[] = [
  {
    id: 'web-jpeg',
    nameKey: 'compress.presets.names.webJpeg',
    options: {
      output_format: 'jpeg',
      quality: 80,
      resize_mode: 'original',
      target_bytes: null,
      metadata: 'keep',
    },
  },
  {
    id: 'share-long-edge',
    nameKey: 'compress.presets.names.shareLongEdge',
    options: {
      output_format: 'keep',
      quality: 80,
      resize_mode: 'max_edge',
      max_edge: 2048,
      target_bytes: null,
    },
  },
  {
    id: 'small-size',
    nameKey: 'compress.presets.names.smallSize',
    options: {
      output_format: 'keep',
      resize_mode: 'original',
      target_bytes: 500 * 1024,
    },
  },
  {
    id: 'png-optimized',
    nameKey: 'compress.presets.names.pngOptimized',
    options: {
      output_format: 'png',
      resize_mode: 'original',
      target_bytes: null,
      metadata: 'strip',
    },
  },
];

/** 从一条预设取出可套用的参数（预设不含输出目录，由页面自己维护）。 */
export function presetToOptions(preset: CompressPreset): Partial<CompressOptions> {
  return {
    output_mode: preset.output_mode,
    output_format: preset.output_format,
    quality: preset.quality,
    resize_mode: preset.resize_mode,
    max_edge: preset.max_edge,
    box_width: preset.box_width,
    box_height: preset.box_height,
    target_bytes: preset.target_bytes,
    metadata: preset.metadata,
    background: preset.background,
    suffix: preset.suffix,
    on_conflict: preset.on_conflict,
  };
}

/** 把当前参数收成一条可保存的预设。 */
export function optionsToPreset(
  id: string,
  name: string,
  options: CompressOptions,
): CompressPreset {
  return {
    id,
    name,
    output_mode: options.output_mode,
    output_format: options.output_format,
    quality: options.quality,
    resize_mode: options.resize_mode,
    max_edge: options.max_edge,
    box_width: options.box_width,
    box_height: options.box_height,
    target_bytes: options.target_bytes,
    metadata: options.metadata,
    background: options.background,
    suffix: options.suffix,
    on_conflict: options.on_conflict,
  };
}

/** 生成一条本地唯一 id（预设 / 任务都用它；不需要全局唯一）。 */
export function createLocalId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
