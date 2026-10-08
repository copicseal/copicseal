/**
 * settings 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 */
import type { Messages } from '../../translate';

export const settings: Messages['settings'] = {
  header: {
    title: 'Settings',
    description:
      'Manage app behaviour, cache folders, thumbnail generation, and the automatic cleanup policy.',
    loadingDescription: 'Reading configuration and cache status.',
    loading: 'Loading settings...',
  },
  tabs: {
    general: 'General',
    templateDefaults: 'Defaults',
    templatePresets: 'Template presets',
    templateExport: 'Export',
    collageDefaults: 'Defaults',
    collageExport: 'Export',
    fonts: 'Fonts',
    exportTab: 'Export',
    cache: 'Cache',
    about: 'About',
    groups: {
      template: 'Border watermark',
      collage: 'Collage',
    },
    /** 二级 tab 的可访问名：分组标题对读屏隐藏，靠它把归属补回去 */
    itemAria: '{group} {tab}',
  },
  general: {
    title: 'General',
    description: 'Global behaviour and where files are saved by default.',
    language: {
      label: 'Language',
      description: 'Applies immediately. “Follow system” picks copy based on your system language.',
      system: 'Follow system',
    },
    windowStyle: {
      label: 'Window frame',
      description: 'Switch between the system frame and a frameless window; applies immediately.',
      switching: 'Switching window style...',
      nativeHint: 'System frame uses the operating system window chrome.',
      native: 'System frame',
      frameless: 'Frameless',
    },
    workspace: {
      label: 'Workspace folder',
      description:
        'The app’s own data folder; the cache folder defaults to the Cache folder inside it. If the cache folder is still at its default, it follows this change.',
    },
  },
  templateDefaults: {
    title: 'Border watermark defaults',
    description:
      'The style applied to newly imported photos. Photos you have already adjusted are unaffected.',
    font: {
      label: 'Global font',
      description:
        'Only fonts you have added are listed. Add them under “Fonts” from Google, your system, or a font file.',
      empty: 'No fonts added yet. Add one under “Fonts” and it will show up here.',
    },
  },
  templatePresets: {
    title: 'Template presets',
    description:
      'Applies to the border watermark only. Save them from the “Template presets” menu in the template page’s properties panel; here you can rename, reorder, and delete them.',
    saved: {
      label: 'Saved presets',
      description:
        'Up to {count}. Applying a preset only changes the template, parameters, background, and font; each photo keeps its own export presets.',
      empty:
        'No presets saved yet. Newly imported photos start from the template’s built-in style.',
      templateMissing: 'Template missing',
      noSummary: 'This preset has no summary.',
    },
    goToTemplate: 'Save a new preset on the template page',
    aria: {
      expand: 'Expand {name}',
      collapse: 'Collapse {name}',
      name: 'Preset name',
      moveUp: 'Move {name} up',
      moveDown: 'Move {name} down',
      rename: 'Rename {name}',
      remove: 'Delete {name}',
    },
  },
  templateExport: {
    title: 'Border watermark export',
    description:
      'Applies to the border watermark only. Write it from the template page’s export panel with “Save as default preset”; newly imported photos pick it up automatically.',
    presets: {
      label: 'Default presets',
      description:
        'Each preset holds a format, size, scale, and quality; exporting writes one file per preset.',
      empty: 'No default presets yet. New photos start from a 2000 × 2000 PNG.',
    },
    /** 单个档位一行里的摘要片段，用 ` · ` 拼成整行 */
    presetSummary: {
      scale: 'Scale {scale}x',
      quality: 'Quality {quality}',
    },
    sizes: {
      title: 'Quick sizes',
      description:
        'The shortcuts shown in the dropdown next to “Add preset” in the template page’s export panel; click one to create a preset at that size.',
      label: 'Size list',
      hint: 'All it takes is a name and a pixel size; this only affects the dropdown, not existing presets.',
      empty: 'No quick sizes yet. The dropdown will only show “Original size”.',
      namePlaceholder: 'Name',
      customName: 'Custom',
      add: 'Add size',
    },
    goToTemplate: 'Set export presets on the template page',
    aria: {
      removePreset: 'Delete {type} {detail}',
      sizeName: 'Name of quick size {index}',
      sizeWidth: '{name} width',
      sizeHeight: '{name} height',
      removeSize: 'Delete quick size {name}',
    },
  },
  collageDefaults: {
    title: 'Collage defaults',
    description:
      'The layout and canvas style used when creating a collage. Collages already on the canvas are unaffected—click “Restore defaults” in the matching section of the collage page to apply these values.',
    mode: {
      label: 'Default layout mode',
      description: 'Which mode the collage page opens in.',
      grid: 'Grid',
      long: 'Long image',
      free: 'Free',
    },
    layout: {
      label: 'Default grid layout',
      description:
        'The layout selected by default in grid mode; “Follow layout library” uses the first one in the library.',
      follow: 'Follow layout library',
    },
    ratio: {
      label: 'Canvas ratio',
      description: 'Canvas ratio for grid and free modes; you can also leave it on “Custom”.',
      custom: 'Custom',
    },
    canvas: {
      title: 'Canvas style',
      description: 'Gap, padding, corner radius, and shadow, measured in design base pixels.',
      gap: 'Gap',
      padding: 'Padding',
      radius: 'Corner radius',
      shadow: 'Shadow',
    },
    background: {
      label: 'Background colour',
      description: 'The canvas base colour, visible through transparent areas.',
    },
    long: {
      label: 'Long image defaults',
      description:
        'Join direction, alignment, and cross-axis size when switching to long image mode.',
      vertical: 'Join vertically',
      horizontal: 'Join horizontally',
      canvasWidth: 'Canvas width (px)',
      canvasHeight: 'Canvas height (px)',
    },
    align: {
      verticalStart: 'Align left',
      verticalCenter: 'Centre',
      verticalEnd: 'Align right',
      horizontalStart: 'Align top',
      horizontalCenter: 'Centre',
      horizontalEnd: 'Align bottom',
    },
    goToCollage: 'Take a look at the collage page',
    savedHint:
      'Saved collages do not follow automatically; click “Restore defaults” on the collage page.',
  },
  collageExport: {
    title: 'Collage export',
    description:
      'The initial export settings for a new collage. Collages already on the canvas are unaffected—click “Restore defaults” in the “Export” section of the collage page to apply these values.',
    format: {
      label: 'Default format',
      description: 'JPG files are smaller; PNG is lossless.',
    },
    quality: {
      label: 'Default quality',
      description: 'Only used for JPG.',
      standard: 'Standard',
      high: 'High',
      ultra: 'Ultra',
    },
    scale: {
      label: 'Default scale',
      description: 'Bitmap supersampling on top of the target size; 2x doubles both dimensions.',
    },
    size: {
      label: 'Default size',
      description:
        'Target width and height in the export panel; with the ratio locked, changing the width updates the height.',
      width: 'Width',
      height: 'Height',
      lockRatio: 'Lock canvas ratio',
    },
    aria: {
      width: 'Default export width',
      height: 'Default export height',
    },
    goToCollage: 'Take a look at the collage page',
    sizesHint:
      '“Quick sizes” are managed on the “Export” page and shared by the collage export panel and the border watermark.',
  },
  exportTab: {
    title: 'Export',
    description:
      'Shared by the border watermark and collage; exporting no longer opens a save dialog.',
    directory: {
      label: 'Export folder',
      description:
        'Exported images are written straight to this folder; the file name comes from the preset in the export panel.',
    },
  },
  cache: {
    title: 'Cache',
    description: 'Manage imported image copies, thumbnails, and the automatic cleanup policy.',
    directory: {
      label: 'Cache folder',
      description: 'Imported image copies, preview files, and thumbnails are all stored here.',
    },
    summary: {
      label: 'Cache summary',
      description:
        'Scans the current cache folder for image copies, preview copies, and thumbnails.',
    },
    storage: {
      images: 'Image copies',
      previews: 'Preview cache',
      thumbnails: 'Thumbnail cache',
      files: '{count} files',
      total: 'Total',
    },
    autoCleanup: {
      label: 'Automatic cleanup',
      description: 'Cleans up cache files older than the retention period when the app starts.',
      on: 'Automatic cleanup on',
      off: 'Automatic cleanup off',
      retention: 'Keeping files for {days} days',
    },
    cleanup: {
      label: 'Clean up cache',
      description:
        'Clear thumbnails on their own, or clear expired or all cache files; image copies still in use are kept.',
      expired: 'Clean up expired cache',
      thumbnails: 'Clear thumbnails',
      all: 'Clear all cache',
    },
  },
  about: {
    tagline:
      'A photo border watermark tool: reads EXIF data and adds camera details such as model, aperture, and shutter speed to your photos from a template, with custom fonts, backgrounds, and export presets, and batch export.',
    version: {
      title: 'Version',
      description: 'Check for a new version, or download and install one as soon as it is found.',
      updateLabel: 'App update',
      updateDescription:
        'Reads the latest version from the release channel; the app must be restarted after installing.',
    },
    community: {
      title: 'Community',
      description: 'Bug reports and release news live in these places.',
      links: {
        label: 'Related links',
        description: 'Opens in your default browser.',
      },
      repository: 'Source repository',
      feedback: 'Report an issue',
      author: 'Author profile',
    },
    trademark:
      '⚠️ Camera and phone brand trademarks shown by this tool belong to their respective companies and are used only to display EXIF data; no commercial affiliation or infringement is intended. If you believe your rights have been violated, contact us through “Report an issue” above and we will remove it.',
    licenses: {
      title: 'Open source licences',
      description:
        'This app uses the following open source projects. Thanks to their authors and communities.',
      dependencies: {
        label: 'Third-party dependencies',
        description:
          'Only runtime dependencies shipped with the app are listed; see Cargo.lock and pnpm-lock.yaml in the repository for versions and the full dependency tree.',
      },
      /** 依赖分组的标题（软件名与许可证名不翻译） */
      groups: {
        runtimeRust: 'Runtime · Rust',
        uiJavaScript: 'UI · JavaScript',
        metadataWasm: 'Metadata · WebAssembly',
      },
    },
  },
  fonts: {
    preview: {
      label: 'Preview text',
      reset: 'Reset',
    },
    /** Google 字体分类（值取自 features/fonts/google-fonts.ts 的分类标签） */
    category: {
      all: 'All',
      sansSerif: 'Sans serif',
      serif: 'Serif',
      display: 'Display',
      handwriting: 'Handwriting',
      monospace: 'Monospace',
    },
    modes: {
      available: 'Available',
      introduced: 'Added ({count})',
    },
    sources: {
      google: 'Google Fonts',
      system: 'System fonts',
      file: 'Import a file',
    },
    sourceMeta: {
      online: 'Google',
      file: 'Imported',
      system: 'System',
    },
    importFonts: {
      title: 'Add fonts',
      /** 夹着工作区字体目录的 `<code>`，因此拆成前后两段 */
      descriptionPrefix:
        'Only fonts you have added show up in the “Global font” dropdown on the template page; imported font files are kept in the workspace’s',
      descriptionSuffix: 'folder and backed up with the workspace.',
    },
    google: {
      searchPlaceholder: 'Search Google Fonts',
      introduced: 'Added',
      import: 'Add',
      total: '{count} families',
      totalFiltered: '{total} families, {matched} matching',
      prevPage: 'Previous',
      nextPage: 'Next',
      errorNoFiles: 'No font files found',
      errorSubsets: 'This font is split into many subsets; use “Import a file” instead',
      importFailed: 'Could not add the font, please try again later',
    },
    system: {
      searchPlaceholder: 'Search system fonts',
      loading: 'Loading…',
      total: '{count} total',
      empty: 'No matching system fonts.',
      import: 'Add',
      remove: 'Remove',
    },
    file: {
      select: 'Choose a font file',
      formats: 'Supports ttf / otf / woff / woff2',
      /** 同样是夹着目录 `<code>` 的两段文案 */
      hintPrefix: 'The file is copied into the workspace’s',
      hintSuffix:
        'folder and backed up with the workspace. For font collections (ttc / otc), export a single weight from a font tool first.',
    },
    introduced: {
      empty:
        'No fonts added yet. Added fonts appear in the “Global font” dropdown on the template page.',
      notePlaceholder: 'Note, e.g. “Handwriting”',
      editNote: 'Edit note',
      writeNote: 'Add note',
      remove: 'Remove',
      noteAria: 'Note for {name}',
      writeNoteAria: 'Add a note for {name}',
    },
  },
  toast: {
    loadSettingsFailed: 'Could not load settings',
    cacheActionFailed: 'Cache setting action failed',
    workspaceUpdated: 'Workspace folder updated',
    openWorkspaceFailed: 'Could not open the workspace folder',
    exportDirectoryUpdated: 'Export folder updated',
    updateExportDirectoryFailed: 'Could not update the export folder',
    openExportDirectoryFailed: 'Could not open the export folder',
    cacheDirectoryUpdated: 'Cache folder updated',
    openCacheDirectoryFailed: 'Could not open the cache folder',
    updateSizesFailed: 'Could not update the quick sizes',
    defaultPresetDeleted: 'Default preset deleted',
    removeDefaultPresetFailed: 'Could not delete the default preset',
    presetDeleted: 'Deleted preset “{name}”',
    saveFontFailed: 'Could not save the default font',
    cacheExpiredCleaned: 'Cleared {count} expired cache files{keep}',
    thumbnailsCleared: 'Thumbnail cache cleared{keep}',
    allCachesCleared: 'All cache cleared{keep}',
    /** 清理缓存时保留下来的在用量说明；没有在使用的素材时是空串 */
    keepInUse: ' (kept {count} photos still in use)',
    updateInstallFailed: 'Update installation failed, please try again later',
    openLinkFailed: 'Could not open the link, please visit it manually',
  },
  update: {
    check: 'Check for updates',
    checking: 'Checking...',
    checkFailed: 'Update check failed',
    upToDate: 'You are on the latest version',
    found: 'New version {version} available',
    downloadAndInstall: 'Download and install {version}',
    installing: 'Installing...',
    downloaded: 'Downloaded {progress}%',
    installed: 'Update installed, please restart the app',
    installFailed: 'Update installation failed',
    unsupported: 'In-app updates are not supported in this environment.',
  },
};
