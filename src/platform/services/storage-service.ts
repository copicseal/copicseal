import type { StorageServiceContract } from '@/platform/contracts/platform';
import {
  getConfig as tauriGetConfig,
  listSystemFonts as tauriListSystemFonts,
  updateConfig as tauriUpdateConfig,
} from '@/platform/providers/tauri/api';

export class StorageService implements StorageServiceContract {
  getConfig = tauriGetConfig;
  updateConfig = tauriUpdateConfig;
  listSystemFonts = tauriListSystemFonts;
}

export const storageService = new StorageService();

export type {
  AppConfig,
  CacheConfig,
  ComarkTemplateRecord,
  FontInfo,
  TemplateListConfig,
  TemplatePreset,
  UpsertComarkTemplatePayload,
  UserDevice,
} from '@/platform/contracts';
