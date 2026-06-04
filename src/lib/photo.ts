/** 支持的图片格式 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'];

/** 导入的照片实体 */
export interface ImportedPhoto {
  id: string;
  name: string;
  /** 原始文件路径（本地路径，来自 Tauri dialog） */
  path?: string;
  /** 文件对象（拖拽导入时） */
  file?: File;
  /** 前端预览 URL */
  previewUrl: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 是否为 HEIC 格式 */
  isHeic: boolean;
}
