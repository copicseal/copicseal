import type { FileAdapter } from '@/platform/contracts/file';
import {
  cleanupCache,
  clearCache,
  getCacheOverview,
  importImageBytesToCache,
  importImageToCache,
  listImageFilesInDirectory,
  readImageFile,
  writeBinaryFile,
} from './api';

export class TauriFileAdapter implements FileAdapter {
  readonly readImageFile = readImageFile;
  readonly writeBinaryFile = writeBinaryFile;
  readonly listImageFilesInDirectory = listImageFilesInDirectory;
  readonly importImageToCache = importImageToCache;
  readonly importImageBytesToCache = importImageBytesToCache;
  readonly getCacheOverview = getCacheOverview;
  readonly clearCache = clearCache;
  readonly cleanupCache = cleanupCache;
}
