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
  import: {
    failedOne: '「{name}」导入失败，已跳过',
    failedMany: '{count} 张图片导入失败，已跳过',
    failedMore: '等 {count} 张',
    failedAborted: '导入失败：{reason}',
    /** 缺 HEIC 解码能力时，提示里的按钮：跳到设置 → 插件 */
    installPlugin: '去安装插件',
  },
  export: {
    done: '导出完成',
    failed: '导出失败，请检查设置里的保存目录是否可用',
  },
  photo: {
    close: '关闭',
    closeOthers: '关闭其他',
    closeLeft: '关闭左边',
    closeRight: '关闭右边',
  },
  dialog: {
    /** 原生「打开图片」对话框里的文件类型筛选名 */
    imageFilter: '图片',
    /** 原生「选择 Logo」对话框里的文件类型筛选名 */
    logoFilter: 'Logo 图片',
    /** 原生「选择相机文件」对话框里的文件类型筛选名（含各家 RAW） */
    cameraFileFilter: '相机文件',
  },
  tools: {
    title: '更多功能',
    manage: '管理',
    manageDone: '完成',
    added: '已添加功能',
    addedEmpty: '还没有添加任何功能',
    available: '未添加功能',
    availableEmpty: '全部功能都已添加',
    loading: '正在加载…',
    back: '返回',
    notFound: '这个功能不存在（可能已从应用里移除）',
    loadFailed: '加载「{name}」失败',
    saveFailed: '保存功能开关失败',
    shutterCount: {
      name: '快门数查询',
      description: '读出相机文件里的累计快门次数',
      hint: '读取相机直出文件里的快门数（JPEG / RAW / HEIC）。编辑过、二次压缩或手机拍的文件通常没有这个字段。',
      chooseFile: '选择相机文件',
      reselect: '换一个文件',
      dropTitle: '把相机直出的文件拖到这里',
      dropHint: '或点击下面的按钮挑一个文件',
      supported: '支持 JPEG / HEIC / RAW 等相机原图',
      parsing: '正在解析…',
      readFailed: '解析失败',
      notFoundTitle: '这个文件里没有快门数字段',
      notFoundHint:
        '常见原因：照片被编辑或二次导出过、用手机拍摄、该机型不记录（iPhone 不提供）。换成相机存储卡里未动过的原图再试。',
      count: '累计快门数',
      source: '取自 {tag}',
      camera: '相机',
      unknown: '未识别',
      provider: '解析器',
      file: '文件',
      tooLarge: '文件超过 {limit}，请换一张（解析要把整份文件读进内存）',
      tag: {
        serialNumber: '机身序列号',
        firmware: '固件版本',
        fileNumber: '文件序号',
      },
    },
  },
  error: {
    /** Web 端（没有工作区目录）才会出现的错误 */
    webNoWorkspace: {
      importFonts: '网页端没有工作区目录，无法导入字体文件',
      deleteFonts: '网页端没有工作区目录，无法删除字体文件',
      importLogos: '网页端没有工作区目录，无法添加自定义 Logo',
      deleteLogos: '网页端没有工作区目录，无法删除自定义 Logo',
    },
    webNoPlugins: '网页端不支持插件',
  },
};
