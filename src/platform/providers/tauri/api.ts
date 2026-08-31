import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import type {
  AppConfig,
  AppVersion,
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ComarkTemplateRecord,
  ExifData,
  FontInfo,
  ImageFileMeta,
  UpsertComarkTemplatePayload,
  WindowFrameMode,
} from '@/platform/contracts';

export type {
  AppConfig,
  AppVersion,
  CacheCleanupResult,
  CacheConfig,
  CachedImageMeta,
  CacheOverview,
  ComarkTemplateRecord,
  EnabledTemplate,
  ExifData,
  FontConfig,
  FontInfo,
  ImageFileMeta,
  OutputConfig,
  OutputPreset,
  TemplateListConfig,
  TemplatePreset,
  TemplateRegistry,
  UpsertComarkTemplatePayload,
  UserDevice,
  WindowFrameMode,
} from '@/platform/contracts';

export function readExif(path: string): Promise<ExifData> {
  return invoke('read_exif', { path });
}
export function readImageFile(path: string): Promise<ImageFileMeta> {
  return invoke('read_image_file', { path });
}
export function writeBinaryFile(path: string, contents: number[]): Promise<void> {
  return invoke('write_file', { path, contents });
}
export function listImageFilesInDirectory(path: string): Promise<string[]> {
  return invoke('list_image_files_in_directory', { path });
}
export function listSystemFonts(): Promise<FontInfo[]> {
  return invoke('list_system_fonts');
}
export function getConfig(): Promise<AppConfig> {
  return invoke('get_config');
}
export function updateConfig(config: AppConfig): Promise<void> {
  return invoke('update_config', { config });
}
export function applyWindowFrameMode(mode: WindowFrameMode): Promise<void> {
  return invoke('apply_window_frame_mode', { mode });
}
export function getAppInfo(): Promise<AppVersion> {
  return invoke('get_app_info');
}
export function importImageToCache(path: string, cacheDir: string): Promise<CachedImageMeta> {
  return invoke('import_image_to_cache', { path, cacheDir });
}
export function importImageBytesToCache(
  name: string,
  contents: number[],
  cacheDir: string,
): Promise<CachedImageMeta> {
  return invoke('import_image_bytes_to_cache', { name, contents, cacheDir });
}
export function getCacheOverview(cacheDir: string): Promise<CacheOverview> {
  return invoke('get_cache_overview', { cacheDir });
}
export function clearCache(
  cacheDir: string,
  scope?: 'all' | 'thumbnails' | 'previews',
): Promise<CacheOverview> {
  return invoke('clear_cache', { cacheDir, scope });
}
export function cleanupCache(cacheDir: string, maxAgeDays: number): Promise<CacheCleanupResult> {
  return invoke('cleanup_cache', { cacheDir, maxAgeDays });
}
export function pathExists(path: string): Promise<boolean> {
  return invoke('path_exists', { path });
}
export function openDirectory(path: string): Promise<void> {
  return invoke('open_directory', { path });
}
export function getDeviceId(): Promise<string> {
  return invoke('get_device_id');
}
export function listComarkTemplates(): Promise<ComarkTemplateRecord[]> {
  return invoke('list_comark_templates');
}
export function upsertComarkTemplate(
  payload: UpsertComarkTemplatePayload,
): Promise<ComarkTemplateRecord> {
  return invoke('upsert_comark_template', { payload });
}
export function removeComarkTemplate(id: string): Promise<void> {
  return invoke('remove_comark_template', { id });
}
export function setComarkTemplateEnabled(id: string, enabled: boolean): Promise<void> {
  return invoke('set_comark_template_enabled', { id, enabled });
}
export function extractJpegExif(path: string): Promise<number[]> {
  return invoke('extract_jpeg_exif', { path });
}
export function insertJpegExif(jpegData: number[], exifSegment: number[]): Promise<number[]> {
  return invoke('insert_jpeg_exif', { jpegData, exifSegment });
}

export function onNativeFileDrop(
  handler: Parameters<ReturnType<typeof getCurrentWindow>['onDragDropEvent']>[0],
) {
  if (!isNativeWindowAvailable()) return Promise.resolve(() => undefined);
  return getCurrentWindow().onDragDropEvent(handler);
}
export function isNativeWindowAvailable() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
export function getWindowMaximized() {
  return isNativeWindowAvailable() ? getCurrentWindow().isMaximized() : Promise.resolve(false);
}
export function onWindowResize(handler: () => void) {
  return isNativeWindowAvailable()
    ? getCurrentWindow().onResized(handler)
    : Promise.resolve(() => undefined);
}
export function minimizeWindow() {
  return getCurrentWindow().minimize();
}
export function toggleMaximizeWindow() {
  return getCurrentWindow().toggleMaximize();
}
export function closeWindow() {
  return getCurrentWindow().close();
}
export function openDirectoryDialog() {
  return open({ directory: true, multiple: false });
}
export function checkForUpdate() {
  return check();
}
export function toNativeFileUrl(path: string) {
  return isNativeWindowAvailable() ? convertFileSrc(path) : path;
}
export function openImageDialog() {
  return open({
    multiple: true,
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'heic', 'heif', 'hif', 'webp'] }],
  });
}
export function saveImageDialog(defaultPath: string, extension: string) {
  return save({
    defaultPath,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });
}
