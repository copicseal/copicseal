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

export interface FontNote {
  family: string;
  /** 用户给字体起的备注，如「手写」「正文」 */
  note: string;
}

export interface ImportedFont {
  id: string;
  /** 工作区 `Fonts/` 下的文件名 */
  file_name: string;
  /** CSS 族名；默认取字体自身的族名 */
  family: string;
  /** `online`：在线下载；`file`：用户自定义导入 */
  source: string;
  /** 来源（下载地址或原始路径），仅作展示 */
  origin: string;
  size: number;
  added_at: number;
}

export interface InlineFont {
  family: string;
  /** `data:font/ttf;base64,...`，已按用到的字符做过子集化，可直接写进 `@font-face` */
  data_url: string;
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

export interface OutputSize {
  id?: string;
  /** 下拉里显示的名字，如「4K」「小红书」 */
  label: string;
  width: number;
  height: number;
}

export interface OutputConfig {
  presets: OutputPreset[];
  /** 导出面板「常用尺寸」下拉的快捷尺寸，可在设置里增删 */
  sizes: OutputSize[];
  default_path: string;
  retain_exif: boolean;
}

export interface FontConfig {
  /** 引入的本机字体族名（只记引用，不复制系统字体文件） */
  favorites: string[];
  default_font: string;
  /** 导入到工作区 `Fonts/` 的字体文件 */
  imported: ImportedFont[];
  /** 字体备注：按族名记，本机引用与导入字体共用 */
  notes: FontNote[];
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

export interface AppUpdateInfo {
  /** 新版本号 */
  version: string;
  /** 当前运行版本号 */
  current_version: string;
  /** 更新说明，可能为空 */
  notes: string | null;
  /** 发布时间，可能为空 */
  date: string | null;
}

export interface AppUpdateProgress {
  downloaded: number;
  /** 服务端未提供总长度时为 null */
  total: number | null;
  /** 无法计算进度时为 null */
  percent: number | null;
}

export interface AppUpdateInstallOptions {
  onProgress?: (progress: AppUpdateProgress) => void;
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

export interface WebFileSelection {
  files: File[];
  cancelled: boolean;
}

export type WindowFrameMode = 'native' | 'frameless';

export interface WebFileProvider {
  pickImages(): Promise<WebFileSelection>;
  save(data: Blob | Uint8Array, fileName: string): Promise<void>;
  toUrl(file: Blob | File): string;
}

export * from './platform';
export * from './services';
