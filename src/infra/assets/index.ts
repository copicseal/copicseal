import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getConfig, pathExists } from '@/api';
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

export interface ImportProgressSnapshot {
  current: number;
  total: number;
  currentName?: string;
}

interface ImportPhotosOptions {
  onPhotoImported?: (photo: ImportedPhoto) => void;
  onPhotoUpdated?: (photo: ImportedPhoto) => void;
  onProgress?: (progress: ImportProgressSnapshot) => void;
}

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
  const previewUrl = getPreviewResourceCache(meta.path) ?? convertFileSrc(meta.preview_path);
  const cachedThumbnail = getThumbnailCache(meta.path);
  const thumbnailUrl = meta.thumbnail_ready
    ? (cachedThumbnail ?? convertFileSrc(meta.thumbnail_path))
    : previewUrl;

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
    thumbnailReady: meta.thumbnail_ready,
    isHeic: meta.ext === 'heic' || meta.ext === 'heif',
  };
}

function waitForThumbnail(
  photo: ImportedPhoto,
  thumbnailPath: string,
  onPhotoUpdated?: (photo: ImportedPhoto) => void,
) {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return;
  }

  let attempts = 0;
  const startedAt = Date.now();
  const maxWaitMs = 10 * 60 * 1000;

  const probe = () => {
    if (Date.now() - startedAt >= maxWaitMs) {
      console.warn('Thumbnail generation timed out', {
        photoPath: photo.path,
        thumbnailPath,
      });
      return;
    }

    attempts += 1;
    void pathExists(thumbnailPath)
      .then((exists) => {
        if (!exists) {
          window.setTimeout(probe, Math.min(250 * attempts, 1500));
          return;
        }

        const nextThumbnailUrl = `${convertFileSrc(thumbnailPath)}?v=${Date.now()}-${attempts}`;
        const image = new Image();

        image.onload = () => {
          setThumbnailCache(photo.path, nextThumbnailUrl);
          onPhotoUpdated?.({
            ...photo,
            thumbnailUrl: nextThumbnailUrl,
            thumbnailReady: true,
          });
        };

        image.onerror = () => {
          window.setTimeout(probe, Math.min(250 * attempts, 1500));
        };

        image.src = nextThumbnailUrl;
      })
      .catch(() => {
        window.setTimeout(probe, Math.min(250 * attempts, 1500));
      });
  };

  probe();
}

async function resolveCacheDirectory(): Promise<string> {
  const config = await getConfig();
  return config.cache.directory;
}

export async function selectPhotosViaDialog(
  options?: ImportPhotosOptions,
): Promise<ImportedPhoto[]> {
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
  return importPhotosViaPaths(paths, options);
}

export async function selectPhotosFromDirectory(
  options?: ImportPhotosOptions,
): Promise<ImportedPhoto[]> {
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

  return importPhotosViaPaths(filePaths, options);
}

export async function importPhotosViaPaths(
  filePaths: string[],
  options?: ImportPhotosOptions,
): Promise<ImportedPhoto[]> {
  const cacheDir = await resolveCacheDirectory();
  const photos: ImportedPhoto[] = [];
  options?.onProgress?.({
    current: 0,
    total: filePaths.length,
  });

  for (const [index, filePath] of filePaths.entries()) {
    const meta = await importImageToCache(filePath, cacheDir);
    const photo = toImportedPhoto(meta);
    photos.push(photo);
    options?.onPhotoImported?.(photo);
    if (!meta.thumbnail_ready) {
      waitForThumbnail(photo, meta.thumbnail_path, options?.onPhotoUpdated);
    }
    options?.onProgress?.({
      current: index + 1,
      total: filePaths.length,
      currentName: photo.name,
    });
  }

  return photos;
}

export async function processDroppedFiles(
  files: FileList | File[],
  options?: ImportPhotosOptions,
): Promise<ImportedPhoto[]> {
  const fileArr = Array.from(files);
  const cacheDir = await resolveCacheDirectory();
  const photos: ImportedPhoto[] = [];
  const importableFiles = fileArr.filter(
    (file) => SUPPORTED_IMAGE_TYPES.includes(file.type) || isSupportedExt(file.name),
  );
  options?.onProgress?.({
    current: 0,
    total: importableFiles.length,
  });

  for (const [index, file] of importableFiles.entries()) {
    const contents = Array.from(new Uint8Array(await file.arrayBuffer()));
    const meta = await importImageBytesToCache(file.name, contents, cacheDir);
    const photo = toImportedPhoto(meta);
    photos.push(photo);
    options?.onPhotoImported?.(photo);
    if (!meta.thumbnail_ready) {
      waitForThumbnail(photo, meta.thumbnail_path, options?.onPhotoUpdated);
    }
    options?.onProgress?.({
      current: index + 1,
      total: importableFiles.length,
      currentName: photo.name,
    });
  }

  return photos;
}

export function clearAssetCaches() {
  clearThumbnailCache();
  clearPreviewResourceCache();
}
