export type ExportFormat = 'jpeg' | 'png' | 'webp';

/**
 * 单档导出配置：一档 = 一组目标尺寸 + 一套编码参数。
 *
 * `width` / `height` 是必填的目标框。无背景时它只作 contain 约束，
 * 有背景时它就是画框的精确尺寸（整除尺寸解算见 `docs/04`）。
 */
export interface ExportPreset {
  id: string;
  /** 展示名，同时参与导出文件命名 */
  label: string;
  format: ExportFormat;
  /** 目标框宽度（像素） */
  width: number;
  /** 目标框高度（像素） */
  height: number;
  /** 用户倍率：在解算出的像素尺寸之上做位图超采样 */
  scale: number;
  /** 编码质量 1..100，仅 JPEG / WebP 生效 */
  quality: number;
}

export interface ExportTarget {
  width: number;
  height: number;
}

/**
 * 渲染尺寸适配器：把「让渲染区命中目标尺寸」这件事交给持有 DOM 的一方。
 *
 * 模板几何全部是渲染基准的倍数，解算需要先探针测量再反解，
 * 而背景模式还会改变画框与画布的关系，因此这一步必须由页面侧完成。
 */
export interface ExportSizeAdapter {
  /** 把渲染区调整到目标尺寸，返回时渲染已稳定 */
  prepare: (target: ExportTarget) => Promise<void>;
}

export interface ExportRunContext {
  /** 导出文件名主干，通常取原图文件名（不含扩展名） */
  baseName?: string;
  /** 模板导出所需的尺寸适配器；缺省时按元素当前尺寸直接捕获 */
  sizeAdapter?: ExportSizeAdapter;
  /** 多档输出目录；缺省时逐档弹出保存对话框（Web 端退化为逐张下载） */
  outputDir?: string | null;
}

export interface ExportOptions {
  presets: ExportPreset[];
  /** 仅写入 EXIF 分辨率元数据，不参与尺寸计算 */
  dpi: number;
  preserveExif: boolean;
  exclude?: string[];
}
