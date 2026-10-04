import type { StorageAdapter } from '@/platform/contracts/platform';
import { getConfig, inlineSystemFont, listSystemFonts, updateConfig } from './api';

export class TauriStorageAdapter implements StorageAdapter {
  readonly getConfig = getConfig;
  readonly updateConfig = updateConfig;
  readonly listSystemFonts = listSystemFonts;
  readonly inlineSystemFont = inlineSystemFont;
}
