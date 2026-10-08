import type { MessageKey } from '@/shared/i18n';

/** 拼图布局模式：规则网格、长图拼接、自由摆放。 */
export type CollageLayoutMode = 'grid' | 'long' | 'free';

/** 长图方向：竖向（上下拼接）或横向（左右拼接）。 */
export type CollageLongDirection = 'vertical' | 'horizontal';

/** 长图对齐：竖图为 left/center/right，横图为 top/center/bottom。 */
export type CollageLongAlign = 'start' | 'center' | 'end';

export type CollageAspectPreset =
  | '1:1'
  | '4:5'
  | '5:4'
  | '3:4'
  | '4:3'
  | '16:9'
  | '9:16'
  | '21:9'
  | '9:21'
  | '3:2'
  | '2:3'
  | 'custom';

export type CollageExportFormat = 'png' | 'jpeg';

export type CollageExportQuality = 'standard' | 'high' | 'ultra';

/** 画布拖拽工具：换位排序 / 画面平移。 */
export type CollageTool = 'select' | 'pan';

/** 单格图片填充方式：填满会裁掉超出部分，完整显示会留出背景。 */
export type CollageSlotFit = 'cover' | 'contain';

/** 布局槽位，坐标位于 12×12 的单位网格内。 */
export interface CollageLayoutSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CollageLayout {
  id: string;
  /** 布局名（zh-CN 字面量）：作为没有文案 key 时的回落，界面优先用 `nameKey` 取当前语言 */
  name: string;
  /** 布局名的文案 key（`collage.layouts.names.*`） */
  nameKey?: MessageKey;
  count: number;
  /** 分组名：既是分组键也用作滚动锚点 id，展示文案由界面按张数取 */
  group: string;
  slots: CollageLayoutSlot[];
}

/**
 * 单个槽位的图片状态。
 *
 * `offsetX` / `offsetY` 是相对槽位尺寸的百分比（-50 ~ 50），映射到 `object-position`，
 * 因此不会出现拖出空白的情况；`scale` 是整体放大倍率（≥1），`rotation` 为角度。
 * 自由模式下位置与宽度改用 `freeX` / `freeY` / `freeW`（相对画布的百分比）。
 */
export interface CollageSlotState {
  /** 稳定标识：仅用于 React 复用 DOM，不参与导出 */
  id: string;
  photoId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  /** 图片是填满格子还是完整显示（默认填满） */
  fit: CollageSlotFit;
  borderRadius: number | null;
  freeX: number;
  freeY: number;
  freeW: number;
}

export interface CollageCanvasState {
  layoutMode: CollageLayoutMode;
  aspectPreset: CollageAspectPreset;
  customRatioWidth: number;
  customRatioHeight: number;
  backgroundColor: string;
  backgroundImage: string | null;
  gap: number;
  padding: number;
  borderRadius: number;
  shadow: number;
  longDirection: CollageLongDirection;
  longAlign: CollageLongAlign;
  /** 长图的横轴尺寸（竖向长图的宽度 / 横向长图的高度），按设计基准像素计 */
  longSize: number;
}

export interface CollageTextAnnotation {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  text: string;
  fontSize: number;
}

export interface CollageArrowAnnotation {
  id: string;
  type: 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeWidth: number;
}

export interface CollageShapeAnnotation {
  id: string;
  type: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeWidth: number;
}

export type CollageAnnotation =
  | CollageTextAnnotation
  | CollageArrowAnnotation
  | CollageShapeAnnotation;

export interface CollageExportState {
  format: CollageExportFormat;
  quality: CollageExportQuality;
  /** 倍率：在目标尺寸之上做位图超采样 */
  scale: number;
  /** 目标宽度（像素）；锁定比例时由画布比例推导高度 */
  width: number;
  height: number;
  lockRatio: boolean;
}

export interface CollagePresentState {
  layoutId: string;
  canvas: CollageCanvasState;
  exportSettings: CollageExportState;
  slotItems: CollageSlotState[];
  annotations: CollageAnnotation[];
}
