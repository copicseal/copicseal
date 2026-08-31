import type {
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ImageFileMeta,
} from '@/platform/contracts';
import type { FileAdapter } from '@/platform/contracts/file';
import { unsupportedWebPathOperation, webFiles } from './web-platform-provider';

export class WebFileAdapter implements FileAdapter {
  pickImages = webFiles.pickImages.bind(webFiles);
  save = webFiles.save.bind(webFiles);
  toUrl = webFiles.toUrl.bind(webFiles);

  readImageFile = async (_path: string): Promise<ImageFileMeta> =>
    unsupportedWebPathOperation('readImageFile');
  writeBinaryFile = async (_path: string, _contents: number[]): Promise<void> =>
    unsupportedWebPathOperation('writeBinaryFile');
  listImageFilesInDirectory = async (_path: string): Promise<string[]> =>
    unsupportedWebPathOperation('listImageFilesInDirectory');
  importImageToCache = async (_path: string, _cacheDir: string): Promise<CachedImageMeta> =>
    unsupportedWebPathOperation('importImageToCache');
  importImageBytesToCache = async (
    _name: string,
    _contents: number[],
    _cacheDir: string,
  ): Promise<CachedImageMeta> => unsupportedWebPathOperation('importImageBytesToCache');
  getCacheOverview = async (_cacheDir: string): Promise<CacheOverview> =>
    unsupportedWebPathOperation('getCacheOverview');
  clearCache = async (
    _cacheDir: string,
    _scope?: 'all' | 'thumbnails' | 'previews',
  ): Promise<CacheOverview> => unsupportedWebPathOperation('clearCache');
  cleanupCache = async (_cacheDir: string, _maxAgeDays: number): Promise<CacheCleanupResult> =>
    unsupportedWebPathOperation('cleanupCache');
}
