/**
 * fonts 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 覆盖 `src/features/fonts/**`；字体族名是用户数据，只作插值参数，不翻译。
 */
import type { Messages } from '../../translate';

export const fonts: Messages['fonts'] = {
  toast: {
    imported: 'Imported font “{family}”',
    onlineImported: 'Added online font “{family}”',
    alreadyImported: '“{family}” has already been imported',
    removed: 'Removed font “{family}”',
  },
  error: {
    saveFailed: 'Could not save font settings',
    importFailed: 'Import failed. Make sure the file is a valid font.',
    downloadFailed:
      'Download failed: the address is unreachable or the source disallows cross-origin requests.',
  },
};
