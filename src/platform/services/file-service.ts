import type { FileAdapter } from '@/platform/contracts/file';
import type { FileServiceContract } from '@/platform/contracts/platform';

export class FileService implements FileServiceContract {
  constructor(private readonly adapter: FileAdapter) {}

  readImageFile = (path: string) => this.adapter.readImageFile(path);
  writeBinaryFile = (path: string, contents: number[]) =>
    this.adapter.writeBinaryFile(path, contents);
  listImageFilesInDirectory = (path: string) => this.adapter.listImageFilesInDirectory(path);
  importImageToCache = (path: string, cacheDir: string) =>
    this.adapter.importImageToCache(path, cacheDir);
  importImageBytesToCache = (name: string, contents: number[], cacheDir: string) =>
    this.adapter.importImageBytesToCache(name, contents, cacheDir);
  getCacheOverview = (cacheDir: string) => this.adapter.getCacheOverview(cacheDir);
  clearCache = (cacheDir: string, scope?: 'all' | 'thumbnails' | 'previews') =>
    this.adapter.clearCache(cacheDir, scope);
  cleanupCache = (cacheDir: string, maxAgeDays: number) =>
    this.adapter.cleanupCache(cacheDir, maxAgeDays);
}

export type {
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ImageFileMeta,
} from '@/platform/contracts';
