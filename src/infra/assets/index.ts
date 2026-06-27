import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  clearPreviewResourceCache,
  clearThumbnailCache,
  getPreviewResourceCache,
  getThumbnailCache,
  setPreviewResourceCache,
  setThumbnailCache,
} from '@/infra/cache';
import { listImageFilesInDirectory, readImageFile } from '@/infra/fs';
import { type ImportedPhoto, SUPPORTED_IMAGE_EXTENSIONS, SUPPORTED_IMAGE_TYPES } from '@/lib/photo';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function photoId(name: string): string {
  return `${name}-${uid()}`;
}

function isSupportedExt(name: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

async function resolvePreviewUrl(path: string, ext: string): Promise<string> {
  const cached = getThumbnailCache(path);
  if (cached) {
    return cached;
  }

  const isHeic = ext === 'heic';
  let previewUrl: string;

  if (isHeic) {
    try {
      const pngPath = await invoke<string>('convert_heic_to_png', {
        input: path,
      });
      previewUrl = `asset://localhost/${encodeURIComponent(pngPath)}`;
    } catch {
      previewUrl = `asset://localhost/${encodeURIComponent(path)}`;
    }
  } else {
    previewUrl = `asset://localhost/${encodeURIComponent(path)}`;
  }

  setThumbnailCache(path, previewUrl);
  return previewUrl;
}

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

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return importPhotosViaPaths(paths);
}

export async function selectPhotosFromDirectory(): Promise<ImportedPhoto[]> {
  const selected = await open({
    directory: true,
    multiple: false,
  });

  if (!selected || Array.isArray(selected)) {
    return [];
  }

  const filePaths = await listImageFilesInDirectory(selected);
  if (!filePaths.length) {
    return [];
  }

  return importPhotosViaPaths(filePaths);
}

export async function importPhotosViaPaths(filePaths: string[]): Promise<ImportedPhoto[]> {
  const photos: ImportedPhoto[] = [];

  for (const filePath of filePaths) {
    const meta = await readImageFile(filePath);
    const previewUrl = await resolvePreviewUrl(meta.path, meta.ext);
    const isHeic = meta.ext === 'heic';

    photos.push({
      id: photoId(meta.name),
      name: meta.name,
      path: meta.path,
      size: meta.size,
      mimeType: isHeic ? 'image/png' : meta.mime_type,
      previewUrl,
      isHeic,
    });
  }

  return photos;
}

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
    setPreviewResourceCache(file.name, previewUrl);

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

export function clearAssetCaches() {
  clearThumbnailCache();
  clearPreviewResourceCache();
}

export function getCachedPreviewResource(key: string): string | null {
  return getPreviewResourceCache(key);
}
