/**
 * 导出格式。
 *
 * 暂时不含 WebP：WKWebView 不支持 canvas 编码 WebP，`toBlob` 会静默退回 PNG，
 * 产出的是一个后缀为 `.webp` 的 PNG（体积与 PNG 相同、质量参数无效）。
 * 要恢复得先把 WebP 编码挪到 Rust 侧（`image` crate 已支持）。
 */
export type ExportFormat = 'jpeg' | 'png';

/**
 * 单档导出配置：一档 = 一组目标尺寸 + 一套编码参数。
 *
 * `width` / `height` 是必填的目标框。无背景时它只作 contain 约束，
 * 有背景时它就是画框的精确尺寸（整除尺寸解算见 `docs/04`）。
 */
export interface ExportPreset {
  id: string;
  /**
   * 导出文件名，不含扩展名。
   *
   * 留空表示自动命名：`<原图名>@<宽>x<高>`，会随目标尺寸一起变；
   * 一旦填了就用填写的名字，扩展名始终跟随 `format`。
   */
  fileName?: string;
  format: ExportFormat;
  /** 目标框宽度（像素） */
  width: number;
  /** 目标框高度（像素） */
  height: number;
  /** 用户倍率：在解算出的像素尺寸之上做位图超采样 */
  scale: number;
  /** 编码质量 1..100，仅 JPEG 生效 */
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
