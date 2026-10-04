import type { ExportOptions, ExportRunContext } from '@/shared/types/export';
import type { ImportedPhoto } from '@/shared/types/photo';
import type {
  AppConfig,
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  FontInfo,
  ImageFileMeta,
  InlineFont,
} from './index';
import type { ImportProgressSnapshot } from './services';

export interface AssetServiceContract {
  selectPhotosViaDialog(options?: ImportPhotoOptions): Promise<ImportedPhoto[]>;
  selectPhotosFromDirectory(options?: ImportPhotoOptions): Promise<ImportedPhoto[]>;
  processDroppedFiles(
    files: FileList | File[],
    options?: ImportPhotoOptions,
  ): Promise<ImportedPhoto[]>;
  clearAssetCaches(): void;
}

export interface ImportPhotoOptions {
  onPhotoImported?: (photo: ImportedPhoto) => void;
  onPhotoUpdated?: (photo: ImportedPhoto) => void;
  onProgress?: (progress: ImportProgressSnapshot) => void;
}

export interface ExportServiceContract {
  exportSingle(
    element: HTMLElement,
    options: ExportOptions,
    sourcePath?: string,
    context?: ExportRunContext,
  ): Promise<void>;
  createExportTask(total: number): string;
  getExportTaskState(
    taskId: string,
  ): { total: number; completed: number; cancelled: boolean } | null;
  cancelExportTask(taskId: string): void;
}

export interface FileServiceContract {
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

export interface StorageServiceContract {
  getConfig(): Promise<AppConfig>;
  updateConfig(config: AppConfig): Promise<void>;
  listSystemFonts(): Promise<FontInfo[]>;
  /**
   * 按画布上真正出现的字符，把一个字体家族子集化成可内联的 data URL。
   *
   * `text` 是画布里的全部文字；返回 `null` 表示不内联，由调用方退回通用字体。
   */
  inlineSystemFont(family: string, text: string): Promise<InlineFont | null>;
}

export interface StorageAdapter extends StorageServiceContract {}

export interface CacheServiceContract {
  getThumbnailCache(path: string): string | null;
  setThumbnailCache(path: string, value: string): void;
  clearThumbnailCache(): void;
  getPreviewResourceCache(key: string): string | null;
  setPreviewResourceCache(key: string, value: string): void;
  clearPreviewResourceCache(): void;
}

export interface Platform {
  readonly assets: AssetServiceContract;
  readonly export: ExportServiceContract;
  readonly files: FileServiceContract;
  readonly storage: StorageServiceContract;
  readonly cache: CacheServiceContract;
  readonly capabilities: PlatformCapabilities;
}

export interface PlatformCapabilities {
  image: { resize: boolean; composite: boolean; heicDecode: boolean };
  files: { pickImages: boolean; saveToDirectory: boolean; download: boolean };
  system: { tray: boolean; openPath: boolean; autoUpdate: boolean };
}

export interface PlatformProvider {
  readonly id: string;
  readonly capabilities: PlatformCapabilities;
}
