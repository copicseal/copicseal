/**
 * templateExport 命名空间的文案（zh-CN）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 */
export const templateExport = {
  panel: {
    fileName: '导出文件名',
    removePreset: '删除 {name}',
    addPreset: '添加档位',
    addPresetBySize: '按常用尺寸添加档位',
    saveAsDefault: '存为默认档位',
  },
  preset: {
    targetWidth: '目标宽',
    targetHeight: '目标高',
    scale: '倍率 {scale}x',
  },
  fileName: {
    /** 档位自动命名：原图名 + 目标尺寸 */
    auto: '{base}@{width}x{height}',
  },
  format: {
    png: 'PNG',
    jpeg: 'JPEG',
  },
  quality: {
    label: '质量 {value}',
  },
  size: {
    menuLabel: '常用尺寸',
    original: '原始尺寸',
    photoNotReady: '图片未就绪',
    empty: '还没有常用尺寸，可在设置里添加',
  },
  error: {
    invalidSize: '目标宽与目标高都必须填写正数，否则无法解算导出尺寸。',
  },
  presetMenu: {
    title: '模板预设',
    description: '把当前图片的模板、参数、背景与字体存成一条配置，之后可一键套用到其它图片。',
    select: '选择配置',
    create: '存为新配置',
    invalidTemplate: '模板已失效',
    empty: '还没有保存的配置',
    presetLimitHint: '最多保存 {count} 条；改名、排序与删除在设置的「模板预设」里。',
    createDescription:
      '把当前图片的模板、参数、背景与字体存成一条配置，名称以 {min} - {max} 个字符为宜。',
    namePlaceholder: '例如 微博图 · 白边',
    cancel: '取消',
    save: '保存',
    templateLabel: '模板：{name}',
    invalidTemplateDescription: '这条配置用的模板在当前版本里已不存在，只能覆盖或删除。',
    overwriteHint: '【覆盖配置】把当前图片的样式覆盖到这条配置。',
    applyAllHint: '【应用全部】把这条配置应用到所有图片。',
    applyCurrentHint: '【应用配置】把这条配置应用到当前图片。',
    exportPresetHint: '导出档位不属于配置，应用时保持每张图片已有的档位。',
    remove: '删除',
    overwrite: '覆盖配置',
    applyAll: '应用全部',
    applyCurrent: '应用配置',
  },
  toast: {
    saved: '已存为配置「{name}」',
    overwritten: '已用当前图片覆盖配置「{name}」',
    removed: '已删除配置「{name}」',
    appliedAll: '已应用配置到全部 {count} 张图片',
    appliedCurrent: '已应用配置到当前图片',
  },
};
