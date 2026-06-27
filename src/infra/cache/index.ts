const thumbnailCache = new Map<string, string>();
const previewResourceCache = new Map<string, string>();

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
