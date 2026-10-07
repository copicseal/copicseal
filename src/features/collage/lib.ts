import type { CollageConfig } from '@/platform/contracts';
import type {
  CollageAnnotation,
  CollageAspectPreset,
  CollageCanvasState,
  CollageExportQuality,
  CollageExportState,
  CollageLayoutSlot,
  CollageSlotState,
} from './types';

/** 设计基准宽度：画布上的间距、边距、圆角都按这个宽度等比换算到实际渲染尺寸。 */
export const COLLAGE_DESIGN_WIDTH = 1000;

/** 槽位坐标所在的单位网格边长（布局数据里的 x/y/w/h 都以它为分母）。 */
export const COLLAGE_GRID_UNITS = 12;

export const COLLAGE_RATIO_OPTIONS: Array<{
  label: Exclude<CollageAspectPreset, 'custom'>;
  width: number;
  height: number;
}> = [
  { label: '1:1', width: 1, height: 1 },
  { label: '4:5', width: 4, height: 5 },
  { label: '3:4', width: 3, height: 4 },
  { label: '5:4', width: 5, height: 4 },
  { label: '4:3', width: 4, height: 3 },
  { label: '16:9', width: 16, height: 9 },
  { label: '21:9', width: 21, height: 9 },
  { label: '9:16', width: 9, height: 16 },
  { label: '9:21', width: 9, height: 21 },
  { label: '3:2', width: 3, height: 2 },
  { label: '2:3', width: 2, height: 3 },
];

export const COLLAGE_EXPORT_LABELS: Record<CollageExportQuality, string> = {
  standard: '标准',
  high: '高清',
  ultra: '超清',
};

export const COLLAGE_QUALITY_VALUES: Record<CollageExportQuality, number> = {
  standard: 90,
  high: 94,
  ultra: 98,
};

/** 槽位 id 计数器：只为了让 React 在换位/增删时复用正确的 DOM 节点 */
let slotSequence = 0;

export function createEmptySlotState(freeIndex = 0): CollageSlotState {
  slotSequence += 1;

  return {
    id: `slot-${slotSequence}`,
    photoId: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    fit: 'cover',
    borderRadius: null,
    freeX: 6 + (freeIndex % 3) * 31,
    freeY: 8 + Math.floor(freeIndex / 3) * 30,
    freeW: 28,
  };
}

export function getDefaultCanvasState(): CollageCanvasState {
  return {
    layoutMode: 'grid',
    aspectPreset: '1:1',
    customRatioWidth: 4,
    customRatioHeight: 5,
    backgroundColor: '#ffffff',
    backgroundImage: null,
    gap: 12,
    padding: 20,
    borderRadius: 18,
    shadow: 18,
    longDirection: 'vertical',
    longAlign: 'center',
    longSize: 720,
  };
}

export function getDefaultExportSettings(): CollageExportState {
  return {
    format: 'png',
    quality: 'high',
    scale: 1,
    width: 2048,
    height: 2048,
    lockRatio: true,
  };
}

/** 画布参数是否等于给定默认值（面板据此决定「恢复默认」可不可点）。 */
export function isSameCanvasState(
  canvas: CollageCanvasState,
  defaults: CollageCanvasState,
): boolean {
  return JSON.stringify(canvas) === JSON.stringify(defaults);
}

/** 导出参数是否等于给定默认值。 */
export function isSameExportState(
  settings: CollageExportState,
  defaults: CollageExportState,
): boolean {
  return JSON.stringify(settings) === JSON.stringify(defaults);
}

/**
 * 由「设置 → 拼图 → 默认项」推导画布状态。
 *
 * 读不到配置（Web 端、老版本）时逐字段回落到出厂默认，保证结果一定是完整状态。
 */
export function canvasStateFromConfig(config: CollageConfig | null): CollageCanvasState {
  const base = getDefaultCanvasState();
  if (!config) {
    return base;
  }

  return {
    ...base,
    layoutMode: config.layout_mode ?? base.layoutMode,
    aspectPreset: (config.aspect_preset as CollageCanvasState['aspectPreset']) ?? base.aspectPreset,
    customRatioWidth: config.custom_ratio_width ?? base.customRatioWidth,
    customRatioHeight: config.custom_ratio_height ?? base.customRatioHeight,
    backgroundColor: config.background_color || base.backgroundColor,
    gap: config.gap ?? base.gap,
    padding: config.padding ?? base.padding,
    borderRadius: config.border_radius ?? base.borderRadius,
    shadow: config.shadow ?? base.shadow,
    longDirection: config.long_direction ?? base.longDirection,
    longAlign: config.long_align ?? base.longAlign,
    longSize: config.long_size ?? base.longSize,
  };
}

/** 由「设置 → 拼图 → 导出」推导导出参数。 */
export function exportStateFromConfig(config: CollageConfig | null): CollageExportState {
  const base = getDefaultExportSettings();
  if (!config) {
    return base;
  }

  return {
    format: config.export_format ?? base.format,
    quality: config.export_quality ?? base.quality,
    scale: config.export_scale ?? base.scale,
    width: config.export_width ?? base.width,
    height: config.export_height ?? base.height,
    lockRatio: config.export_lock_ratio ?? base.lockRatio,
  };
}

export function createAnnotation(kind: CollageAnnotation['type']): CollageAnnotation {
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (kind === 'text') {
    return {
      id,
      type: 'text',
      x: 0.12,
      y: 0.12,
      width: 0.22,
      height: 0.1,
      rotation: 0,
      color: '#111827',
      text: '文字',
      fontSize: 20,
    };
  }

  if (kind === 'arrow') {
    return {
      id,
      type: 'arrow',
      x: 0.18,
      y: 0.22,
      width: 0.28,
      height: 0.06,
      rotation: 0,
      color: '#ef4444',
      strokeWidth: 6,
    };
  }

  return {
    id,
    type: kind,
    x: 0.14,
    y: 0.14,
    width: 0.24,
    height: 0.2,
    rotation: 0,
    color: '#ef4444',
    strokeWidth: 4,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getAspectRatioValue(canvas: CollageCanvasState): number {
  if (canvas.aspectPreset === 'custom') {
    return Math.max(canvas.customRatioWidth, 1) / Math.max(canvas.customRatioHeight, 1);
  }

  const preset = COLLAGE_RATIO_OPTIONS.find((item) => item.label === canvas.aspectPreset);
  return preset ? preset.width / preset.height : 1;
}

export function getAspectRatioText(canvas: CollageCanvasState): string {
  if (canvas.aspectPreset === 'custom') {
    return `${canvas.customRatioWidth}:${canvas.customRatioHeight}`;
  }

  return canvas.aspectPreset;
}

/** 槽位在画布内容盒里的百分比矩形；间距通过内缩半个 gap 实现。 */
export function getSlotRect(slot: CollageLayoutSlot): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  return {
    left: (slot.x / COLLAGE_GRID_UNITS) * 100,
    top: (slot.y / COLLAGE_GRID_UNITS) * 100,
    width: (slot.w / COLLAGE_GRID_UNITS) * 100,
    height: (slot.h / COLLAGE_GRID_UNITS) * 100,
  };
}

/**
 * 把槽位换算成画布内的百分比矩形，并把「边距 + 间距」算进去。
 *
 * 槽位是绝对定位元素，而绝对定位的包含块是祖先的**内边距盒**——父容器的 padding
 * 对它们不起作用，所以边距必须在这里显式参与坐标换算，否则「边距」滑块是死的。
 *
 * 每格自身再内缩 gap/2 形成格与格之间的间距；为了让最外圈留白正好等于 padding，
 * 可用区先扣掉 `padding - gap/2`。
 */
export function getPaddedSlotRect(
  slot: CollageLayoutSlot,
  canvas: { gap: number; padding: number },
  design: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const rect = getSlotRect(slot);
  const inset = Math.max(canvas.padding - canvas.gap / 2, 0);
  const innerWidth = Math.max(design.width - inset * 2, 1);
  const innerHeight = Math.max(design.height - inset * 2, 1);

  return {
    left: ((inset + (rect.left / 100) * innerWidth) / design.width) * 100,
    top: ((inset + (rect.top / 100) * innerHeight) / design.height) * 100,
    width: (((rect.width / 100) * innerWidth) / design.width) * 100,
    height: (((rect.height / 100) * innerHeight) / design.height) * 100,
  };
}

/** 自由模式：位置与大小相对「画布扣掉边距」后的可用区，边距因此变成一圈安全边。 */
export function getFreeSlotRect(
  slot: { freeX: number; freeY: number; freeW: number },
  canvas: { padding: number },
  design: { width: number; height: number },
): { left: number; top: number; width: number } {
  const innerWidth = Math.max(design.width - canvas.padding * 2, 1);
  const innerHeight = Math.max(design.height - canvas.padding * 2, 1);

  return {
    left: ((canvas.padding + (slot.freeX / 100) * innerWidth) / design.width) * 100,
    top: ((canvas.padding + (slot.freeY / 100) * innerHeight) / design.height) * 100,
    width: (((slot.freeW / 100) * innerWidth) / design.width) * 100,
  };
}

/** 画布的设计基准宽度：长图的横轴尺寸要连边距一起算，导出才按同一基准放大。 */
export function getCanvasDesignWidth(canvas: {
  layoutMode: string;
  longSize: number;
  padding: number;
}): number {
  return canvas.layoutMode === 'long' ? canvas.longSize + canvas.padding * 2 : COLLAGE_DESIGN_WIDTH;
}

/**
 * 图片位置（`object-position` 百分比）：50 为居中，范围 0–100。
 *
 * 注意取反：`object-position` 的百分比是「图片相对框的锚点位置」，它增大会把**图片往左/上推**。
 * 而偏移量的语义是「图片自己往右/下移多少」（正 = 跟随指针拖拽方向），所以这里要减去偏移量。
 */
export function getObjectPosition(slot: CollageSlotState): string {
  return `${clamp(50 - slot.offsetX, 0, 100)}% ${clamp(50 - slot.offsetY, 0, 100)}%`;
}

/** 单格图片变换：翻转 → 旋转 → 缩放。 */
export function getSlotTransform(slot: CollageSlotState): string {
  const parts: string[] = [];
  if (slot.flipX || slot.flipY) {
    parts.push(`scale(${slot.flipX ? -1 : 1}, ${slot.flipY ? -1 : 1})`);
  }
  if (slot.rotation) {
    parts.push(`rotate(${slot.rotation}deg)`);
  }
  if (slot.scale !== 1) {
    parts.push(`scale(${slot.scale})`);
  }

  return parts.join(' ') || 'none';
}

/** 按画布比例把宽度换算成高度（锁定比例时用）。 */
export function heightFromRatio(width: number, ratio: number): number {
  if (ratio <= 0) {
    return Math.round(width);
  }

  return Math.max(1, Math.round(width / ratio));
}
