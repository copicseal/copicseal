/**
 * settings 命名空间的文案（zh-CN）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 分支与 `src/features/settings/settings-page.tsx` 的 tab 结构对应：
 * `tabs.*` 是侧边栏的 tab 与分组标题，其余分支各自对应一个 tab（`fonts` 对应字体页，
 * `header` 是页面外壳，`toast` / `update` 是跨 tab 的提示）。
 */
export const settings = {
  header: {
    title: '设置',
    description: '管理软件行为、缓存目录、缩略图生成与自动清理策略。',
    loadingDescription: '正在读取配置与缓存状态。',
    loading: '正在加载设置...',
  },
  tabs: {
    general: '通用',
    templateDefaults: '默认项',
    templatePresets: '模板预设',
    templateExport: '导出',
    collageDefaults: '默认项',
    collageExport: '导出',
    fonts: '字体',
    exportTab: '导出',
    cache: '缓存',
    about: '关于',
    groups: {
      template: '边框水印',
      collage: '拼图',
    },
    /** 二级 tab 的可访问名：分组标题对读屏隐藏，靠它把归属补回去 */
    itemAria: '{group} {tab}',
  },
  general: {
    title: '通用',
    description: '控制应用的全局行为与默认保存位置。',
    language: {
      label: '语言',
      description: '切换后立即生效；「跟随系统」会按系统语言选择界面文案。',
      system: '跟随系统',
    },
    windowStyle: {
      label: '窗口边框',
      description: '切换使用系统边框或无边框窗口，修改后会立即生效。',
      switching: '正在切换窗口样式...',
      nativeHint: '系统边框模式将使用操作系统自带窗口外框。',
      native: '系统边框',
      frameless: '无边框',
    },
    workspace: {
      label: '工作区目录',
      description:
        '应用自己的数据目录，缓存目录默认位于它下面的 Cache 文件夹。修改后如果缓存目录仍是默认值，会一起跟随更新。',
    },
  },
  templateDefaults: {
    title: '边框水印默认项',
    description: '新导入的图片默认使用的样式；已经单独调过的图片不受影响。',
    font: {
      label: '全局字体',
      description: '只列出已引入的字体：在「字体」里从在线、本机或字体文件三种来源引入。',
      empty: '还没有引入字体，去「字体」里引入后这里就能选了。',
    },
  },
  templatePresets: {
    title: '模板预设',
    description:
      '只对边框水印生效。在模板页属性面板的「模板预设」里保存，这里可以改名、排序与删除。',
    saved: {
      label: '已保存的配置',
      description:
        '最多 {count} 条。应用配置只改模板、参数、背景与字体，各张图片自己的导出档位保持不动。',
      empty: '还没有保存的配置，新导入的图片会从模板自带的默认样式开始。',
      templateMissing: '模板已失效',
      noSummary: '这条配置没有摘要。',
    },
    goToTemplate: '去模板页保存新配置',
    aria: {
      expand: '展开 {name}',
      collapse: '收起 {name}',
      name: '配置名称',
      moveUp: '上移 {name}',
      moveDown: '下移 {name}',
      rename: '重命名 {name}',
      remove: '删除 {name}',
    },
  },
  templateExport: {
    title: '边框水印导出',
    description: '只对边框水印生效。在模板页导出面板点「存为默认档位」写入，新导入的图片自动套用。',
    presets: {
      label: '默认档位',
      description: '每档一组格式、尺寸、倍率与质量，导出时逐档输出一份文件。',
      empty: '还没有默认档位，新图片会从 2000 × 2000 的 PNG 开始。',
    },
    /** 单个档位一行里的摘要片段，用 ` · ` 拼成整行 */
    presetSummary: {
      scale: '倍率 {scale}x',
      quality: '质量 {quality}',
    },
    sizes: {
      title: '常用尺寸',
      description: '模板页导出面板里「添加档位」右侧下拉显示的快捷尺寸，点一下即按该尺寸新建档位。',
      label: '尺寸清单',
      hint: '写成一组名字与像素尺寸即可；只影响这个下拉，不改变已有档位。',
      empty: '还没有常用尺寸，下拉里只会显示「原始尺寸」。',
      namePlaceholder: '名称',
      customName: '自定义',
      add: '添加尺寸',
    },
    goToTemplate: '去模板页设置档位',
    aria: {
      removePreset: '删除 {type} {detail}',
      sizeName: '第 {index} 个常用尺寸的名称',
      sizeWidth: '{name} 的宽度',
      sizeHeight: '{name} 的高度',
      removeSize: '删除常用尺寸 {name}',
    },
  },
  collageDefaults: {
    title: '拼图默认项',
    description:
      '新建拼图时使用的布局与画布样式。已经摆在画布上的拼图不受影响——在拼图页对应分区点「恢复默认」即可套用这里的值。',
    mode: {
      label: '默认布局模式',
      description: '打开拼图页时默认停在哪个模式。',
      grid: '网格',
      long: '长图',
      free: '自由',
    },
    layout: {
      label: '默认网格布局',
      description: '网格模式下默认选中的布局；选「跟随布局库」则用布局库里的第一个。',
      follow: '跟随布局库',
    },
    ratio: {
      label: '画布比例',
      description: '网格与自由模式的画布比例，也可以留「自定义」。',
      custom: '自定义',
    },
    canvas: {
      title: '画布样式',
      description: '间距、边距、圆角与阴影，按设计基准像素计。',
      gap: '间距',
      padding: '边距',
      radius: '圆角',
      shadow: '阴影',
    },
    background: {
      label: '背景色',
      description: '画布底色，透明区域会露出它。',
    },
    long: {
      label: '长图默认值',
      description: '切到长图模式时的拼接方向、对齐方式与横轴尺寸。',
      vertical: '竖向拼接',
      horizontal: '横向拼接',
      canvasWidth: '画布宽度（px）',
      canvasHeight: '画布高度（px）',
    },
    align: {
      verticalStart: '左对齐',
      verticalCenter: '居中',
      verticalEnd: '右对齐',
      horizontalStart: '上对齐',
      horizontalCenter: '居中',
      horizontalEnd: '下对齐',
    },
    goToCollage: '到拼图页看看',
    savedHint: '已保存的拼图不会自动跟随，可在拼图页点「恢复默认」。',
  },
  collageExport: {
    title: '拼图导出',
    description:
      '新建拼图时导出面板的初始参数。已经摆在画布上的拼图不受影响——在拼图页「导出」分区点「恢复默认」即可套用这里的值。',
    format: {
      label: '默认格式',
      description: 'JPG 体积更小，PNG 无损。',
    },
    quality: {
      label: '默认质量',
      description: '只有 JPG 会用到。',
      standard: '标准',
      high: '高清',
      ultra: '超清',
    },
    scale: {
      label: '默认倍率',
      description: '在目标尺寸之上做位图超采样，2x 就是长宽各翻一倍。',
    },
    size: {
      label: '默认尺寸',
      description: '导出面板里的目标宽高；锁定比例时改宽度会自动推高度。',
      width: '宽度',
      height: '高度',
      lockRatio: '锁定画布比例',
    },
    aria: {
      width: '默认导出宽度',
      height: '默认导出高度',
    },
    goToCollage: '到拼图页看看',
    sizesHint: '「常用尺寸」在「导出」页维护，拼图导出面板与边框水印共用同一份。',
  },
  exportTab: {
    title: '导出',
    description: '边框水印与拼图共用这个目录，导出过程不会再弹保存对话框。',
    directory: {
      label: '文件导出目录',
      description: '导出的图片直接写到这个目录，文件名由导出面板里的档位决定。',
    },
  },
  cache: {
    title: '缓存',
    description: '管理导入图片副本、缩略图与自动清理策略。',
    directory: {
      label: '缓存目录',
      description: '导入后的图片副本、预览文件与缩略图都会保存在这里。',
    },
    summary: {
      label: '缓存摘要',
      description: '从当前缓存目录实时扫描图片副本、预览副本和缩略图占用。',
    },
    storage: {
      images: '图片副本',
      previews: '预览缓存',
      thumbnails: '缩略图缓存',
      files: '{count} 个文件',
      total: '总占用',
    },
    autoCleanup: {
      label: '自动清理',
      description: '应用启动时自动清理超过保留天数的缓存文件。',
      on: '已开启自动清理',
      off: '已关闭自动清理',
      retention: '当前保留时长 {days} 天',
    },
    cleanup: {
      label: '清理缓存',
      description: '可单独清理缩略图，或清理过期/全部缓存；正在使用的图片副本会保留。',
      expired: '清理过期缓存',
      thumbnails: '清理缩略图',
      all: '清理全部缓存',
    },
  },
  about: {
    tagline:
      '图片加边框水印工具：读取 EXIF 信息，按模板为照片加上机型、光圈、快门等相机参数，支持自定义字体、背景与导出档位，可批量导出。',
    version: {
      title: '版本',
      description: '检查新版本，或在发现更新时直接下载安装。',
      updateLabel: '版本更新',
      updateDescription: '从发布渠道读取最新版本，安装后需重新启动应用。',
    },
    community: {
      title: '社区',
      description: '问题反馈与更新动态都在这些地方。',
      links: {
        label: '相关链接',
        description: '用系统默认浏览器打开。',
      },
      repository: '开源仓库',
      feedback: '问题反馈',
      author: '作者主页',
    },
    trademark:
      '⚠️ 本工具展示的相机 / 手机品牌商标版权归各自公司所有，仅用于展示 EXIF 信息，不构成商业关联或侵权。若您认为相关内容侵犯了您的合法权益，请通过上方「问题反馈」联系我们删除。',
    licenses: {
      title: '开源许可',
      description: '本软件使用了下列开源项目，感谢它们的作者与社区。',
      dependencies: {
        label: '第三方依赖',
        description:
          '只列随应用一起分发的运行时依赖；版本与完整依赖树见仓库的 Cargo.lock 与 pnpm-lock.yaml。',
      },
      /** 依赖分组的标题（软件名与许可证名不翻译） */
      groups: {
        runtimeRust: '运行时 · Rust',
        uiJavaScript: '界面 · JavaScript',
        metadataWasm: '元数据 · WebAssembly',
      },
    },
  },
  fonts: {
    preview: {
      label: '预览文本',
      reset: '重置',
    },
    /** Google 字体分类（值取自 features/fonts/google-fonts.ts 的分类标签） */
    category: {
      all: '全部',
      sansSerif: '无衬线',
      serif: '衬线',
      display: '展示',
      handwriting: '手写',
      monospace: '等宽',
    },
    modes: {
      available: '待引入',
      introduced: '已引入（{count}）',
    },
    sources: {
      google: 'Google Fonts',
      system: '本机字体',
      file: '自定义导入',
    },
    sourceMeta: {
      online: 'Google',
      file: '导入',
      system: '本机',
    },
    importFonts: {
      title: '引入字体',
      /** 夹着工作区字体目录的 `<code>`，因此拆成前后两段 */
      descriptionPrefix:
        '只有引入过的字体会出现在模板页的「全局字体」下拉里；导入的字体文件保存在工作区的',
      descriptionSuffix: '下，跟着工作区一起备份。',
    },
    google: {
      searchPlaceholder: '搜索 Google Fonts',
      introduced: '已引入',
      import: '引入',
      total: '共 {count} 个族',
      totalFiltered: '共 {total} 个族，匹配 {matched} 个',
      prevPage: '上一页',
      nextPage: '下一页',
      errorNoFiles: '没有解析到字体文件',
      errorSubsets: '该字体被拆成多个子集，请改用「自定义导入」',
      importFailed: '引入失败，请稍后重试',
    },
    system: {
      searchPlaceholder: '搜索本机字体',
      loading: '读取中…',
      total: '共 {count} 个',
      empty: '没有匹配的本机字体。',
      import: '引入',
      remove: '移出',
    },
    file: {
      select: '选择字体文件',
      formats: '支持 ttf / otf / woff / woff2',
      /** 同样是夹着目录 `<code>` 的两段文案 */
      hintPrefix: '文件会被复制到工作区的',
      hintSuffix: '下，跟着工作区一起备份。集合字体（ttc / otc）请先在字体工具里导出单字重再导入。',
    },
    introduced: {
      empty: '还没有引入任何字体。引入后才会出现在模板页的「全局字体」下拉里。',
      notePlaceholder: '备注，如「手写」',
      editNote: '改备注',
      writeNote: '写备注',
      remove: '移除',
      noteAria: '{name} 的备注',
      writeNoteAria: '给 {name} 写备注',
    },
  },
  toast: {
    loadSettingsFailed: '读取设置失败',
    cacheActionFailed: '缓存设置操作失败',
    workspaceUpdated: '工作区目录已更新',
    openWorkspaceFailed: '打开工作区目录失败',
    exportDirectoryUpdated: '文件导出目录已更新',
    updateExportDirectoryFailed: '更新文件导出目录失败',
    openExportDirectoryFailed: '打开文件导出目录失败',
    cacheDirectoryUpdated: '缓存目录已更新',
    openCacheDirectoryFailed: '打开缓存目录失败',
    updateSizesFailed: '更新常用尺寸失败',
    defaultPresetDeleted: '已删除默认档位',
    removeDefaultPresetFailed: '删除默认档位失败',
    presetDeleted: '已删除配置「{name}」',
    saveFontFailed: '保存默认字体失败',
    cacheExpiredCleaned: '已清理 {count} 个过期缓存文件{keep}',
    thumbnailsCleared: '缩略图缓存已清理{keep}',
    allCachesCleared: '全部缓存已清理{keep}',
    /** 清理缓存时保留下来的在用量说明；没有在使用的素材时是空串 */
    keepInUse: '（保留 {count} 张正在使用的图片）',
    updateInstallFailed: '更新安装失败，请稍后重试',
    openLinkFailed: '打开链接失败，请手动访问',
  },
  update: {
    check: '检查更新',
    checking: '检查中...',
    checkFailed: '检查更新失败',
    upToDate: '已是最新版本',
    found: '发现新版本 {version}',
    downloadAndInstall: '下载并安装 {version}',
    installing: '安装中...',
    downloaded: '已下载 {progress}%',
    installed: '更新已安装，请重新启动应用',
    installFailed: '更新安装失败',
    unsupported: '当前环境不支持应用内更新。',
  },
};
