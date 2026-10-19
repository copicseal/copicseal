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

/** 可被用户改写的 EXIF 字段：模板变量用到的那些字符串字段。 */
export type ExifOverrideFieldName =
  | 'make'
  | 'model'
  | 'lens_model'
  | 'focal_length'
  | 'aperture'
  | 'shutter_speed'
  | 'iso'
  | 'date_taken'
  // GPS：ExifData 里是 number，改动值仍按字符串存（用户输入），合并时再转数值
  | 'latitude'
  | 'longitude';

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

/** 插件目录里声明的「某平台对应哪个资产文件」，以及装完后必须存在的文件 */
export interface PluginAssetRef {
  /** 平台标识，如 `windows-x86_64` */
  platform: string;
  file: string;
  /** 安装完成后必须存在的文件（相对安装根目录） */
  required_files: string[];
  /**
   * 这份资产装完之后怎么运行。
   *
   * 组件形态并不统一：libheif 是直接的 exe，exiftool 在 macOS/Linux 上是需要系统 perl 的脚本。
   * 声明放在资产上，插件层才能保持通用（它不认识任何具体组件）。
   */
  run: { kind: 'executable'; file: string } | { kind: 'perl'; script: string; lib: string };
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
  /** 当前平台是否有可用资产 */
  supported: boolean;
  platform: string;
  asset: PluginAssetRef | null;
  installed: InstalledPlugin[];
  active_version: string | null;
  /** 插件根目录（供「打开目录」） */
  directory: string;
  /**
   * 系统 PATH 里已有的同名可执行文件（如包管理器装的 exiftool）。
   *
   * 有它会提示「系统已安装」，但用户仍然可以装一份本地的：
   * 装了就用装的那份，没装才回落到系统这份。
   */
  system_path: string | null;
  /** 系统里那个可执行文件的版本（`exiftool -ver`）；取不到为 null */
  system_version: string | null;
  /** 该组件在下载源里的子目录名：文件地址是 `<源>/<remote_dir>/<文件名>` */
  remote_dir: string;
  /** 该组件的资产是否需要系统 perl；null 表示这个组件与 perl 无关 */
  perl_available: boolean | null;
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

/**
 * 空 EXIF：所有字段为 null。
 *
 * 网页端（不再内置 ExifTool）与「还没读到 EXIF」的场景共用这一份，
 * 避免各处再抄一遍 20 多个 null。
 */
export const EMPTY_EXIF: ExifData = {
  make: null,
  model: null,
  lens_model: null,
  aperture: null,
  shutter_speed: null,
  iso: null,
  focal_length: null,
  exposure_compensation: null,
  date_taken: null,
  white_balance: null,
  metering_mode: null,
  latitude: null,
  longitude: null,
  image_width: null,
  image_height: null,
  orientation: null,
  exposure_program: null,
  flash: null,
  focal_length_35mm: null,
  max_aperture: null,
  software: null,
  artist: null,
  copyright: null,
  body_serial: null,
  lens_serial: null,
  gps_altitude: null,
};

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
  /**
   * 导出时把原图 EXIF 搬进结果文件。
   *
   * 开关长在「设置 → 边框水印 → EXIF」，但字段留在 `output` 里：它描述的是导出行为，
   * 而且从配置结构第一次落地起就在这个位置，挪动只会带来一次没有收益的迁移。
   */
  retain_exif: boolean;
}

/** 映射作用的 EXIF 字段：只覆盖会显示在照片上的字符串字段。 */
export type ExifMappingField = 'make' | 'model' | 'lens_model';

/**
 * 一条 EXIF 显示映射，如 `ILCE-` → `α`（于是 `ILCE-7M4` 显示成 `α7M4`）。
 *
 * 匹配与旧版一致：大小写不敏感、词边界优先的子串匹配，同一字段首个命中生效；
 * `replace` 为空串表示把命中的片段删掉。
 */
export interface ExifFieldMapping {
  field: ExifMappingField;
  /** 命中的原文片段 */
  match: string;
  /** 替换后的显示值；空串＝删除命中片段 */
  replace: string;
}

/** 经纬度显示口径：度数+半球字母（`31.230278°N`）或度数+中文（`北纬 31°13'49"`）。 */
export type ExifGpsFormat = 'letter' | 'chinese';

/**
 * EXIF 的显示口径；设置 → 边框水印 → EXIF 写的就是这里。
 *
 * 只影响**写进照片的文字**（模板文案变量、logo 旁的品牌/机型）与「EXIF 信息」卡片的展示；
 * 导出文件里的元数据是原图 EXIF 的搬运，不经过这里的映射与格式化。
 */
export interface ExifSettings {
  /**
   * 字段名与 Rust 侧 `config::ExifConfig` 一一对应（配置类结构体在本仓库统一用下划线，
   * 直接照着 Rust 结构体写）。名字对不上的话 serde 会把未知字段忽略、再用
   * `#[serde(default)]` 补成默认值，表现为「界面上改得动、离开页面又变回默认」。
   */
  /** 拍摄时间格式串，占位符见 `features/template/templates/exif-format.ts` */
  date_format: string;
  gps_format: ExifGpsFormat;
  /** `{FocalLength}` 是否改用等效 35mm 焦段 */
  focal_length_35mm: boolean;
  /** 显示映射；默认值即内置表，显式的空数组表示不做任何映射 */
  mappings: ExifFieldMapping[];
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

/** 设备档案的类别：相机或镜头（应用时各选一个，字段合并、镜头优先）。 */
export type DeviceCategory = 'camera' | 'lens';

/**
 * 设备档案里的一行：字段名 + 用户手填的值。
 *
 * 字段取自 `ExifOverrideFieldName`（模板变量能用到的那 10 个），值按原样文本存，
 * 显示/导出时再走「设置 → 边框水印 → EXIF」的格式化与映射口径。
 */
export interface DeviceFieldValue {
  field: ExifOverrideFieldName;
  value: string;
}

/** 用户自己的设备档案：给不记录 EXIF 的相机与手动镜头用。 */
export interface UserDeviceProfile {
  id: string;
  name: string;
  category: DeviceCategory;
  fields: DeviceFieldValue[];
  created_at: number;
  updated_at: number;
}

export interface DeviceConfig {
  items: UserDeviceProfile[];
}

/**
 * 一条自定义品牌 Logo。
 *
 * 内置品牌表（`src/assets/logos/`）收不全所有厂商，或者用户想换成自己的标志。
 * 匹配只看 EXIF 的 `make` / `model`：任一关键字出现即命中，数组顺序即优先级，
 * 自定义命中后**覆盖内置**。
 */
export interface CustomLogo {
  id: string;
  name: string;
  /** 匹配关键字（大小写不敏感） */
  keywords: string[];
  /** 兜底：没有匹配到任何品牌时使用 */
  catch_all: boolean;
  /** 工作区 `Logos/` 下的文件名 */
  file_name: string;
  size: number;
  added_at: number;
}

export interface LogoConfig {
  items: CustomLogo[];
}

/**
 * 「更多功能」面板里已启用的小功能。
 *
 * 只记 id：功能本身是前端静态注册表（`src/features/tools/registry.ts`），
 * 注册表里删掉的 id 会被前端忽略。
 */
export interface ToolConfig {
  /** 已添加（启用）的小功能 id，顺序即展示顺序 */
  enabled: string[];
}

/** 批量改文件名的设置：只存用户自己保存的命名规则（内置规则在前端代码里）。 */
export interface RenameConfig {
  presets: RenamePreset[];
}

/** 一条用户保存的命名规则。 */
export interface RenamePreset {
  id: string;
  name: string;
  /** 命名模板，支持 `{n}` / `{name}` / `{date}` / `{time}` */
  pattern: string;
  start: number;
  padding: number;
  /** 保存时的排序依据 */
  sort_by: RenameSortBy;
  descending: boolean;
}

/** 批量改文件名的排序依据。 */
export type RenameSortBy = 'modified' | 'created' | 'name' | 'taken';

/** 目录里的一个候选文件（与 Rust `rename::DirectoryEntry` 对应）。 */
export interface DirectoryEntry {
  name: string;
  path: string;
  /** 小写、不带点的扩展名；没有扩展名时为空串 */
  ext: string;
  /** 不含扩展名的文件名（规则里的 `{name}`） */
  stem: string;
  size: number;
  modified_ms: number | null;
  created_ms: number | null;
  /** EXIF 拍摄时间的规范化形式 `YYYYMMDDHHMMSS`；没读到为 null */
  taken_at: string | null;
}

/** 一对改名。 */
export interface RenamePair {
  from: string;
  to: string;
}

/** 被跳过的文件与原因。 */
export interface RenameIssue {
  name: string;
  reason: string;
}

/** 执行/撤销结果。 */
export interface RenameOutcome {
  renamed: RenamePair[];
  failed: RenameIssue[];
  /** 非空表示校验不通过，**一个都没改** */
  conflicts: string[];
}

/** 导入一条自定义 Logo 后的落盘结果（配置条目由前端补全 id / 关键字等）。 */
export interface ImportedLogo {
  file_name: string;
  size: number;
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
  /** EXIF 的显示口径（导出开关在 `output.retain_exif`） */
  exif: ExifSettings;
  /** 插件下载源（默认官方源，可加镜像） */
  plugins: PluginConfig;
  /** 用户自己的设备档案（相机 / 镜头） */
  devices: DeviceConfig;
  /** 自定义品牌 Logo（内置之外的厂商标志，可覆盖同名内置品牌） */
  logos: LogoConfig;
  /** 「更多功能」面板已启用的小功能 */
  tools: ToolConfig;
  /** 批量改文件名保存的命名规则 */
  rename: RenameConfig;
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
