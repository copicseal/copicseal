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

export class TauriFileAdapter {
  readonly readImageFile = readImageFile;
  readonly writeBinaryFile = writeBinaryFile;
  readonly listImageFilesInDirectory = listImageFilesInDirectory;
  readonly importImageToCache = importImageToCache;
  readonly importImageBytesToCache = importImageBytesToCache;
  readonly getCacheOverview = getCacheOverview;
  readonly clearCache = clearCache;
  readonly cleanupCache = cleanupCache;
}
