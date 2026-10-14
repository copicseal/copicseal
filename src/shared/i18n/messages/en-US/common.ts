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
  import: {
    failedOne: 'Could not import "{name}" — skipped',
    failedMany: '{count} photos could not be imported — skipped',
    failedMore: 'and {count} more',
    failedAborted: 'Import failed: {reason}',
    /** Shown when HEIC decoding is unavailable: jumps to Settings → Plugins */
    installPlugin: 'Install the plugin',
  },
  export: {
    done: 'Export complete',
    failed: 'Export failed. Check that the save folder set in Settings is available.',
  },
  photo: {
    close: 'Close',
    closeOthers: 'Close others',
    closeLeft: 'Close to the left',
    closeRight: 'Close to the right',
  },
  dialog: {
    /** File type filter name in the native “open images” dialog */
    imageFilter: 'Images',
    /** File type filter name in the native “select logo” dialog */
    logoFilter: 'Logo image',
    /** File type filter name in the native “select camera file” dialog (includes RAW) */
    cameraFileFilter: 'Camera file',
  },
  tools: {
    title: 'More features',
    manage: 'Manage',
    manageDone: 'Done',
    added: 'Added features',
    addedEmpty: 'No features added yet',
    available: 'Available features',
    availableEmpty: 'Everything is already added',
    loading: 'Loading…',
    back: 'Back',
    notFound: 'This feature is not available (it may have been removed)',
    loadFailed: 'Could not load “{name}”',
    saveFailed: 'Could not save the feature list',
    shutterCount: {
      name: 'Shutter count',
      description: 'Read the shutter actuations stored in a camera file',
      hint: 'Reads the shutter count from straight-out-of-camera files (JPEG / RAW / HEIC). Edited, re-compressed or phone-made files usually do not carry this field.',
      chooseFile: 'Choose a camera file',
      reselect: 'Choose another file',
      dropTitle: 'Drop a camera-original file here',
      dropHint: 'or pick one with the button below',
      supported: 'JPEG / HEIC / RAW and other camera originals',
      parsing: 'Parsing…',
      readFailed: 'Could not parse the file',
      notFoundTitle: 'This file has no shutter count field',
      notFoundHint:
        'Common reasons: the photo was edited or re-exported, it was taken with a phone, or the model does not record it (iPhones do not). Try an untouched original from the camera card.',
      count: 'Shutter actuations',
      source: 'From {tag}',
      camera: 'Camera',
      unknown: 'Unknown',
      provider: 'Parser',
      file: 'File',
      tooLarge: 'The file is larger than {limit}; parsing loads the whole file into memory',
      tag: {
        serialNumber: 'Body serial number',
        firmware: 'Firmware version',
        fileNumber: 'File number',
      },
    },
  },
  error: {
    /** Web build only (no workspace folder) */
    webNoWorkspace: {
      importFonts: 'The web build has no workspace folder, so font files cannot be imported.',
      deleteFonts: 'The web build has no workspace folder, so font files cannot be deleted.',
      importLogos: 'The web build has no workspace folder, so custom logos cannot be added.',
      deleteLogos: 'The web build has no workspace folder, so custom logos cannot be deleted.',
    },
    webNoPlugins: 'Plugins are not supported in the web build.',
  },
};
