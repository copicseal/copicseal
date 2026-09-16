export type ExportFormat = 'jpeg' | 'png' | 'webp';

/**
 * 单档导出配置：一档 = 一组输出尺寸 + 一套编码参数。
 *
 * 模板导出时 `width` / `height` 是 contain 约束框，输出尺寸由内容比例决定：
 * 主导轴精确命中设定值，另一轴按比例推导。
 */
export interface ExportPreset {
  id: string;
  /** 展示名，同时参与导出文件命名 */
  label: string;
  format: ExportFormat;
  /** 目标框宽度（像素）。缺省表示该轴不设约束。 */
  width?: number;
  /** 目标框高度（像素）。缺省表示该轴不设约束。 */
  height?: number;
  /** 用户倍率：在解算出的像素尺寸之上做位图超采样 */
  scale: number;
  /** 编码质量 1..100，仅 JPEG / WebP 生效 */
  quality: number;
}

/**
 * 渲染基准适配器：把 `--co-base` 的读写交给页面。
 *
 * 模板几何全部是 `--co-base` 的倍数，导出时通过「探针 → 测量 → 反解」
 * 求出命中目标框的基准值，因此这一步必须由持有 DOM 的一方提供。
 */
export interface ExportSizeAdapter {
  /** 设置渲染基准（`--co-base`），返回时该值已生效并等待过 reflow */
  setBase: (base: number) => Promise<void>;
  /** 读取当前内容的布局尺寸（不受外层 transform 影响） */
  measure: () => { width: number; height: number };
}

export interface ExportRunContext {
  /** 导出文件名主干，通常取原图文件名（不含扩展名） */
  baseName?: string;
  /** 模板导出所需的基准适配器；缺省时按元素当前尺寸直接捕获 */
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
