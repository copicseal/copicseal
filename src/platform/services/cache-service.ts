const thumbnailCache = new Map<string, string>();
const previewResourceCache = new Map<string, string>();

import type { CacheServiceContract } from '@/platform/contracts/platform';

export function getThumbnailCache(path: string): string | null {
  return thumbnailCache.get(path) ?? null;
}

export function setThumbnailCache(path: string, previewUrl: string) {
  thumbnailCache.set(path, previewUrl);
}

export function clearThumbnailCache() {
  thumbnailCache.clear();
}

export function getPreviewResourceCache(key: string): string | null {
  return previewResourceCache.get(key) ?? null;
}

export function setPreviewResourceCache(key: string, value: string) {
  previewResourceCache.set(key, value);
}

export function clearPreviewResourceCache() {
  previewResourceCache.clear();
}

export class CacheService implements CacheServiceContract {
  getThumbnailCache = getThumbnailCache;
  setThumbnailCache = setThumbnailCache;
  clearThumbnailCache = clearThumbnailCache;
  getPreviewResourceCache = getPreviewResourceCache;
  setPreviewResourceCache = setPreviewResourceCache;
  clearPreviewResourceCache = clearPreviewResourceCache;
}

export const cacheService = new CacheService();
