import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getConfig } from '@/api';
import {
  clearPreviewResourceCache,
  clearThumbnailCache,
  getPreviewResourceCache,
  getThumbnailCache,
  setPreviewResourceCache,
  setThumbnailCache,
} from '@/infra/cache';
import {
  type CachedImageMeta,
  importImageBytesToCache,
  importImageToCache,
  listImageFilesInDirectory,
} from '@/infra/fs';
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

function toImportedPhoto(meta: CachedImageMeta): ImportedPhoto {
  const cachedThumbnail = getThumbnailCache(meta.path);
  const thumbnailUrl = cachedThumbnail ?? convertFileSrc(meta.thumbnail_path);
  const previewUrl = getPreviewResourceCache(meta.path) ?? convertFileSrc(meta.preview_path);

  setThumbnailCache(meta.path, thumbnailUrl);
  setPreviewResourceCache(meta.path, previewUrl);

  return {
    id: photoId(meta.name),
    name: meta.name,
    path: meta.path,
    originalPath: meta.original_path ?? undefined,
    size: meta.size,
    mimeType: meta.mime_type,
    previewUrl,
    thumbnailUrl,
    isHeic: meta.ext === 'heic' || meta.ext === 'heif',
  };
}

async function resolveCacheDirectory(): Promise<string> {
  const config = await getConfig();
  return config.cache.directory;
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
  const cacheDir = await resolveCacheDirectory();
  const photos: ImportedPhoto[] = [];

  for (const filePath of filePaths) {
    const meta = await importImageToCache(filePath, cacheDir);
    photos.push(toImportedPhoto(meta));
  }

  return photos;
}

export async function processDroppedFiles(files: FileList | File[]): Promise<ImportedPhoto[]> {
  const fileArr = Array.from(files);
  const cacheDir = await resolveCacheDirectory();
  const photos: ImportedPhoto[] = [];

  for (const file of fileArr) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type) && !isSupportedExt(file.name)) {
      continue;
    }

    const contents = Array.from(new Uint8Array(await file.arrayBuffer()));
    const meta = await importImageBytesToCache(file.name, contents, cacheDir);
    photos.push(toImportedPhoto(meta));
  }

  return photos;
}

export function clearAssetCaches() {
  clearThumbnailCache();
  clearPreviewResourceCache();
}
