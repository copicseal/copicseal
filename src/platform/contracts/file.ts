export type {
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ImageFileMeta,
  WebFileProvider,
  WebFileSelection,
} from './index';

import type { CacheCleanupResult, CachedImageMeta, CacheOverview, ImageFileMeta } from './index';

export interface FileAdapter {
  readImageFile(path: string): Promise<ImageFileMeta>;
  writeBinaryFile(path: string, contents: number[]): Promise<void>;
  listImageFilesInDirectory(path: string): Promise<string[]>;
  importImageToCache(path: string, cacheDir: string): Promise<CachedImageMeta>;
  importImageBytesToCache(
    name: string,
    contents: number[],
    cacheDir: string,
  ): Promise<CachedImageMeta>;
  getCacheOverview(cacheDir: string): Promise<CacheOverview>;
  clearCache(
    cacheDir: string,
    scope?: 'all' | 'thumbnails' | 'previews',
    /** 正在使用的素材路径，清理时保留它们的副本 */
    keepPaths?: readonly string[],
  ): Promise<CacheOverview>;
  cleanupCache(
    cacheDir: string,
    maxAgeDays: number,
    keepPaths?: readonly string[],
  ): Promise<CacheCleanupResult>;
}
