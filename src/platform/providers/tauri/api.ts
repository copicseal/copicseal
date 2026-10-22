import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/plugin-dialog';
import { check, type Update } from '@tauri-apps/plugin-updater';
import type {
  AppConfig,
  AppUpdateInfo,
  AppUpdateInstallOptions,
  AppUpdateProgress,
  AppVersion,
  CacheCleanupResult,
  CachedImageMeta,
  CacheOverview,
  ComarkTemplateRecord,
  CompressItem,
  CompressOptions,
  CompressOutcome,
  CompressProgress,
  CopyRenameProgress,
  DirectoryEntry,
  ExifData,
  FontInfo,
  ImageFileMeta,
  ImageProbe,
  ImageScanResult,
  ImportedFont,
  ImportedLogo,
  InlineFont,
  PluginInstallOutcome,
  PluginInstallProgress,
  PluginManifestResult,
  PluginState,
  RenameOutcome,
  RenamePair,
  RenameSortBy,
  UpsertComarkTemplatePayload,
  WindowFrameMode,
} from '@/platform/contracts';
import { translate } from '@/shared/i18n';

export type {
  AppConfig,
  AppUpdateInfo,
  AppUpdateInstallOptions,
  AppUpdateProgress,
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
  InlineFont,
  OutputConfig,
  OutputPreset,
  TemplateListConfig,
  TemplatePreset,
  TemplateRegistry,
  UpsertComarkTemplatePayload,
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
/**
 * 把字体家族按用到的字符子集化，返回可内联的 data URL。
 *
 * 中文字体动辄几十兆，整体内联既慢又会被 WebKit 丢弃，所以只保留画布上出现的字形。
 */
export function inlineSystemFont(family: string, text: string): Promise<InlineFont | null> {
  return invoke('inline_system_font', { family, text });
}
/** 把已有字体文件收进工作区字体目录。 */
export function importFontFile(workspace: string, sourcePath: string): Promise<ImportedFont> {
  return invoke('import_font_file', { workspace, sourcePath });
}
/** 把下载好的字体字节收进工作区字体目录。 */
export function importFontBytes(
  workspace: string,
  fileName: string | null,
  contents: number[],
): Promise<ImportedFont> {
  return invoke('import_font_bytes', { workspace, fileName, contents });
}
export function removeFontFile(workspace: string, fileName: string): Promise<void> {
  return invoke('remove_font_file', { workspace, fileName });
}
export function inlineImportedFont(
  workspace: string,
  fileName: string,
  text: string,
): Promise<InlineFont | null> {
  return invoke('inline_imported_font', { workspace, fileName, text });
}
/** 选择字体文件（自定义导入用）。 */
export function openFontDialog(): Promise<string | string[] | null> {
  return open({
    multiple: false,
    filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'ttc', 'woff', 'woff2'] }],
  });
}
/** 把用户选中的 Logo 文件收进工作区 `Logos/`（自定义品牌 Logo 用）。 */
export function importLogoFile(workspace: string, sourcePath: string): Promise<ImportedLogo> {
  return invoke('import_logo_file', { workspace, sourcePath });
}
export function removeLogoFile(workspace: string, fileName: string): Promise<void> {
  return invoke('remove_logo_file', { workspace, fileName });
}
/** 读取 SVG Logo 的文本（内联渲染用，这样 currentColor 能跟随文字颜色）。 */
export function readLogoSvg(workspace: string, fileName: string): Promise<string> {
  return invoke('read_logo_svg', { workspace, fileName });
}
/** 选择 Logo 文件：支持 SVG 与常见位图。 */
export function openLogoDialog(): Promise<string | string[] | null> {
  return open({
    multiple: false,
    filters: [
      {
        name: translate('common.dialog.logoFilter'),
        extensions: ['svg', 'png', 'jpg', 'jpeg', 'webp'],
      },
    ],
  });
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
/** 用系统默认浏览器打开 http(s) 链接。 */
export function openExternal(url: string): Promise<void> {
  return invoke('open_external', { url });
}
/**
 * 打开当前窗口的开发者工具。
 *
 * 打包版默认没有 DevTools 入口（release 构建下 wry 会关掉它），这个入口留给排查问题用；
 * 需要在 `src-tauri/Cargo.toml` 里为 tauri 打开 `devtools` feature 才会生效。
 */
export function openDevTools(): Promise<void> {
  return invoke('open_devtools');
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
  keepPaths?: readonly string[],
): Promise<CacheOverview> {
  return invoke('clear_cache', { cacheDir, scope, keepPaths });
}
export function cleanupCache(
  cacheDir: string,
  maxAgeDays: number,
  keepPaths?: readonly string[],
): Promise<CacheCleanupResult> {
  return invoke('cleanup_cache', { cacheDir, maxAgeDays, keepPaths });
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
/** 把 EXIF 段插进 JPEG；`alignDimensions` 会先把段里的宽高/朝向对齐到这张导出的画面。 */
export function insertJpegExif(
  jpegData: number[],
  exifSegment: number[],
  alignDimensions = false,
): Promise<number[]> {
  return invoke('insert_jpeg_exif', { jpegData, exifSegment, alignDimensions });
}

/** 复制进度事件名，与 Rust 侧 `rename.rs` 保持一致 */
const COPY_PROGRESS_EVENT = 'rename://copy-progress';

/** 压缩进度事件名，与 Rust 侧 `compress.rs` 保持一致 */
const COMPRESS_PROGRESS_EVENT = 'compress://progress';

/** 插件安装进度事件名，与 Rust 侧 `plugin.rs` 保持一致 */
const PLUGIN_PROGRESS_EVENT = 'plugin://install-progress';

export function listPlugins(): Promise<PluginState[]> {
  return invoke('list_plugins');
}
/** 按配置里的源顺序尝试，返回清单与实际生效的源 */
export function fetchPluginManifest(id: string, sources: string[]): Promise<PluginManifestResult> {
  return invoke('fetch_plugin_manifest', { id, sources });
}
export function installPlugin(id: string, sources: string[]): Promise<PluginInstallOutcome> {
  return invoke('install_plugin', { id, sources });
}
export function removePlugin(id: string): Promise<void> {
  return invoke('remove_plugin', { id });
}
/**
 * 用 ExifTool 读一个照片文件的元数据（只读）。
 *
 * 优先用系统里已有的 exiftool，其次插件目录里装的那份；返回原始 stdout（JSON 由调用方解析）。
 */
export function readExiftoolMetadata(path: string, args: string[]): Promise<string> {
  return invoke('read_exiftool_metadata', { path, args });
}
/**
 * 把拖入的字节落成一个临时文件，返回路径。
 *
 * HTML5 拖放只有字节、没有磁盘路径，而原生 ExifTool 必须在真实文件上跑。
 */
export function stageDroppedFile(
  cacheDir: string,
  fileName: string,
  contents: Uint8Array,
): Promise<string> {
  return invoke('stage_dropped_file', { cacheDir, fileName, contents });
}
/** 读目录并按依据排好序（`taken` 会在 Rust 侧顺带读 EXIF 拍摄时间）。 */
export function readDirectoryEntries(
  path: string,
  sortBy: RenameSortBy,
  descending: boolean,
  extensions: string[],
): Promise<DirectoryEntry[]> {
  return invoke('read_directory_entries', { path, sortBy, descending, extensions });
}
/** 执行批量改名（Rust 侧先全量校验冲突，有冲突则一个都不改）。 */
export function applyBatchRename(dir: string, pairs: RenamePair[]): Promise<RenameOutcome> {
  return invoke('apply_batch_rename', { dir, pairs });
}
/** 撤销一批改名（把 from / to 反过来执行）。 */
export function undoBatchRename(dir: string, pairs: RenamePair[]): Promise<RenameOutcome> {
  return invoke('undo_batch_rename', { dir, pairs });
}
/** 复制模式：原文件不动，按新名字把副本放进 targetDir（冲突则一个都不写）。 */
export function copyBatchRename(
  dir: string,
  targetDir: string,
  pairs: RenamePair[],
): Promise<RenameOutcome> {
  return invoke('copy_batch_rename', { dir, targetDir, pairs });
}
/** 撤销复制模式：删掉这批副本（原文件本来就没动）。 */
export function undoCopyBatch(targetDir: string, pairs: RenamePair[]): Promise<RenameOutcome> {
  return invoke('undo_copy_batch', { targetDir, pairs });
}
/** 订阅复制进度；返回取消订阅函数 */
export function onCopyRenameProgress(handler: (progress: CopyRenameProgress) => void) {
  if (!isNativeWindowAvailable()) return Promise.resolve(() => undefined);
  return listen<CopyRenameProgress>(COPY_PROGRESS_EVENT, (event) => handler(event.payload));
}
/** 递归列出目录里的图片（JPEG / PNG / WebP）；不支持的项连同原因一起返回。 */
export function listImages(dir: string, recursive: boolean): Promise<ImageScanResult> {
  return invoke('list_images', { dir, recursive });
}
/** 只读文件头探测尺寸 / 格式 / 是否动图；不能压的项带 `error`。 */
export function probeImages(paths: string[]): Promise<ImageProbe[]> {
  return invoke('probe_images', { paths });
}
/** 生成预览图（真实解码 + 缩放），返回缓存文件路径，可直接交给 asset 协议显示。 */
export function createImagePreview(
  path: string,
  cacheDir: string,
  maxEdge: number,
): Promise<string> {
  return invoke('create_image_preview', { path, cacheDir, maxEdge });
}
/** 批量压缩：真实解码 / 编码 / 写盘，进度通过 `onCompressProgress` 推送。 */
export function compressImages(
  items: CompressItem[],
  options: CompressOptions,
  outputDir: string,
): Promise<CompressOutcome> {
  return invoke('compress_images', { items, options, outputDir });
}
/** 请求取消当前压缩批次（正在处理的那张会做完，排队中的标记为取消）。 */
export function cancelCompress(): Promise<void> {
  return invoke('cancel_compress');
}
/** 订阅压缩进度；返回取消订阅函数 */
export function onCompressProgress(handler: (progress: CompressProgress) => void) {
  if (!isNativeWindowAvailable()) return Promise.resolve(() => undefined);
  return listen<CompressProgress>(COMPRESS_PROGRESS_EVENT, (event) => handler(event.payload));
}
/** 订阅插件安装进度；返回取消订阅函数 */
export function onPluginInstallProgress(handler: (progress: PluginInstallProgress) => void) {
  if (!isNativeWindowAvailable()) return Promise.resolve(() => undefined);
  return listen<PluginInstallProgress>(PLUGIN_PROGRESS_EVENT, (event) => handler(event.payload));
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
/** 上一次 check() 得到的更新句柄：检查与安装分两步进行，这里保存待安装的更新。 */
let pendingUpdate: Update | null = null;

/** 检查更新；没有新版本时返回 null。检查结果会保留给 installUpdate 使用。 */
export async function checkForUpdate(): Promise<AppUpdateInfo | null> {
  await pendingUpdate?.close().catch(() => undefined);
  pendingUpdate = null;

  const update = await check();
  if (!update) return null;

  pendingUpdate = update;

  return {
    version: update.version,
    current_version: update.currentVersion,
    notes: update.body ?? null,
    date: update.date ?? null,
  };
}

/**
 * 下载并安装待安装的更新。
 *
 * Windows 上安装阶段会由安装器结束并重新拉起应用，因此不会走到 resolve；
 * macOS 上安装完成后需要用户手动重启。
 */
export async function installUpdate(options?: AppUpdateInstallOptions): Promise<void> {
  const update = pendingUpdate ?? (await check());
  if (!update) return;

  pendingUpdate = null;

  let downloaded = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      total = event.data.contentLength ?? null;
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;
    } else {
      return;
    }

    const progress: AppUpdateProgress = {
      downloaded,
      total,
      percent: total ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
    };
    options?.onProgress?.(progress);
  });
}
export function toNativeFileUrl(path: string) {
  return isNativeWindowAvailable() ? convertFileSrc(path) : path;
}
export function openImageDialog() {
  return open({
    multiple: true,
    filters: [
      {
        // 原生对话框由系统绘制，筛选名要按当前界面语言取
        name: translate('common.dialog.imageFilter'),
        extensions: ['jpg', 'jpeg', 'png', 'heic', 'heif', 'hif', 'webp'],
      },
    ],
  });
}
/**
 * 选择一个相机文件（供「快门数查询」等工具用）。
 *
 * 比「打开图片」宽：包含各家 RAW —— 查快门数最常见的场景就是直接读相机存储卡里的原图。
 */
export function openCameraFileDialog() {
  return open({
    multiple: false,
    filters: [
      {
        name: translate('common.dialog.cameraFileFilter'),
        extensions: [
          'jpg',
          'jpeg',
          'png',
          'heic',
          'heif',
          'hif',
          'webp',
          'tif',
          'tiff',
          'cr3',
          'nef',
          'arw',
          'raf',
          'dng',
          'rw2',
          'orf',
          'pef',
        ],
      },
    ],
  });
}
export function saveImageDialog(defaultPath: string, extension: string) {
  return save({
    defaultPath,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });
}
