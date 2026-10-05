import type { StorageAdapter, StorageServiceContract } from '@/platform/contracts/platform';
export class StorageService implements StorageServiceContract {
  constructor(private readonly adapter: StorageAdapter) {}

  getConfig = () => this.adapter.getConfig();
  updateConfig = (config: Parameters<StorageAdapter['updateConfig']>[0]) =>
    this.adapter.updateConfig(config);
  listSystemFonts = () => this.adapter.listSystemFonts();
  inlineSystemFont = (family: string, text: string) => this.adapter.inlineSystemFont(family, text);
  importFontFile = (workspace: string, sourcePath: string) =>
    this.adapter.importFontFile(workspace, sourcePath);
  importFontBytes = (workspace: string, fileName: string | null, contents: number[]) =>
    this.adapter.importFontBytes(workspace, fileName, contents);
  removeFontFile = (workspace: string, fileName: string) =>
    this.adapter.removeFontFile(workspace, fileName);
  inlineImportedFont = (workspace: string, fileName: string, text: string) =>
    this.adapter.inlineImportedFont(workspace, fileName, text);
}

export type {
  AppConfig,
  CacheConfig,
  ComarkTemplateRecord,
  FontInfo,
  ImportedFont,
  InlineFont,
  TemplateListConfig,
  TemplatePreset,
  UpsertComarkTemplatePayload,
  UserDevice,
} from '@/platform/contracts';
