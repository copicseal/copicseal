/**
 * common 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 这些控件被多个业务模块共用，措辞保持通用。
 */
import type { Messages } from '../../translate';

export const common: Messages['common'] = {
  brand: {
    name: 'Copicseal',
  },
  action: {
    open: 'Open',
    select: 'Choose',
    change: 'Change',
  },
  nav: {
    template: 'Border watermark',
    collage: 'Collage',
    settings: 'Settings',
  },
  window: {
    minimize: 'Minimize window',
    maximize: 'Maximize window',
    restore: 'Restore window',
    close: 'Close window',
  },
  font: {
    selectPlaceholder: 'Select a font',
    followTemplate: 'Use template default',
    refresh: 'Refresh system fonts',
  },
  dropZone: {
    releaseToImport: 'Release to import photos',
  },
  export: {
    done: 'Export complete',
    failed: 'Export failed. Check that the save folder set in Settings is available.',
  },
  dialog: {
    /** File type filter name in the native “open images” dialog */
    imageFilter: 'Images',
  },
  error: {
    /** Web build only (no workspace folder) */
    webNoWorkspace: {
      importFonts: 'The web build has no workspace folder, so font files cannot be imported.',
      deleteFonts: 'The web build has no workspace folder, so font files cannot be deleted.',
    },
  },
};
