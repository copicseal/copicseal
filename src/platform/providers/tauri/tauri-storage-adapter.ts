import { getConfig, listSystemFonts, updateConfig } from './api';

export class TauriStorageAdapter {
  readonly getConfig = getConfig;
  readonly updateConfig = updateConfig;
  readonly listSystemFonts = listSystemFonts;
}
