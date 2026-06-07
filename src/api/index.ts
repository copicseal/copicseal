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

export interface AppConfig {
  language: string;
  theme: string;
  save_directory: string;
  font_favorites: string[];
}

export interface AppVersion {
  version: string;
  name: string;
}

export function readExif(path: string): Promise<ExifData> {
  return invoke<ExifData>('read_exif', { path });
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

export function getAppInfo(): Promise<AppVersion> {
  return invoke<AppVersion>('get_app_info');
}

export function getDeviceId(): Promise<string> {
  return invoke<string>('get_device_id');
}

export function extractJpegExif(path: string): Promise<number[]> {
  return invoke<number[]>('extract_jpeg_exif', { path });
}

export function insertJpegExif(jpegData: number[], exifSegment: number[]): Promise<number[]> {
  return invoke<number[]>('insert_jpeg_exif', { jpegData, exifSegment });
}
