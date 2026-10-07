import { COLLAGE_DESIGN_WIDTH } from '../lib';

export interface CollageRenderSize {
  /** 目标渲染宽度（像素） */
  width: number;
  /** 目标渲染高度（像素） */
  height: number;
  /** 长图横轴的设计尺寸（竖向为宽、横向为高）；网格/自由为 1000 */
  crossDesign?: number;
  /**
   * 长图模式：横轴固定成目标像素，主轴交给内容。
   * `width` = 竖向长图（横轴是宽），`height` = 横向长图（横轴是高）。
   */
  cross?: 'width' | 'height';
}

/**
 * 把拼图画布切到导出需要的像素尺寸，返回恢复函数。
 *
 * 画布内部的间距、边距、圆角都用 `--co-collage-scale` 换算，这里改一处宽度，
 * 整套几何等比放大，于是「预览所见」就是「导出所得」。
 *
 * 必须显式恢复：导出改的是内联样式，React 不会因为 props 没变而把它写回来。
 */
export function applyCollageRenderSize(
  element: HTMLElement,
  target: CollageRenderSize,
): () => void {
  const previous = {
    width: element.style.width,
    height: element.style.height,
    aspectRatio: element.style.aspectRatio,
    scale: element.style.getPropertyValue('--co-collage-scale'),
  };

  const crossDesign = target.crossDesign ?? COLLAGE_DESIGN_WIDTH;

  if (target.cross === 'height') {
    // 横向长图：高度是横轴，宽度由内容撑开
    element.style.height = `${target.height}px`;
    element.style.width = 'auto';
    element.style.aspectRatio = 'auto';
  } else if (target.cross === 'width') {
    // 竖向长图：宽度是横轴，高度由内容撑开
    element.style.width = `${target.width}px`;
    element.style.height = 'auto';
    element.style.aspectRatio = 'auto';
  } else {
    element.style.width = `${target.width}px`;
    element.style.height = `${target.height}px`;
  }

  const crossPixels = target.cross === 'height' ? target.height : target.width;
  element.style.setProperty('--co-collage-scale', String(crossPixels / Math.max(crossDesign, 1)));

  return () => {
    element.style.width = previous.width;
    element.style.height = previous.height;
    element.style.aspectRatio = previous.aspectRatio;
    if (previous.scale) {
      element.style.setProperty('--co-collage-scale', previous.scale);
    } else {
      element.style.removeProperty('--co-collage-scale');
    }
  };
}
