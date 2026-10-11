/** 支持的图片格式 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.hif',
  '.webp',
];

/** 导入的照片实体 */
export interface ImportedPhoto {
  id: string;
  name: string;
  /** 缓存后的本地文件路径 */
  path: string;
  /** 原始文件路径（如果存在） */
  originalPath?: string;
  /** 前端预览 URL */
  previewUrl: string;
  /**
   * 预览文件的本地路径（桌面端才有）。
   *
   * HEIC/HIF 的 EXIF 在 ISO-BMFF 容器里，Rust 侧的 `exif` crate 只认 JPEG/TIFF 读不到，
   * 而导入时生成的预览是 JPEG 且保留了完整 EXIF，所以这类格式的 EXIF 改从这里读。
   */
  previewPath?: string;
  /** 素材列表使用的缩略图 URL */
  thumbnailUrl: string;
  /** 缂╃暐鍥炬槸鍚﹀凡缁忓氨缁? */
  thumbnailReady: boolean;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 是否为 HEIC 格式 */
  isHeic: boolean;
  /** Web 模式下保留原始 File，用于 EXIF 读取和写回。 */
  sourceFile?: File;
}
