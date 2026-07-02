import { invoke } from '@tauri-apps/api/core';

export interface ExifData {
  make: string | null;
  model: string | null;
  lens_model: string | null;
  aperture: string | null;
  shutter_speed: string | null;
  iso: string | null;
  focal_length: string | null;
  exposure_compensation: string | null;
  date_taken: string | null;
  white_balance: string | null;
  metering_mode: string | null;
  latitude: number | null;
  longitude: number | null;
  image_width: number | null;
  image_height: number | null;
}

export interface FontInfo {
  family: string;
  postscript_name: string | null;
}

export interface ImageFileMeta {
  name: string;
  path: string;
  size: number;
  ext: string;
  mime_type: string;
}

export type WindowFrameMode = 'native' | 'frameless';

export interface AppConfig {
  language: string;
  theme: string;
  window_frame_mode: WindowFrameMode;
  save_directory: string;
  cache: CacheConfig;
  output: OutputConfig;
  fonts: FontConfig;
  template_presets: TemplatePreset[];
  template_list: TemplateListConfig;
  user_devices: UserDevice[];
  device_id: string;
}

export interface CacheConfig {
  directory: string;
  auto_cleanup_on_startup: boolean;
  max_age_days: number;
}

export interface OutputConfig {
  presets: OutputPreset[];
  default_path: string;
  retain_exif: boolean;
}

export interface OutputPreset {
  id?: string;
  name?: string;
  type: string;
  width: number;
  height: number;
  scale: number;
  quality: number;
  is_original: boolean;
}

export interface FontConfig {
  favorites: string[];
  default_font: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  template_id: string;
  template_props: Record<string, unknown>;
  background: Record<string, unknown>;
  font: string;
}

export interface TemplateListConfig {
  enabled: EnabledTemplate[];
  remote_registry: TemplateRegistry[];
}

export interface EnabledTemplate {
  template_id: string;
  name: string;
}

export interface TemplateRegistry {
  id: string;
  name: string;
  url: string;
}

export interface UserDevice {
  id: string;
  name: string;
  device_type: string;
  brand: string;
  model: string;
  lens: string;
  exif_overrides: Record<string, unknown>;
}

export interface ComarkTemplateRecord {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  license: string | null;
  source_type: string;
  registry_url: string | null;
  local_path: string | null;
  enabled: boolean;
  installed_at: string;
  updated_at: string;
}

export interface UpsertComarkTemplatePayload {
  id: string;
  name: string;
  version: string;
  description?: string | null;
  author?: string | null;
  license?: string | null;
  source_type: 'built_in' | 'remote';
  registry_url?: string | null;
  local_path?: string | null;
  enabled: boolean;
}

export interface AppVersion {
  version: string;
  name: string;
}

export interface CachedImageMeta {
  name: string;
  original_path: string | null;
  path: string;
  preview_path: string;
  thumbnail_path: string;
  thumbnail_ready: boolean;
  size: number;
  ext: string;
  mime_type: string;
}

export interface CacheOverview {
  directory: string;
  image_count: number;
  preview_count: number;
  thumbnail_count: number;
  image_bytes: number;
  preview_bytes: number;
  thumbnail_bytes: number;
  total_bytes: number;
}

export interface CacheCleanupResult {
  removed_files: number;
  removed_bytes: number;
}

export function readExif(path: string): Promise<ExifData> {
  return invoke<ExifData>('read_exif', { path });
}

export function readImageFile(path: string): Promise<ImageFileMeta> {
  return invoke<ImageFileMeta>('read_image_file', { path });
}

export function writeBinaryFile(path: string, contents: number[]): Promise<void> {
  return invoke('write_file', { path, contents });
}

export function listImageFilesInDirectory(path: string): Promise<string[]> {
  return invoke<string[]>('list_image_files_in_directory', { path });
}

export function listSystemFonts(): Promise<FontInfo[]> {
  return invoke<FontInfo[]>('list_system_fonts');
}

export function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}

export function updateConfig(config: AppConfig): Promise<void> {
  return invoke('update_config', { config });
}

export function applyWindowFrameMode(mode: WindowFrameMode): Promise<void> {
  return invoke('apply_window_frame_mode', { mode });
}

export function getAppInfo(): Promise<AppVersion> {
  return invoke<AppVersion>('get_app_info');
}

export function importImageToCache(path: string, cacheDir: string): Promise<CachedImageMeta> {
  return invoke<CachedImageMeta>('import_image_to_cache', { path, cacheDir });
}

export function importImageBytesToCache(
  name: string,
  contents: number[],
  cacheDir: string,
): Promise<CachedImageMeta> {
  return invoke<CachedImageMeta>('import_image_bytes_to_cache', { name, contents, cacheDir });
}

export function getCacheOverview(cacheDir: string): Promise<CacheOverview> {
  return invoke<CacheOverview>('get_cache_overview', { cacheDir });
}

export function clearCache(
  cacheDir: string,
  scope?: 'all' | 'thumbnails' | 'previews',
): Promise<CacheOverview> {
  return invoke<CacheOverview>('clear_cache', { cacheDir, scope });
}

export function cleanupCache(cacheDir: string, maxAgeDays: number): Promise<CacheCleanupResult> {
  return invoke<CacheCleanupResult>('cleanup_cache', { cacheDir, maxAgeDays });
}

export function pathExists(path: string): Promise<boolean> {
  return invoke<boolean>('path_exists', { path });
}

export function openDirectory(path: string): Promise<void> {
  return invoke('open_directory', { path });
}

export function getDeviceId(): Promise<string> {
  return invoke<string>('get_device_id');
}

export function listComarkTemplates(): Promise<ComarkTemplateRecord[]> {
  return invoke<ComarkTemplateRecord[]>('list_comark_templates');
}

export function upsertComarkTemplate(
  payload: UpsertComarkTemplatePayload,
): Promise<ComarkTemplateRecord> {
  return invoke<ComarkTemplateRecord>('upsert_comark_template', { payload });
}

export function removeComarkTemplate(id: string): Promise<void> {
  return invoke('remove_comark_template', { id });
}

export function setComarkTemplateEnabled(id: string, enabled: boolean): Promise<void> {
  return invoke('set_comark_template_enabled', { id, enabled });
}

export function extractJpegExif(path: string): Promise<number[]> {
  return invoke<number[]>('extract_jpeg_exif', { path });
}

export function insertJpegExif(jpegData: number[], exifSegment: number[]): Promise<number[]> {
  return invoke<number[]>('insert_jpeg_exif', { jpegData, exifSegment });
}
