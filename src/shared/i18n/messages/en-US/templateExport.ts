/**
 * templateExport 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 */
import type { Messages } from '../../translate';

export const templateExport: Messages['templateExport'] = {
  panel: {
    fileName: 'Export file name',
    removePreset: 'Remove {name}',
    addPreset: 'Add preset',
    addPresetBySize: 'Add preset from a common size',
    saveAsDefault: 'Save as default preset',
  },
  preset: {
    targetWidth: 'Target width',
    targetHeight: 'Target height',
    scale: 'Scale {scale}x',
  },
  fileName: {
    /** Auto naming: source name plus target size */
    auto: '{base}@{width}x{height}',
  },
  format: {
    png: 'PNG',
    jpeg: 'JPEG',
  },
  quality: {
    label: 'Quality {value}',
  },
  size: {
    menuLabel: 'Common sizes',
    original: 'Original size',
    photoNotReady: 'Photo not ready',
    empty: 'No common sizes yet — add them in Settings',
  },
  error: {
    invalidSize:
      'Target width and height must both be positive numbers, otherwise the export size cannot be resolved.',
  },
  presetMenu: {
    title: 'Template presets',
    description:
      'Save the current photo’s template, parameters, background and font as a preset, then apply it to other photos in one click.',
    select: 'Select preset',
    create: 'Save as new preset',
    invalidTemplate: 'Template unavailable',
    empty: 'No saved presets yet',
    presetLimitHint:
      'You can save up to {count} presets; rename, reorder or delete them under “Template presets” in Settings.',
    createDescription:
      'Save the current photo’s template, parameters, background and font as a preset. Keep the name between {min} and {max} characters.',
    namePlaceholder: 'e.g. Weibo · White border',
    cancel: 'Cancel',
    save: 'Save',
    templateLabel: 'Template: {name}',
    invalidTemplateDescription:
      'The template this preset uses no longer exists in this version, so it can only be overwritten or deleted.',
    overwriteHint: '[Overwrite preset] Apply the current photo’s style to this preset.',
    applyAllHint: '[Apply to all] Apply this preset to every photo.',
    applyCurrentHint: '[Apply preset] Apply this preset to the current photo.',
    exportPresetHint:
      'Export presets are not part of a template preset; applying one keeps the export settings already set for each photo.',
    remove: 'Delete',
    overwrite: 'Overwrite preset',
    applyAll: 'Apply to all',
    applyCurrent: 'Apply preset',
  },
  toast: {
    saved: 'Saved as preset “{name}”',
    overwritten: 'Overwrote preset “{name}” with the current photo',
    removed: 'Deleted preset “{name}”',
    appliedAll: 'Applied preset to all {count} photos',
    appliedCurrent: 'Applied preset to the current photo',
  },
};
