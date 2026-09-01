import * as tauriApi from './tauri/api';
import { WebStorageAdapter } from './web/web-storage-adapter';

const webStorage = new WebStorageAdapter();
const defaultConfig = {
  language: 'zh-CN',
  theme: 'system',
  window_frame_mode: 'frameless' as const,
  save_directory: '',
  cache: { directory: '', auto_cleanup_on_startup: true, max_age_days: 30 },
  output: { presets: [], default_path: '', retain_exif: true },
  fonts: { favorites: [], default_font: '' },
  template_presets: [],
  template_list: { enabled: [], remote_registry: [] },
  user_devices: [],
  device_id: 'web-device',
};

const webRuntime = {
  ...tauriApi,
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
  }),
  listSystemFonts: async () => [],
  getConfig: async () => (await webStorage.get('app-config')) ?? defaultConfig,
  updateConfig: (config: Parameters<typeof tauriApi.updateConfig>[0]) =>
    webStorage.set('app-config', config),
  applyWindowFrameMode: async () => undefined,
  getAppInfo: async () => ({ name: 'Copicseal Web', version: '0.5.0' }),
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
  extractJpegExif: async () => [],
  insertJpegExif: async (jpegData: number[]) => jpegData,
  openImageDialog: async () => null,
} as typeof tauriApi;

/** The only host switch in the application. Services consume this runtime facade. */
export const platformRuntime: typeof tauriApi =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriApi : webRuntime;
