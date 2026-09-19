import type { CachedImageMeta } from '@/platform/contracts';
import type { AssetServiceContract, ImportPhotoOptions } from '@/platform/contracts/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { webFiles } from '@/platform/providers/web/web-platform-provider';
import {
  type ImportedPhoto,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_TYPES,
} from '@/shared/types/photo';
import {
  clearPreviewResourceCache,
  clearThumbnailCache,
  getPreviewResourceCache,
  getThumbnailCache,
  setPreviewResourceCache,
  setThumbnailCache,
} from './cache-service';

const {
  getConfig,
  importImageBytesToCache,
  importImageToCache,
  isNativeWindowAvailable,
  listImageFilesInDirectory,
  openDirectoryDialog,
  openImageDialog,
  pathExists,
  toNativeFileUrl,
} = platformRuntime;

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
  const previewUrl = getPreviewResourceCache(meta.path) ?? toNativeFileUrl(meta.preview_path);
  const cachedThumbnail = getThumbnailCache(meta.path);
  const thumbnailUrl = meta.thumbnail_ready
    ? (cachedThumbnail ?? toNativeFileUrl(meta.thumbnail_path))
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
    isHeic: meta.ext === 'heic' || meta.ext === 'heif' || meta.ext === 'hif',
  };
}

function toImportedPhotoFromFile(file: File): ImportedPhoto {
  const previewUrl = webFiles.toUrl(file);
  return {
    id: photoId(file.name),
    name: file.name,
    path: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    previewUrl,
    thumbnailUrl: previewUrl,
    thumbnailReady: true,
    isHeic: /\.(heic|heif|hif)$/i.test(file.name),
    sourceFile: file,
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

        const nextThumbnailUrl = `${toNativeFileUrl(thumbnailPath)}?v=${Date.now()}-${attempts}`;
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
  options?: ImportPhotoOptions,
): Promise<ImportedPhoto[]> {
  if (!isNativeWindowAvailable()) {
    const selection = await webFiles.pickImages();
    return processDroppedFiles(selection.files, options);
  }

  const selected = await openImageDialog();

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return importPhotosViaPaths(paths, options);
}

export async function selectPhotosFromDirectory(
  options?: ImportPhotoOptions,
): Promise<ImportedPhoto[]> {
  const selected = await openDirectoryDialog();

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
  options?: ImportPhotoOptions,
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
  options?: ImportPhotoOptions,
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

  if (!isNativeWindowAvailable()) {
    const photos = importableFiles.map(toImportedPhotoFromFile);
    photos.forEach((photo, index) => {
      options?.onPhotoImported?.(photo);
      options?.onProgress?.({ current: index + 1, total: photos.length, currentName: photo.name });
    });
    return photos;
  }

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

/**
 * 当前会话正在使用的素材路径。
 *
 * 缓存目录里存的就是这些导入副本本身（图片、预览、缩略图共用同一个文件主干），
 * 清缓存时必须避开它们：删掉会让内存中的素材条目指向不存在的文件，
 * 表现为预览空白、导出失败，且只能重新导入。
 *
 * Template 与 Collage 的素材会话彼此独立，因此按会话 id 汇总而不是各存一份。
 */
const sessionAssetPaths = new Map<string, readonly string[]>();

export function trackSessionAssets(sessionId: string, paths: readonly string[]): void {
  sessionAssetPaths.set(sessionId, paths);
}

export function releaseSessionAssets(sessionId: string): void {
  sessionAssetPaths.delete(sessionId);
}

/** 汇总各会话正在使用的素材路径，作为清理缓存时的保留名单。 */
export function getInUseAssetPaths(): string[] {
  const paths = new Set<string>();

  for (const list of sessionAssetPaths.values()) {
    for (const path of list) {
      if (path) {
        paths.add(path);
      }
    }
  }

  return [...paths];
}

export class AssetService implements AssetServiceContract {
  selectPhotosViaDialog = selectPhotosViaDialog;
  selectPhotosFromDirectory = selectPhotosFromDirectory;
  processDroppedFiles = processDroppedFiles;
  clearAssetCaches = clearAssetCaches;
}

export const assetService = new AssetService();
