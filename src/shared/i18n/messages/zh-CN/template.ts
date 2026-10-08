/**
 * template 命名空间的文案（zh-CN）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 覆盖 `src/features/template/**`：导出面板、导出档位与预设菜单见 templateExport；
 * `meta.*` 是模板定义里的元数据（显示名、参数标签与选项），由 `nameKey` /
 * `labelKey` 这类可选字段引用，模板作者不写 key 时回落到定义里的字面量。
 */
export const template = {
  header: {
    title: '边框水印',
    description: '模板渲染与导出',
  },
  actions: {
    exportCurrent: '导出当前',
    exportBatch: '批量导出',
  },
  assets: {
    title: '素材库',
    expand: '展开素材面板',
    collapse: '收起素材面板',
    switchTo: '切换到 {name}',
    importFolder: '导入文件夹',
    importPhoto: '导入图片',
    generatingThumbnail: '生成缩略图中',
    remove: '删除素材',
    removeAria: '删除 {name}',
    importing: '正在导入 {current} / {total}',
    importingWithName: '正在导入 {current} / {total} · {name}',
    preparingImport: '正在准备导入...',
    preparingImportWithName: '正在准备导入... · {name}',
  },
  empty: {
    dropHint: '拖入图片开始边框水印',
    importing: '图片正在导入中…',
    importingHint: '素材会逐步加入当前列表',
    importHint: '或点击右上角导入本地图片',
    properties: '导入图片后即可调整这张照片的模板、参数、背景与导出档位。',
  },
  selector: {
    title: '模板',
    favorite: '收藏',
    favorited: '已收藏',
    globalFont: '全局字体',
    noFonts: '还没有引入字体；可在 设置 → 字体 里从在线、本机或文件引入。',
    fontHint: '只列出已引入的字体，可在 设置 → 字体 里调整。',
    placeholder: '选择模板',
  },
  propsPanel: {
    on: '开启',
    off: '关闭',
  },
  preview: {
    emptyTitle: '边框水印预览',
    emptyDescription: '选择一张图片后，这里会显示真实模板渲染结果。',
    exporting: '正在导出…',
    zoomFit: '适应',
  },
  palette: {
    title: '照片主题色',
    hint: '点击直接应用',
    extracting: '提取中…',
    failed: '未能提取照片主题色，可直接手动选择颜色。',
    applyAria: '应用主题色 {color}',
  },
  exifCard: {
    loading: '正在读取 EXIF...',
    noExif: '当前图片未读取到 EXIF 信息。',
    empty: '导入图片后在这里查看拍摄参数。',
    field: {
      camera: '相机',
      lens: '镜头',
      shootingParams: '拍摄参数',
      dateTaken: '拍摄时间',
      exposureCompensation: '曝光补偿',
      whiteBalance: '白平衡',
      meteringMode: '测光模式',
      dimensions: '尺寸',
      gps: 'GPS',
    },
  },
  panel: {
    templateParams: {
      title: '模板参数',
      description: '每个模板有自己的可调项，换了模板就会回到新模板的默认值。',
    },
    background: {
      title: '背景',
      description: '起始值随模板变化，可按当前照片单独调整。',
    },
    export: {
      title: '导出',
      description:
        '每个档位保存一组尺寸和画质设置。没有背景时按比例套用目标尺寸，正方形画面配 1280×720 会导出 720×720；有背景时成片尺寸就是设定的宽高。存为默认档位后，之后导入的图片会自动套用这组档位。',
    },
    exif: {
      title: 'EXIF 信息',
    },
  },
  applyToOthers: {
    template: '模板与参数应用到其他',
    background: '背景应用到其他',
    presets: '导出档位应用到其他',
    label: '{label}（{count} 张）',
  },
  applyScope: {
    template: '模板与参数',
    background: '背景',
    presets: '导出档位',
  },
  toast: {
    savedAsDefault: '已存为默认档位，之后导入的图片会自动套用',
    saveDefaultFailed: '保存默认档位失败',
    saveDefaultFontFailed: '保存默认字体失败',
    appliedToOthers: '已把{scope}应用到其余 {count} 张照片',
    skippedIncomplete: '{count} 张照片的档位不完整，已跳过',
  },
  background: {
    mode: {
      label: '背景模式',
      description: '无背景时画框贴合模板；有背景时画框等于目标尺寸，模板内嵌其中。',
      option: {
        none: '无背景',
        color: '纯色背景',
        image: '照片模糊',
      },
    },
    color: {
      label: '背景颜色',
    },
    blur: {
      label: '模糊强度',
      description: '相对画框宽度的比例。',
    },
    brightness: {
      label: '模糊图亮度',
    },
    paddingHorizontal: {
      label: '水平内边距',
      description: '相对画框宽度的比例。',
    },
    paddingVertical: {
      label: '垂直内边距',
      description: '同样以画框宽度为基准，因此不依赖画框高度。',
    },
  },
  preset: {
    templateLine: '模板: {name}',
    paramsTitle: '模板参数:',
    backgroundTitle: '背景:',
    backgroundModeLine: '- 模式: {mode}',
    fieldLine: '- {label}: {value}',
    nameLength: '名称需要 {min} - {max} 个字符',
    limitReached: '模板预设已达上限（{count}），请先删除一些',
    saveFailed: '保存模板预设失败',
  },
  meta: {
    exifVariable: {
      make: '相机品牌',
      model: '相机型号',
      lensModel: '镜头型号',
      focalLength: '焦距',
      fNumber: '光圈',
      exposureTime: '快门',
      iso: '感光度',
      dateTaken: '拍摄时间',
    },
    minimal: {
      name: 'Minimal',
      description: '白底极简排版，只保留图片与两行 EXIF 文案。',
      tag: {
        minimal: '极简',
        exif: 'EXIF',
      },
      option: {
        orientation: {
          label: '排版方向',
          description: '自动模式按图片长宽比决定文案对齐方式。',
          auto: '自动',
          horizontal: '横向',
          vertical: '竖向',
        },
        fontScale: {
          label: '字体缩放',
          description: '在模板基准字号之上的倍数。',
        },
        textColor: {
          label: '文字颜色',
        },
        textLine1: {
          label: '文案 1',
        },
        textLine2: {
          label: '文案 2',
        },
      },
    },
    film: {
      name: 'Film',
      description: '胶片风格宽边框，带角标与底栏拍摄信息。',
      tag: {
        film: '胶片',
        frame: '边框',
      },
      option: {
        frameWidth: {
          label: '边框宽度',
          description: '相对画布宽度的比例，0.05 即约占画布宽度的 5%。',
        },
        frameColor: {
          label: '边框颜色',
        },
        textColor: {
          label: '文字颜色',
        },
        fontScale: {
          label: '字体缩放',
          description: '在模板基准字号之上的倍数。',
        },
        cornerLabel: {
          label: '角标文字',
        },
        caption: {
          label: '底栏文案',
        },
      },
    },
    whiteframe: {
      name: '白框',
      description: '白色相框卡片，图片下方是品牌标志、机型与两段 EXIF 文案。',
      tag: {
        frame: '相框',
        brand: '品牌',
        infoBar: '信息条',
      },
      option: {
        layout: {
          label: '排列方向',
          description: '自动模式在竖构图时把信息栏移到图片右侧。',
          auto: '自动',
          vertical: '纵向（信息在下）',
          horizontal: '横向（信息在侧）',
        },
        borderPadding: {
          label: '相框边距',
          description: '相对画布宽度的比例。',
        },
        borderColor: {
          label: '相框颜色',
        },
        fontScale: {
          label: '文字缩放',
        },
        textColor: {
          label: '文字颜色',
        },
        logoColorAuto: {
          label: '标志跟随文字颜色',
          description: '开启后使用单色标志，颜色与文字一致。',
        },
        logoShadow: {
          label: '标志阴影',
        },
        shadowBlur: {
          label: '相框阴影模糊',
          description: '相对画布宽度的比例，0 表示不投影。',
        },
        shadowColor: {
          label: '相框阴影颜色',
        },
        shadowOpacity: {
          label: '相框阴影不透明度',
        },
        text1: {
          label: '行程文案',
        },
        text2: {
          label: '时间文案',
        },
      },
    },
    rounded: {
      name: '圆角',
      description: '无框圆角图片，下方居中堆叠品牌标志、机型与两行 EXIF 文案。',
      tag: {
        borderless: '无框',
        rounded: '圆角',
        brand: '品牌',
      },
      option: {
        imageRadius: {
          label: '图片圆角',
          description: '相对画布宽度的比例；旧版 0.1rem 换算后约为 0.015。',
        },
        shadowBlur: {
          label: '图片阴影模糊',
          description: '相对画布宽度的比例，0 表示不投影；旧版 0.2rem 换算后约为 0.03。',
        },
        shadowColor: {
          label: '图片阴影颜色',
        },
        shadowOpacity: {
          label: '图片阴影不透明度',
        },
        fontScale: {
          label: '文字缩放',
          description: '在模板基准字号之上的倍数，标志尺寸同步缩放。',
        },
        textColor: {
          label: '文字颜色',
        },
        text1: {
          label: '文案 1',
          description: '支持 {FocalLength}、{FNumber}、{ExposureTime}、{ISO} 等 EXIF 变量。',
        },
        text2: {
          label: '文案 2',
          description: '留空时回落到拍摄时间。',
        },
        logoColorAuto: {
          label: '标志跟随文字颜色',
          description: '开启后使用单色标志，颜色与文字一致。',
        },
        logoShadow: {
          label: '标志阴影',
          description: '仅为彩色标志加一层跟随文字颜色的描边阴影。',
        },
      },
    },
    overlay: {
      name: '叠字',
      description: '把品牌标志、机型与拍摄参数叠印在图片之上，九宫格定位配四向偏移。',
      tag: {
        overlay: '叠字',
        grid: '九宫格',
        brand: '品牌',
      },
      option: {
        position: {
          label: '文字位置',
          description: '九宫格定位，决定信息块贴在图片的哪个位置。',
          topLeft: '左上',
          top: '上',
          topRight: '右上',
          left: '左',
          center: '中',
          right: '右',
          bottomLeft: '左下',
          bottom: '下',
          bottomRight: '右下',
        },
        offsetTop: {
          label: '顶部偏移',
          description: '贴住上边缘时生效，相对画布宽度的比例。',
        },
        offsetLeft: {
          label: '左侧偏移',
          description: '贴住左边缘时生效，相对画布宽度的比例。',
        },
        offsetRight: {
          label: '右侧偏移',
          description: '贴住右边缘时生效，相对画布宽度的比例。',
        },
        offsetBottom: {
          label: '底部偏移',
          description: '贴住下边缘时生效，相对画布宽度的比例。',
        },
        layout: {
          label: '布局排列',
          description: '自动模式按图片长宽比决定：横图并排，竖图上下。',
          auto: '自动',
          vertical: '垂直（上下）',
          horizontal: '水平（并排）',
        },
        gapScale: {
          label: '布局间距',
          description: '在模板基准间距之上的倍数，0 表示紧贴。',
        },
        fontScale: {
          label: '文字缩放',
          description: '在模板基准字号之上的倍数。',
        },
        textColor: {
          label: '文字颜色',
        },
        logoColorAuto: {
          label: '标志颜色自动',
          description: '开启后使用单色标志，颜色与文字一致。',
        },
        logoShadow: {
          label: '标志阴影',
          description: '彩色标志在浅色照片上容易糊掉，加一圈阴影提升可读性。',
        },
        shadowBlur: {
          label: '阴影模糊',
          description: '相对画布宽度的比例，0 表示不投影。',
        },
        shadowColor: {
          label: '阴影颜色',
        },
        shadowOpacity: {
          label: '阴影不透明度',
        },
        text1: {
          label: '文本 1',
          description: '机型下方的参数文案，支持 {变量} 占位。',
        },
        text2: {
          label: '文本 2',
          description: '最下方的时间文案，留空时回退为拍摄时间。',
        },
      },
    },
    watermark: {
      name: '平铺水印',
      description: '整图铺满画布，叠加一层可调角度与透明度的平铺水印。',
      tag: {
        watermark: '水印',
        tiled: '平铺',
      },
      option: {
        text: {
          label: '水印文字',
          description: '支持 {Model} 这类 EXIF 变量，留空即不绘制水印层。',
        },
        textColor: {
          label: '文字颜色',
        },
        textOpacity: {
          label: '文字不透明度',
          description: '0 为完全透明、1 为完全不透明，与文字颜色分开调整。',
        },
        rotate: {
          label: '文字角度',
          description: '单位为度，直接填角度；-45 与旧版 3.15×100 的倾斜方向一致。',
        },
        fontSize: {
          label: '文字大小',
          description: '相对瓦片宽度的比例，0.2 即约占瓦片宽度的 20%。',
        },
        tileWidth: {
          label: '瓦片宽度',
          description: '相对画布宽度的比例，0.15 约等于旧版的 1rem 瓦片。',
        },
        tileHeight: {
          label: '瓦片高度',
          description: '相对画布宽度的比例，与瓦片宽度共同决定平铺密度。',
        },
      },
    },
  },
};
