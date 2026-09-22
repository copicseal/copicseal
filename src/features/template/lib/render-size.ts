import type { TemplateBackground } from '../background';

/** 探针基准：仅用于量出画布几何与照片宽度，随后会被解算结果覆盖。 */
const PROBE_BASE = 1000;

/** 模板内照片元素的句柄；预览靠它对齐「照片原始宽度」并等待图片加载。 */
const PHOTO_SELECTOR = '[data-co-photo]';

export interface RenderTarget {
  width: number;
  height: number;
}

/** 一次探针量到的几何。画布与照片都是 `--co-base` 的倍数，因此一次测量即可线性反解。 */
export interface RenderProbe {
  /** 探针基准下的画布宽度 */
  canvasWidth: number;
  /** 探针基准下的画布高度 */
  canvasHeight: number;
  /** 模板内照片元素的布局宽度；量不到时为 0 */
  photoWidth: number;
  /** 照片的原始像素宽度（`naturalWidth`）；未加载时为 0 */
  photoPixelWidth: number;
}

function getFrameElement(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-co-frame]');
}

function getCanvasElement(root: HTMLElement): HTMLElement | null {
  const box = root.querySelector<HTMLElement>('[data-co-canvas-box]');
  const canvas = box?.firstElementChild;
  return canvas instanceof HTMLElement ? canvas : null;
}

function getPhotoElement(root: HTMLElement): HTMLImageElement | null {
  return root.querySelector<HTMLImageElement>(PHOTO_SELECTOR);
}

/**
 * 在给定基准下量一次渲染几何。
 *
 * 写入 `--co-base` 会立即触发布局，因此调用方必须处在 paint 之前的 layout effect 里，
 * 探针值不会被看到。返回 null 表示画布尚未可测量。
 */
function probeRenderGeometry(root: HTMLElement, base: number): RenderProbe | null {
  root.style.setProperty('--co-base', `${base}px`);

  const canvas = getCanvasElement(root);
  if (!canvas) {
    return null;
  }

  const canvasWidth = canvas.offsetWidth;
  const canvasHeight = canvas.offsetHeight;
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return null;
  }

  const photo = getPhotoElement(root);

  return {
    canvasWidth,
    canvasHeight,
    photoWidth: photo?.offsetWidth ?? 0,
    photoPixelWidth: photo?.naturalWidth ?? 0,
  };
}

/** 画布高宽比（高 / 宽）；比例与基准无关，探针量一次即可。 */
function canvasAspectOf(probe: RenderProbe): number {
  return probe.canvasHeight / probe.canvasWidth;
}

/** contain 反解：让画布在可用区内等比放下，主导轴精确命中。 */
function solveBase(aspect: number, availableWidth: number, availableHeight: number): number {
  return Math.round(Math.min(availableWidth, availableHeight / aspect));
}

/**
 * 把渲染区调整到目标尺寸。
 *
 * 无背景：画框贴合画布，目标尺寸只作 contain 约束，主导轴精确命中，
 * 另一轴按画布比例推导（1280×720 + 方形画布会得到 720×720）。
 *
 * 有背景：画框精确等于目标尺寸，画布在扣除内边距后的内容盒内 contain，
 * 剩余空间由背景填充（1280×720 依旧是 1280×720）。
 *
 * 全程只写 `--co-frame` / `--co-base` 与画框的像素尺寸（画框属框架层，
 * 不受"模板内禁止绝对单位"的约束）。返回 false 表示 DOM 尚未可测量。
 */
export function applyRenderSize(
  root: HTMLElement,
  background: TemplateBackground,
  target: RenderTarget,
): boolean {
  const frame = getFrameElement(root);
  if (!frame) {
    return false;
  }

  if (background.mode === 'none') {
    frame.style.width = '';
    frame.style.height = '';
    root.style.removeProperty('--co-frame');

    const probe = probeRenderGeometry(root, PROBE_BASE);
    if (!probe) {
      return false;
    }

    const base = solveBase(canvasAspectOf(probe), target.width, target.height);
    root.style.setProperty('--co-base', `${base}px`);
    return true;
  }

  frame.style.width = `${target.width}px`;
  frame.style.height = `${target.height}px`;
  root.style.setProperty('--co-frame', `${target.width}px`);

  // 内边距统一以画框宽度为基准，竖直方向也不依赖画框高度
  const contentWidth = target.width * (1 - background.paddingHorizontal * 2);
  const contentHeight = target.height - target.width * background.paddingVertical * 2;
  if (contentWidth <= 0 || contentHeight <= 0) {
    return false;
  }

  const probe = probeRenderGeometry(root, contentWidth);
  if (!probe) {
    return false;
  }

  const base = solveBase(canvasAspectOf(probe), contentWidth, contentHeight);
  root.style.setProperty('--co-base', `${base}px`);
  return true;
}

/**
 * 由探针结果解算出「照片按原始宽度百分之多少显示」所需的目标框。
 *
 * 百分比是相对照片原始像素宽度定义的：100 即 1:1。画布几何全是 `--co-base` 的倍数，
 * 所以先量出照片宽度与画布宽度的比例，再换算成命中目标像素数所需的画布宽。
 * 有背景时目标框就是画框（背景铺满这块框），内边距要一并算进去：让画布正好等于
 * 扣除内边距后的内容盒，这样预览里照片与内边距的相对关系与导出一致。
 *
 * 返回 null 表示照片原始宽度还未知，或背景内边距参数已经吃满整块画框。
 */
export function derivePhotoPercentTarget(
  probe: RenderProbe,
  background: TemplateBackground,
  percent: number,
): RenderTarget | null {
  if (probe.photoPixelWidth <= 0) {
    return null;
  }

  // 模板没渲染出照片元素时退回以画布宽度对齐原图宽度，保证任何模板下基准都确定
  const unitWidth = probe.photoWidth > 0 ? probe.photoWidth : probe.canvasWidth;
  const canvasWidth = ((percent / 100) * probe.photoPixelWidth * probe.canvasWidth) / unitWidth;
  if (canvasWidth <= 0) {
    return null;
  }

  const canvasHeight = canvasWidth * canvasAspectOf(probe);

  if (background.mode === 'none') {
    return { width: canvasWidth, height: canvasHeight };
  }

  const horizontal = background.paddingHorizontal * 2;
  if (horizontal >= 1) {
    return null;
  }

  const frameWidth = canvasWidth / (1 - horizontal);
  return {
    width: frameWidth,
    height: canvasHeight + background.paddingVertical * 2 * frameWidth,
  };
}

/** 预览的取尺寸意图。 */
export type PreviewSizeIntent = { kind: 'fit' } | { kind: 'photoPercent'; percent: number };

/**
 * 解算预览目标框。
 *
 * fit：目标框就是预览可用区——无背景时画布在框内 contain 恰好占满，有背景时画框
 * 精确等于框，背景因此铺满整块预览区。
 *
 * photoPercent：按照片原始像素宽度的百分比反解，见 `derivePhotoPercentTarget`。
 *
 * 返回 null 表示此刻还量不出目标框（画布未挂载、尺寸为 0、照片未加载），调用方应保持原尺寸。
 */
export function resolvePreviewSizeTarget(
  root: HTMLElement,
  background: TemplateBackground,
  intent: PreviewSizeIntent,
  available: RenderTarget,
): RenderTarget | null {
  if (intent.kind === 'fit') {
    return { width: available.width, height: available.height };
  }

  const probe = probeRenderGeometry(root, PROBE_BASE);
  if (!probe) {
    return null;
  }

  return derivePhotoPercentTarget(probe, background, intent.percent);
}
