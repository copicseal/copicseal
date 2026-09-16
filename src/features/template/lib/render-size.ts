import type { TemplateBackground } from '../background';

/** 探针基准：仅用于量出画布高宽比，随后会被解算结果覆盖。 */
const PROBE_BASE = 1000;

export interface RenderTarget {
  width: number;
  height: number;
}

function getFrameElement(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-co-frame]');
}

function getCanvasElement(root: HTMLElement): HTMLElement | null {
  const box = root.querySelector<HTMLElement>('[data-co-canvas-box]');
  const canvas = box?.firstElementChild;
  return canvas instanceof HTMLElement ? canvas : null;
}

/** 在给定基准下渲染，量出画布高宽比（高 / 宽）。 */
function measureCanvasAspect(root: HTMLElement, base: number): number | null {
  root.style.setProperty('--co-base', `${base}px`);

  const canvas = getCanvasElement(root);
  if (!canvas) {
    return null;
  }

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return height / width;
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

    const aspect = measureCanvasAspect(root, PROBE_BASE);
    if (aspect === null) {
      return false;
    }

    root.style.setProperty('--co-base', `${solveBase(aspect, target.width, target.height)}px`);
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

  const aspect = measureCanvasAspect(root, contentWidth);
  if (aspect === null) {
    return false;
  }

  root.style.setProperty('--co-base', `${solveBase(aspect, contentWidth, contentHeight)}px`);
  return true;
}
