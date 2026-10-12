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
  orientation: number | null;
  exposure_program: number | null;
  flash: number | null;
  focal_length_35mm: number | null;
  max_aperture: string | null;
  software: string | null;
  artist: string | null;
  copyright: string | null;
  body_serial: string | null;
  lens_serial: string | null;
  gps_altitude: number | null;
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

/** 插件目录里声明的「某平台对应哪个资产文件」 */
export interface PluginAssetRef {
  /** 平台标识，如 `windows-x86_64` */
  platform: string;
  file: string;
}

/** 远端清单里的资产：下载地址由清单地址推导，这里带上大小与摘要用于校验 */
export interface PluginManifestAsset {
  name: string;
  size: number;
  sha256: string;
}

/** 远端清单：`<插件目录>/manifest.json` */
export interface PluginManifest {
  id: string;
  version: string;
  notes?: string | null;
  assets: PluginManifestAsset[];
}

export interface InstalledPlugin {
  version: string;
  path: string;
  /** 占用空间（字节） */
  size: number;
  /** 安装时间（秒级时间戳字符串），用于排序 */
  installed_at: string | null;
}

/** 拉到的远端清单 + 实际生效的源（多源按顺序尝试，界面要显示是哪个源给的） */
export interface PluginManifestResult {
  manifest: PluginManifest;
  source: string;
}

/** 安装结果：新状态 + 资产来自哪个源 */
export interface PluginInstallOutcome {
  state: PluginState;
  source: string;
}

/** 某个插件在当前机器上的状态：目录信息 + 磁盘上实际安装的版本 */
export interface PluginState {
  id: string;
  name: string;
  description: string;
  homepage: string;
  /** 当前平台是否有可用资产；macOS 为 false（系统已内置 HEIC 支持） */
  supported: boolean;
  platform: string;
  asset: PluginAssetRef | null;
  installed: InstalledPlugin[];
  active_version: string | null;
  /** 插件根目录（供「打开目录」） */
  directory: string;
}

export interface PluginInstallProgress {
  id: string;
  downloaded: number;
  /** 服务端未给长度时为 null */
  total: number | null;
  percent: number | null;
}

/**
 * 插件下载源。
 *
 * 源 = 一个基础路径，插件在其中按 `<源>/<插件 id>/manifest.json` 组织，镜像只要复刻同样的
 * 目录结构即可；按列表顺序尝试，第一个能拿到清单的胜出，资产也从同一个源下载。
 */
export interface PluginConfig {
  sources: string[];
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

/**
 * 拼图默认值：设置 → 拼图 →「默认项 / 导出」两页写的就是这里。
 *
 * 只在「新建 / 恢复默认」时被读，已经摆在画布上的拼图不受影响。
 */
export interface CollageConfig {
  layout_mode: CollageLayoutModeName;
  /** 默认网格布局 id；空字符串表示用布局库的第一个 */
  layout_id: string;
  aspect_preset: string;
  custom_ratio_width: number;
  custom_ratio_height: number;
  background_color: string;
  gap: number;
  padding: number;
  border_radius: number;
  shadow: number;
  long_direction: 'vertical' | 'horizontal';
  long_align: 'start' | 'center' | 'end';
  long_size: number;
  export_format: 'png' | 'jpeg';
  export_quality: 'standard' | 'high' | 'ultra';
  export_scale: number;
  export_width: number;
  export_height: number;
  export_lock_ratio: boolean;
}

export type CollageLayoutModeName = 'grid' | 'long' | 'free';

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
  /** 拼图模块的默认值 */
  collage: CollageConfig;
  /** 插件下载源（默认官方源，可加镜像） */
  plugins: PluginConfig;
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
