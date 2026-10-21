import { translate } from '@/shared/i18n';
import { DEFAULT_EXIF_MAPPINGS, EXIF_DATE_DEFAULT } from '@/shared/lib/exif-defaults';
import * as tauriApi from './tauri/api';
import { webExifAdapter } from './web/web-exif-adapter';
import { WebStorageAdapter } from './web/web-storage-adapter';

const webStorage = new WebStorageAdapter();
const defaultConfig = {
  language: 'zh-CN',
  theme: 'system',
  accent: 'blue',
  window_frame_mode: 'frameless' as const,
  save_directory: '',
  cache: { directory: '', auto_cleanup_on_startup: true, max_age_days: 30 },
  output: { presets: [], default_path: '', retain_exif: true },
  fonts: { favorites: [], default_font: '' },
  template_presets: [],
  template_list: { enabled: [], remote_registry: [] },
  // 与 Rust 侧 ExifConfig::default() / default_exif_mappings() 对齐
  exif: {
    date_format: EXIF_DATE_DEFAULT,
    gps_format: 'letter' as const,
    focal_length_35mm: false,
    mappings: [...DEFAULT_EXIF_MAPPINGS],
  },
  plugins: { sources: [] },
  devices: { items: [] },
  logos: { items: [] },
  tools: { enabled: [] },
  rename: { presets: [] },
  device_id: 'web-device',
};

const webRuntime = {
  ...tauriApi,
  // 网页端没有本地文件系统权限，批量改文件名整条链路都不可用
  readDirectoryEntries: async () => {
    throw new Error(translate('common.error.webNoLocalFiles'));
  },
  applyBatchRename: async () => {
    throw new Error(translate('common.error.webNoLocalFiles'));
  },
  undoBatchRename: async () => {
    throw new Error(translate('common.error.webNoLocalFiles'));
  },
  copyBatchRename: async () => {
    throw new Error(translate('common.error.webNoLocalFiles'));
  },
  undoCopyBatch: async () => {
    throw new Error(translate('common.error.webNoLocalFiles'));
  },
  onCopyRenameProgress: async () => () => undefined,
  readExif: async () => ({
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
  }),
  listSystemFonts: async () => [],
  inlineSystemFont: async () => null,
  importFontFile: async () => {
    throw new Error(translate('common.error.webNoWorkspace.importFonts'));
  },
  importFontBytes: async () => {
    throw new Error(translate('common.error.webNoWorkspace.importFonts'));
  },
  removeFontFile: async () => {
    throw new Error(translate('common.error.webNoWorkspace.deleteFonts'));
  },
  inlineImportedFont: async () => null,
  // 自定义 Logo 是工作区文件：网页端没有工作区目录，直接拒绝并给同一套提示
  importLogoFile: async () => {
    throw new Error(translate('common.error.webNoWorkspace.importLogos'));
  },
  removeLogoFile: async () => {
    throw new Error(translate('common.error.webNoWorkspace.deleteLogos'));
  },
  readLogoSvg: async () => '',
  openLogoDialog: async () => null,
  getConfig: async () => (await webStorage.get('app-config')) ?? defaultConfig,
  updateConfig: (config: Parameters<typeof tauriApi.updateConfig>[0]) =>
    webStorage.set('app-config', config),
  applyWindowFrameMode: async () => undefined,
  getAppInfo: async () => ({ name: 'Copicseal Web', version: '0.5.0' }),
  openExternal: async (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  // 网页端的开发者工具就是浏览器自己的，应用这边不做任何事
  openDevTools: async () => undefined,
  getCacheOverview: async () => ({
    directory: '',
    image_count: 0,
    preview_count: 0,
    thumbnail_count: 0,
    image_bytes: 0,
    preview_bytes: 0,
    thumbnail_bytes: 0,
    total_bytes: 0,
  }),
  clearCache: async () => ({
    directory: '',
    image_count: 0,
    preview_count: 0,
    thumbnail_count: 0,
    image_bytes: 0,
    preview_bytes: 0,
    thumbnail_bytes: 0,
    total_bytes: 0,
  }),
  cleanupCache: async () => ({ removed_files: 0, removed_bytes: 0 }),
  pathExists: async () => false,
  openDirectory: async () => undefined,
  getDeviceId: async () => 'web-device',
  listComarkTemplates: async () => [],
  removeComarkTemplate: async () => undefined,
  setComarkTemplateEnabled: async () => undefined,
  onNativeFileDrop: async () => () => undefined,
  getWindowMaximized: async () => false,
  onWindowResize: async () => () => undefined,
  minimizeWindow: async () => undefined,
  toggleMaximizeWindow: async () => undefined,
  closeWindow: async () => undefined,
  openDirectoryDialog: async () => null,
  saveImageDialog: async () => null,
  toNativeFileUrl: (path) => path,
  checkForUpdate: async () => null,
  installUpdate: async () => undefined,
  extractJpegExif: async () => [],
  insertJpegExif: async (jpegData: number[]) => jpegData,
  openImageDialog: async () => null,
  // 原生「选择相机文件」对话框：网页端没有，返回 null 让调用方回落到网页文件选择
  openCameraFileDialog: async () => null,
  // 插件是桌面端能力：网页端没有本地可执行组件，列表为空、操作直接拒绝
  listPlugins: async () => [],
  fetchPluginManifest: async () => {
    throw new Error(translate('common.error.webNoPlugins'));
  },
  installPlugin: async () => {
    throw new Error(translate('common.error.webNoPlugins'));
  },
  removePlugin: async () => {
    throw new Error(translate('common.error.webNoPlugins'));
  },
  readExiftoolMetadata: async () => {
    throw new Error(translate('common.error.webNoPlugins'));
  },
  // 网页端没有本地可执行组件，落盘也没有意义
  stageDroppedFile: async () => {
    throw new Error(translate('common.error.webNoPlugins'));
  },
  onPluginInstallProgress: async () => () => undefined,
} as typeof tauriApi;

/** The only host switch in the application. Services consume this runtime facade. */
export const platformRuntime: typeof tauriApi =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriApi : webRuntime;

export async function readExifSource(source: string | File) {
  if (source instanceof File && platformRuntime === webRuntime) {
    return webExifAdapter.read(source);
  }
  return platformRuntime.readExif(source as string);
}

export async function writeExifSource(source: File, output: Uint8Array, outputName: string) {
  if (platformRuntime !== webRuntime) return output;
  return webExifAdapter.copyMetadata(source, output, outputName);
}
