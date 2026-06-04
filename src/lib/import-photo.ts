import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { type ImportedPhoto, SUPPORTED_IMAGE_EXTENSIONS, SUPPORTED_IMAGE_TYPES } from '@/lib/photo';

/** 生成唯一 ID */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 根据文件名生成唯一 photo ID */
function photoId(name: string): string {
  return `${name}-${uid()}`;
}

/** 通过 Tauri 文件对话框选择图片 */
export async function selectPhotosViaDialog(): Promise<ImportedPhoto[]> {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: '图片',
        extensions: SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.replace('.', '')),
      },
    ],
  });

  if (!selected) return [];

  const paths = Array.isArray(selected) ? selected : [selected];

  const photos: ImportedPhoto[] = [];
  for (const filePath of paths) {
    const meta = await invoke<{
      name: string;
      path: string;
      size: number;
      ext: string;
      mime_type: string;
    }>('read_image_file', { path: filePath });

    photos.push({
      id: photoId(meta.name),
      name: meta.name,
      path: meta.path,
      size: meta.size,
      mimeType: meta.mime_type,
      previewUrl: `asset://localhost/${encodeURIComponent(meta.path)}`,
      isHeic: meta.ext === 'heic',
    });
  }

  return photos;
}

/** 通过拖拽/文件输入处理 File 对象列表 */
export async function processDroppedFiles(files: FileList | File[]): Promise<ImportedPhoto[]> {
  const fileArr = Array.from(files);
  const photos: ImportedPhoto[] = [];

  for (const file of fileArr) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type) && !isSupportedExt(file.name)) {
      continue;
    }

    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');
    const previewUrl = URL.createObjectURL(file);

    photos.push({
      id: photoId(file.name),
      name: file.name,
      file,
      size: file.size,
      mimeType: file.type || 'image/jpeg',
      previewUrl,
      isHeic,
    });
  }

  return photos;
}

function isSupportedExt(name: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}
