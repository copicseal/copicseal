/**
 * fonts 命名空间的文案（zh-CN）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 覆盖 `src/features/fonts/**`；字体族名是用户数据，只作插值参数，不翻译。
 */
export const fonts = {
  toast: {
    imported: '已导入字体「{family}」',
    onlineImported: '已引入在线字体「{family}」',
    alreadyImported: '「{family}」已经引入过了',
    removed: '已移除字体「{family}」',
  },
  error: {
    saveFailed: '保存字体设置失败',
    importFailed: '导入字体失败，请确认文件是有效的字体',
    downloadFailed: '下载字体失败：地址不可达或该来源不允许跨域访问',
  },
};
