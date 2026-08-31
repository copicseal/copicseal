import type { FileServiceContract } from '@/platform/contracts/platform';
import {
  cleanupCache as tauriCleanupCache,
  clearCache as tauriClearCache,
  getCacheOverview as tauriGetCacheOverview,
  importImageBytesToCache as tauriImportImageBytesToCache,
  importImageToCache as tauriImportImageToCache,
  listImageFilesInDirectory as tauriListImageFilesInDirectory,
  readImageFile as tauriReadImageFile,
  writeBinaryFile as tauriWriteBinaryFile,
} from '@/platform/providers/tauri/api';

export class FileService implements FileServiceContract {
  readImageFile = tauriReadImageFile;
  writeBinaryFile = tauriWriteBinaryFile;
  listImageFilesInDirectory = tauriListImageFilesInDirectory;
  importImageToCache = tauriImportImageToCache;
  importImageBytesToCache = tauriImportImageBytesToCache;
  getCacheOverview = tauriGetCacheOverview;
  clearCache = tauriClearCache;
  cleanupCache = tauriCleanupCache;
}

export const fileService = new FileService();

export type {
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ImageFileMeta,
} from '@/platform/contracts';
