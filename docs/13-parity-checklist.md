# 旧版对齐清单（迁移对照与排期）

> **用途**：本次重构（Tauri 2 + React 19）与旧版桌面应用之间的差异盘点，供产品负责人逐条决定「改 / 不改」。
> **性质**：工作清单与排期依据，不是需求文档。旧版行为只作为对照证据存在，产品需求仍以 `01`–`12` 各篇为准。
> **对照基点**：旧版代码位于仓库 `dev` 分支（tip `5d18df1`），可用 `git show dev:<path>` 查看；新版为当前 `next`。
> **日期**：2026-07-01

## 图例

- 类型：`缺口` 旧有新版无 ／ `默认值` 行为都在但默认不同 ／ `缺陷` 新版自身的问题 ／ `新增` 新版优于或新增的能力
- 成本：`极小` 单点改动 ／ `小` 单文件到单面板 ／ `中` 跨 2–3 个模块或需新增持久化 ／ `大` 需新数据层或新页面级能力
- 状态：`- [ ]` 待定，决定后改为 `- [x] 改` 或 `- [x] 不改`

---

## A. 功能缺口（旧有、新无）

- [ ] **A1 输出档位预设清单**｜缺口｜成本 小
  旧：输出面板「+」下拉固定 10 项——原始图片、1080P 1920×1080、2K 2560×1440、2K 竖屏、4K 3840×2160、4K 竖屏、方图 1080、方图 2048、微信朋友圈 4524×2262、小红书 1280×1706（`dev:src/renderer/src/views/components/panels/co-output-panel.vue:99-111`）
  新：只能手填宽高 + 「添加档位」，默认 2000×2000（`src/features/template/lib/export-preset.ts:4-20`）

- [ ] **A2 「原始图片」档位**｜缺口｜成本 小
  旧：档位带 `isOriginal`，宽高输入禁用、取 EXIF `ImageWidth/Height`，EXIF 就绪后自动回填；「应用全部」时按每张图各自的 EXIF 重算（`co-output-panel.vue:113-134`、`utils/co-pic.tsx:124-134`）
  新：两轴必须手填正数，否则面板报错且导出禁用；Rust 侧已读 `PixelXDimension/PixelYDimension`（`src-tauri/src/exif.rs:191-204`）但无人消费

- [ ] **A3 宽高互换**｜缺口｜成本 极小
  旧：宽高之间 `⇋` 一键交换（`co-output-panel.vue:140-144`）｜新：无

- [ ] **A4 档位排序**｜缺口｜成本 小
  旧：设置页「输出设置」表格支持上移/下移（`dialogs/components/setting-output.vue:19-29`）｜新：只有增删

- [ ] **A5 「存为默认」档位与导出目录**｜缺口｜成本 中
  旧：把当前档位清单 + 目录写进 `config.output.presets/defaultPath`，之后新导入的图片自动套用（`co-output-panel.vue:176-184`、`uses/co-pic.ts:87-99`）
  新：档位只存在会话 store，注释明确不持久化，重开应用回到单个 2000×2000（`src/features/template/store/use-template-store.ts:24-33,67-71`）

- [ ] **A6 档位的「应用全部」**｜缺口｜成本 小
  旧：档位 + 导出目录复制到列表所有图片（`co-output-panel.vue:159-174`）
  新：「应用到其他」的范围枚举只有模板与参数 / 背景，不含档位（`use-template-store.ts:21-22,129-157`）

- [ ] **A7 导出目录入口无效**｜缺口｜成本 小
  旧：面板内显示目录、可更换、可打开；导出前校验并提示「请先前往输出设置导出目录」（`co-output-panel.vue:48-56`、`uses/export.ts:91-100`）
  新：设置页只读展示 `output.default_path`，**导出链路从不读取它**；无目录时单档走保存对话框 → 批量导出 20 张只有 1 档会弹 20 次保存框（`src/features/settings/settings-page.tsx:346-348`、`src/platform/services/export-service.ts:92-98,129-146`）

- [ ] **A8 导出进度与取消**｜缺口｜成本 小-中
  旧：全屏遮罩进度条 + 「正在处理第 n/N 张（文件名）」+ 取消按钮，批量循环每张前检查并中断（`dev:src/renderer/src/components/co-progress/index.vue`、`uses/export.ts:102-133`）
  新：只有按钮 spinner；`cancelExportTask` / `runScheduledExports(onProgress)` 均已就位但无人接线（`export-service.ts:163-173`、`src/core/scheduler/index.ts:4-24`）

- [ ] **A9 「保留 EXIF」开关无效**｜缺口｜成本 小
  旧：设置页有独立开关，默认关闭（`setting-output.vue:35-40`）
  新：`output.retain_exif` 已定义并持久化（`src-tauri/src/config.rs:35,146`），但导出面板硬编码 `preserveExif: true`（`template-export-panel.tsx:130-134`）

- [ ] **A10 dpi 写回**｜缺口｜成本 中
  旧：dpi 取原图 EXIF `XResolution`，JPEG 写 `XResolution/YResolution/ResolutionUnit`，PNG 写 `PixelsPerUnitX/Y`（`uses/export.ts:53-57`、`dev:src/main/utils/capture.ts:88-99`）
  新：`dpi` 恒 72 且仅承载语义，不写入文件（`export-service.ts:175-180` 注释自述）

- [ ] **A11 EXIF 字段级保留**｜缺口｜成本 中-大
  旧：exiftool 合并原图全部 EXIF，剔除尺寸 / Orientation / 缩略图等字段，并写入 `Software: Copicseal v版本`（`dev:src/main/utils/capture.ts:81-111`）
  新：仅 JPEG 做「抽原图 APP1 段 → 原样插回」的段级替换，PNG / WebP 完全不保留（`export-service.ts:194-206`、`src-tauri/src/exif.rs:243-253`）

- [ ] **A12 用户设备库（相机 / 镜头）**｜缺口｜成本 大
  旧：设置页完整 CRUD（设备名 + 类型 + 任意 EXIF 键值对，10 个常用字段按类型筛选），参数面板顶部「相机 / 镜头」下拉选中后弹确认框，可「覆盖当前」或「覆盖全部」（`dev:src/renderer/src/views/components/dialogs/components/setting-user-devices.vue`、`panels/co-props-panel.vue:4-32,124-157`）
  新：数据层齐备（`UserDevice` 结构体 + 持久化 + `user_devices` 字段），但 `src-tauri/src/lib.rs:33` 无任何设备命令，设置页无对应 Tab；唯一相关 UI 是未接线的 mock 组件

- [ ] **A13 EXIF 逐字段编辑与还原**｜缺口｜成本 中-大
  旧：渲染时用 Proxy 收集模板实际用到的 EXIF 键（`usedExifKeys`），参数面板逐字段生成可编辑输入框写入 `modifiedExif`，渲染与导出都用合并值，面板标题有「还原」（`co-render.vue:114-127`、`utils/co-pic.tsx:85-100`、`panels/co-props-panel.vue:34-43`）
  新：EXIF 卡片纯只读，无覆盖、无编辑、无还原（`src/features/template/components/template-exif-card.tsx`）

- [ ] **A14 全局字体选择**｜缺口｜成本 中
  旧：模板面板顶部系统字体下拉 + 刷新按钮，选中即写 `config.fonts.defaultFont` 并套用到每张照片，字体注入画布根与 SVG 水印（`panels/co-tpl-panel.vue:5-16,143-155`、`utils/co-pic.tsx:45`、`views/components/co-render.vue:244`）
  新：无字体 UI；水印字体写死（`templates/watermark.tsx:95,145`）；后端 `listSystemFonts` 命令、`FontConfig` 契约、`fonts.default_font` 默认值均已就位但无消费方

- [ ] **A15 模板预设（保存与复用）**｜缺口｜成本 中
  旧：「存为新配置」（上限 10、名称 2–10 字）/ 应用当前 / 应用全部 / 覆盖配置 / 删除，preset 含 `templateId + templateProps + background + fontFamily`，持久化在 `config.templatePresets`，设置页还能改名排序删除（`dropdowns/co-presets-dropdown.vue`、`dialogs/components/setting-template-presets.vue`）
  新：无；设置页「边框水印」分组是空占位（`settings-page.tsx:789-797`）

- [ ] **A16 素材列表右键菜单**｜缺口｜成本 小
  旧：关闭 / 关闭其他 / 关闭左侧 / 关闭右侧 / 全部关闭（`views/components/co-image-list.vue:41-89`）
  新：全库无 `onContextMenu`，也没有批量移除（provider 只有单个 `removePhoto`）

- [ ] **A17 变量输入 UI**｜缺口｜成本 小-中
  旧：富文本编辑器 + 可点选的变量胶囊，粘贴自动去换行（`dev:src/renderer/src/components/co-vars-input/index.vue`）
  新：纯文本 `Input`；`EXIF_TEXT_VARIABLES` 已导出但无任何 UI 消费（`template-props-panel.tsx:116-121`）

- [ ] **A18 EXIF 信息卡缺字段**｜缺口｜成本 小
  旧：固定 13 项，含「软件」「曝光模式」（`uses/co-pic.ts:103-117`）
  新：9 行（相机合并厂商+型号、拍摄参数合并焦距·光圈·快门·ISO），新增 尺寸 / GPS，缺「软件」「曝光模式」；字段契约也没有 `software` / `exposure_mode`

- [ ] **A19 意见反馈入口**｜缺口｜成本 极小
  旧：菜单项直接打开 GitHub issues/new（`dropdowns/co-menu-dropdown.vue:53,67`）｜新：无

- [ ] **A20 关于页内容**｜缺口｜成本 小
  旧：logo、运行版本号、GitHub / B站 / QQ群 / 微信群、免责声明（`dialogs/co-about-dialog.vue`）
  新：只有产品信息 + 技术栈卡片与更新按钮，不显示版本；`getAppInfo()` 已实现但无消费方；未接线组件里还硬编码 `v0.2.0`（实际 0.5.0）

- [ ] **A21 旧 EXIF 变量名兼容**｜缺口｜成本 极小
  旧：`{ISOSpeedRatings}`、`{DateTimeOriginal}`，可替换任意 EXIF key，缺失时保留占位符（`utils/render.ts:126-134`）
  新：`{ISO}`、`{DateTaken}`，只认 8 个白名单变量，已知变量缺失时替换为空串、未知变量保留（`templates/format-exif-text.ts:4-16,49-57`）→ 沿用旧文案会原样显示占位符

- [ ] **A22 两个整模板缺失**｜缺口｜成本 大
  旧：PS 启动窗模板（裁剪、图片偏移、版权、网址、loading 文案、亚克力、噪点）与老照片时间戳模板（日期格式、九宫格位置、四向偏移、橙色文字、文字光晕、数码字体）（`views/tpls/tpl-default3.vue`、`tpl-default4.vue`）
  新：均无（现有 6 个模板为 minimal / film / whiteframe / rounded / overlay / watermark）

- [ ] **A23 叠字模板的日期格式参数**｜缺口｜成本 小
  旧：`dateFormat` 用 dayjs 格式化，默认 `YYYY-MM-DD HH:mm:ss`（`views/tpls/tpl-default5.vue:87-95,192-194`）｜新：无该参数

- [ ] **A24 圆角模板的排列方向**｜缺口｜成本 小
  旧：有 `direction` 可切横排（`views/tpls/tpl-default2.vue:70-90,225-249`）｜新：`rounded.tsx` 无任何布局参数

- [ ] **A25 保存目录的恢复默认 / 打开 / 迁移**｜缺口｜成本 小
  旧：可恢复默认、点击打开，更换时迁移旧目录内容（`dialogs/components/setting-general.vue:33-69`）｜新：只能「选择」并写配置

- [ ] **A26 拼图页没有粘贴导入**｜缺口｜成本 小
  旧：无粘贴（两页都没有）｜新：模板页有 `window paste` 监听，拼图页没有（`collage-page.tsx` 全文无 paste）

- [ ] **A27 导入格式白名单变窄**｜缺口｜成本 小
  旧：`<input accept="image/*">` 通吃浏览器可解码的图片（`components/co-file-input/index.vue:9`）
  新：仅 jpg / jpeg / png / heic / heif / hif / webp（`src-tauri/src/fs.rs:36`、`src/shared/types/photo.ts:10-18`），gif / bmp / tiff 会被拒

- [ ] **A28 旧配置迁移**｜缺口｜成本 中
  旧：electron-store JSON（`name=config` / `config.dev`）｜新：SQLite `config_entries` 键值表；`src-tauri/src` 内没有读取旧 config 的迁移代码 → 升级后设置全丢（待确认是否有安装器侧迁移）

- [ ] **A29 拼图页三处半成品**｜缺口｜成本 中
  新：60 步 undo/redo（`store/use-collage-store.ts:95-145`）、标注 text/arrow/rect/circle（`store:242-282`）、`layouts.ts` 数十种布局——全部无 UI 入口；工具栏只暴露 2/3/4/6 宫格 + 自动排版 + 自由布局，`COLLAGE_LAYOUT_GROUPS` 无人引用
  旧：无拼图功能，属新版新增能力的未完成部分

- [ ] **A30 收藏 / 最近使用不持久化**｜缺口｜成本 小
  新：组件内 `useState`，初值硬编码 `['minimal','film']` / `['minimal']`，刷新即丢（`template-selector.tsx:30-31`）
  旧：原本没有收藏 / 最近使用功能（仅 `config.fonts.favorites` 字段无 UI），属新版新增但未完成

---

## B. 默认值差异（影响开箱观感）

- [ ] **B1 默认背景模式**｜默认值｜成本 极小
  旧：照片模糊——blur 0.4rem、brightness 100%、padding 上下/左右 0.2rem（`uses/co-pic.ts:61-101`）
  新：无背景（`background.ts:91`；仅 minimal 自带纯色 `#ffffff` + 内边距 0.06）

- [ ] **B2 默认输出档位**｜默认值｜成本 极小
  旧：原始图片（EXIF 尺寸）+ jpeg + 质量 0.8，且优先使用「存为默认」保存的档位（`uses/co-pic.ts:87-98`）｜新：2000×2000 + png + 质量 90

- [ ] **B3 新增档位的默认格式**｜默认值｜成本 极小
  旧：jpeg｜新：png

- [ ] **B4 模板默认参数与编码**｜默认值｜成本 小
  白框：边距 0.04 → 0.006（带 min/max）、文字色 `#000` → `#1a1a1a`、阴影从单字符串改为 blur/color/opacity 三参数、默认文案变量名变化
  圆角：半径 0.1 → 0.015、阴影同上、文字色 `#000` → `#1a1a1a`
  叠字：`layout` 默认 V → auto、`gapScale` 上限 3、offset 量纲换算、新增阴影参数
  水印：文字色 rgba(255,255,255,0.5) → 颜色 + 不透明度、旋转 ×100 编码 → -180~180、尺寸编码变化；旧版不替换变量、空文案仍绘制 → 新版支持变量、空文案不渲染

- [ ] **B5 品牌 / 机型归一化细节**｜默认值｜成本 小
  旧：Logo 先按 Model 命中再按 Make（`utils/render.ts:114-123`）｜新：先 Make 再 Model（`templates/brand.ts:109-118`）；另外 Rust 侧 `normalize_brand` 会先归一化一次再被前端二次改写（`src-tauri/src/exif.rs:79-114`）

---

## C. 新版缺陷（自身问题，与旧版无关）

- [ ] **C1 模板页头部「导出」是死按钮**｜缺陷｜成本 极小
  有图标与文字、没有 `onClick`（`src/features/template/components/template-page.tsx:92-97`）；真正的导出入口在右侧属性面板底部

- [ ] **C2 拼图素材拖入画布无效**｜缺陷｜成本 极小
  素材卡标了 `draggable` 但没有任何 `onDragStart` / `setData`，画布却在读 `text/copicseal-photo-id`；UI 文案「拖到上方画布即可放入拼图」实际不生效，只能点空槽填充（`collage-page.tsx:145,192-194`、`collage-canvas.tsx:245-256`）

- [ ] **C3 拼图「批量导出」重复导出同一张**｜缺陷｜成本 小
  `items: photos` 但 runner 忽略 `item`，对同一张画布导出 N 次；且未传 context → `baseName` 固定 `copicseal-export`、无导出目录 → 连弹 N 次保存框写同名文件（`collage-page.tsx:261-278`）

- [ ] **C4 前端入口仍是脚手架残留**｜缺陷｜成本 极小
  `index.html` 的 `<title>Tauri + React + Typescript</title>` 与 favicon `/vite.svg`

---

## D. 新版更优或新增（建议保持）

- 缩略图后台生成（320px JPEG、2 线程、`.part` 原子替换）+ 未就绪占位
- 导入进度（百分比 + 当前文件名）
- 三层磁盘缓存 + 设置页清理入口 + 启动自动清理 + 在用素材保留名单
- 删除素材后当前项 clamp（旧版删左侧项会跳错）
- 导出重名追加 `-2/-3`（旧版直接覆盖）；档位不完整时跳过并提示数量
- 窗口边框模式切换（系统边框 / 无边框）
- 应用内更新下载与安装 + 进度（旧版只能跳外链下载）
- 模板页面板内的「模板与参数 / 背景分别应用到其他照片」
- 导出按档位精确输出、预览铺满预览区且 `100%` = 照片原始宽度（本轮已确认并对齐）
- 纯色背景的照片主题色盘（本轮已实现）

---

## E. 待拍板的产品决策

- [ ] **E1 模板构成**：新增 minimal / film、去掉 PS 启动窗与老照片时间戳——有意取舍还是待补齐（见 A22）？
- [ ] **E2 拼图页整体是新增能力**（旧版没有）——确认作为长期产品扩展保留？
- [ ] **E3 EXIF 变量策略**：是否保留旧变量名别名（A21）、缺失值是替换为空串还是保留占位符？
- [ ] **E4 三个默认值**（B1 背景 / B2 档位 / B3 格式）是否回退到旧版观感？
- [ ] **E5 「看似完成实则不可用」的字段**：`theme`、`language`、`template_presets`、`fonts.default_font`、`user_devices`、`output.retain_exif`、`device_id`、能力位 `system.tray: true`——排期未做还是设计上废弃？建议要么接线要么删除，避免配置契约与实现长期不一致
- [ ] **E6 单实例与全局快捷键**：旧版也没有 → 确认不补

---

## 建议动手顺序（感知 / 成本比）

1. **C 组四个缺陷**——几乎零成本，用户立刻能碰到
2. **A1 + A2 + A3**：档位预设清单、原始图片档位、宽高互换
3. **A9 + A7 + A8**：保留 EXIF 开关、导出目录接通、导出进度与取消（链路均已支持，属接线工作）
4. **A14 → A15 + A5**：全局字体；模板预设与「存为默认」（同一个持久化动作，建议一起做）
5. **B1 / B2 / B3**：默认值回退，改动极小但影响所有老用户观感，需先确认
6. **A12 + A13**：用户设备与 EXIF 覆盖，最重，建议单独立项
