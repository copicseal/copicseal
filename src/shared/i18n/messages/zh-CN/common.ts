/**
 * common 命名空间的文案（zh-CN）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * `src/shared/**` 里的控件被多个业务模块共用，这里的措辞要保持通用。
 */
export const common = {
  /** 应用名 / 品牌名：窗口外壳与侧栏的悬浮提示用 */
  brand: {
    name: '可图匠',
  },
  action: {
    open: '打开',
    select: '选择',
    change: '更改',
  },
  nav: {
    template: '边框水印',
    collage: '拼图',
    settings: '设置',
  },
  window: {
    minimize: '最小化窗口',
    maximize: '最大化窗口',
    restore: '还原窗口',
    close: '关闭窗口',
  },
  font: {
    selectPlaceholder: '选择字体',
    followTemplate: '跟随模板默认',
    refresh: '刷新系统字体',
  },
  dropZone: {
    releaseToImport: '释放以导入照片',
  },
  export: {
    done: '导出完成',
    failed: '导出失败，请检查设置里的保存目录是否可用',
  },
  dialog: {
    /** 原生「打开图片」对话框里的文件类型筛选名 */
    imageFilter: '图片',
  },
  error: {
    /** Web 端（没有工作区目录）才会出现的错误 */
    webNoWorkspace: {
      importFonts: '网页端没有工作区目录，无法导入字体文件',
      deleteFonts: '网页端没有工作区目录，无法删除字体文件',
    },
  },
};
