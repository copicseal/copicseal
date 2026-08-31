/** Stable, platform-neutral data contracts shared by all providers. */

export type PlatformErrorCode =
  | 'PLATFORM_NOT_IMPLEMENTED'
  | 'PLATFORM_UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'INVALID_ARGUMENT'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_ENCODE_FAILED'
  | 'IO_FAILED'
  | 'STORAGE_FAILED';

export interface PlatformErrorOptions {
  code: PlatformErrorCode;
  provider: string;
  cause?: unknown;
}

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly provider: string;
  readonly cause?: unknown;

  constructor(message: string, options: PlatformErrorOptions) {
    super(message);
    this.name = 'PlatformError';
    this.code = options.code;
    this.provider = options.provider;
    this.cause = options.cause;
  }
}

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

export interface CacheConfig {
  directory: string;
  auto_cleanup_on_startup: boolean;
  max_age_days: number;
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

export interface OutputConfig {
  presets: OutputPreset[];
  default_path: string;
  retain_exif: boolean;
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

export interface EnabledTemplate {
  template_id: string;
  name: string;
}

export interface TemplateRegistry {
  id: string;
  name: string;
  url: string;
}

export interface TemplateListConfig {
  enabled: EnabledTemplate[];
  remote_registry: TemplateRegistry[];
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

export type WindowFrameMode = 'native' | 'frameless';

export interface PlatformCapabilities {
  image: { resize: boolean; composite: boolean; heicDecode: boolean };
  files: { pickImages: boolean; saveToDirectory: boolean; download: boolean };
  system: { tray: boolean; openPath: boolean; autoUpdate: boolean };
}

export interface ImageResult {
  data: Blob | Uint8Array;
  mimeType: string;
  meta: { provider: string; durationMs: number; fallbackFrom?: string[] };
}

export interface WebFileSelection {
  files: File[];
  cancelled: boolean;
}

export interface WebFileProvider {
  pickImages(): Promise<WebFileSelection>;
  save(data: Blob | Uint8Array, fileName: string): Promise<void>;
  toUrl(file: Blob | File): string;
}

export interface PlatformProvider {
  readonly id: string;
  readonly capabilities: PlatformCapabilities;
}
