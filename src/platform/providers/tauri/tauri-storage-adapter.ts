import type { StorageAdapter } from '@/platform/contracts/platform';
import {
  getConfig,
  importFontBytes,
  importFontFile,
  inlineImportedFont,
  inlineSystemFont,
  listSystemFonts,
  removeFontFile,
  updateConfig,
} from './api';

export class TauriStorageAdapter implements StorageAdapter {
  readonly getConfig = getConfig;
  readonly updateConfig = updateConfig;
  readonly listSystemFonts = listSystemFonts;
  readonly inlineSystemFont = inlineSystemFont;
  readonly importFontFile = importFontFile;
  readonly importFontBytes = importFontBytes;
  readonly removeFontFile = removeFontFile;
  readonly inlineImportedFont = inlineImportedFont;
}
