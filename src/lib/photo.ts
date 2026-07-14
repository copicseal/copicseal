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
}
