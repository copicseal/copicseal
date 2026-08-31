import type { StorageAdapter, StorageServiceContract } from '@/platform/contracts/platform';
export class StorageService implements StorageServiceContract {
  constructor(private readonly adapter: StorageAdapter) {}

  getConfig = () => this.adapter.getConfig();
  updateConfig = (config: Parameters<StorageAdapter['updateConfig']>[0]) =>
    this.adapter.updateConfig(config);
  listSystemFonts = () => this.adapter.listSystemFonts();
}

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
