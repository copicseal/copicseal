# 08 — 旧版需求提取

> 来源：旧项目 `/Users/kohai/projects/git/copicseal/copicseal`（Electron + Vue 3，v0.3.9）
> 用途：新 Tauri + React 重构的功能参考基准
> 日期：2026-06-06

---

## 1. 产品概述

Copicseal 是一个**图片加相框水印工具**，支持读取 EXIF 信息，快速为照片添加快门、ISO 等相机参数。

| 维度 | 旧版 | 新版目标 |
|------|------|---------|
| 框架 | Electron + Vue 3 + Element Plus | Tauri 2 + React 19 + shadcn/ui |
| 样式 | UnoCSS + Sass | Tailwind CSS 4 |
| 语言 | TypeScript | TypeScript + Rust |
| 包管理 | npm | pnpm |
| 渲染引擎 | Puppeteer (Chromium) | 待定（Canvas / Tauri Rust） |

---

## 2. 完整功能清单

### 2.1 照片导入

| 功能 | 旧版实现 | 依赖 |
|------|---------|------|
| 拖拽导入 | `@electron-toolkit/preload` + HTML5 drag-drop | electron |
| 文件选择导入 | 自定义 `co-file-input` 组件 | — |
| 批量导入 | 支持多选 | — |
| 格式支持 | JPEG, PNG, HEIC, WebP | — |
| HEIC 转 PNG | `heic-to` 库，自动转换预览 | heic-to |
| 色彩调色板 | `colorthief` 提取主色调 | colorthief |

### 2.2 EXIF 元数据

| 功能 | 旧版实现 | 数据流 |
|------|---------|--------|
| EXIF 读取 | `exifreader` (前端) + `exiftool-vendored` (Node 端) | 前端解析，Node 端读写 |
| 相机品牌识别 | 25+ 品牌映射（Sony α, Nikon ℤ 等） | 品牌名正则匹配 |
| 品牌 Logo | SVG 格式，自动适配明暗模式 | `src/renderer/src/assets/logos/*.svg` |
| EXIF 写入 | `exiftool-vendored` 在导出时写入 DPI + 原图 EXIF | Node 端 |
| EXIF 保留开关 | `config.output.retainExif` 控制 | 导出时清理敏感字段 |
| 设备数据库 | 用户自定义相机/镜头，CSV 导入 | `config.userDevices[]` |
| 文本变量 | `{FocalLength}`, `{ISO}` 等模板语法 | wangeditor 编辑器 |

**支持的 EXIF 字段（14+）**：
FNumber, ISO, FocalLength, ExposureTime, Make, Model, LensModel, DateTimeOriginal, Flash, WhiteBalance, ExposureProgram, MeteringMode, GPS 信息等。

**品牌 Logo 列表（25 品牌）**：
Apple, Canon, DJI, Google, GoPro, Hasselblad, Huawei, Insta360, Leica, Lumix, Nikon, Nokia, Olympus, OnePlus, OPPO, Pentax, Ricoh, Samsung, Sigma, Sony, Vivo, Xiaomi, Xuzhou, Zeiss。

### 2.3 模板系统

| 功能 | 旧版实现 |
|------|---------|
| 内置模板 | 6 套 Vue SFC (`src/views/tpls/tpl-default*.vue`) |
| 模板属性 | 每个模板定义 props：边框颜色、圆角、阴影、Logo 颜色、字体大小、文本间距等 |
| 模板选择器 | 下拉菜单，切换即渲染 (`co-tpl-panel.vue`) |
| 模板预设 | 命名保存/加载/删除 (`co-presets-dropdown.vue`) |
| 模板属性编辑 | `co-props-panel.vue` 动态渲染 props 表单 |
| 远程模板库 | manifest.json → 分组 → 单 JSON 下载 (plan-0.5.0) |
| 远程模板格式 | `{ id, name, code (Vue IIFE), style, signature }` |
| 签名验证 | Ed25519 + 远程公钥 (`template-loader.ts`) |
| 内置/远程双轨 | `useTemplateRegistry()` 统一注册表 |

### 2.4 导出系统

| 功能 | 旧版实现 |
|------|---------|
| 输出格式 | JPEG, PNG, WebP（`co-output-panel.vue`） |
| 多规格 | 宽度 × 高度 × 缩放 × 质量滑块 |
| 原始尺寸 | 用 EXIF 尺寸 (`width: 0, height: 0` 或 `isOriginal`) |
| 导出预设 | 命名保存/加载/删除 (`exportPresets[]`) |
| 批量导出 | 遍历全部照片 × 全部规格 (`handleExportAll`) |
| 进度条 | `co-progress` 组件（当前文件、计数、百分比） |
| 导出取消 | `progress.visible = false` 中断链 |
| 文件命名 | `{filename}@{width}x{height}.{ext}` |
| DPI 写入 | PNG: PixelsPerUnit (meters), JPEG: XResolution (inches) |
| 导出路径 | 系统目录选择器 (`openDirectoryDialog`) |
| 打开文件夹 | `shell.showItemInFolder` / `shell.openPath` |
| 渲染引擎 | Puppeteer + `puppeteer-in-electron`（HTML → Image） |
| HTML 生成 | `co-render` DOM 捕获 → 注入样式 → Puppeteer screenshot |

### 2.5 背景样式

| 功能 | 旧版实现 |
|------|---------|
| 无背景模式 | 透明 PNG |
| 纯色背景 | 颜色选择器 + 边距配置 (`Settings.background.color`) |
| 图片背景 | 自定义 URL + CSS 滤镜 (`Settings.background.image`) |
| 滤镜 | blur, brightness, contrast, grayscale, hue-rotate, invert, saturate |
| 响应式 | 明暗模式不同样式、横竖版不同样式 |

### 2.6 字体系统

| 功能 | 旧版实现 |
|------|---------|
| 系统字体枚举 | `font-list` 库 (Node 端) + `getSysFonts` IPC |
| 字体选择器 | `co-tpl-panel.vue` 中的下拉列表 |
| 收藏字体 | `config.fonts.favorites[]` |
| 默认字体 | `config.fonts.defaultFont` |
| 字体实时预览 | 选择即更新渲染 |

### 2.7 设置面板

旧版使用 `el-dialog` 容器 + `el-tabs` 分栏：

| Tab | 组件 | 功能 |
|-----|------|------|
| 通用 | `setting-general.vue` | 保存目录、语言/主题切换 |
| 输出 | `setting-output.vue` | 导出预设管理 |
| 模板预设 | `setting-template-presets.vue` | 模板预设管理 |
| 模板库 | `setting-template-library.vue` | 远程模板下载/启用/禁用 |
| 用户设备 | `setting-user-devices.vue` | 设备数据库 CRUD |

另有独立弹窗：`co-about-dialog.vue`（关于）、`co-check-update-dialog.vue`（更新）。

### 2.8 系统集成

| 功能 | 旧版实现 |
|------|---------|
| 目录选择器 | Electron `dialog.showOpenDialog` |
| 右键菜单 | 自定义 `showCtxMenu` IPC（通过 `Menu.buildFromTemplate`） |
| 窗口尺寸 | 默认 900×670（与新版一致） |
| 响应式布局 | CSS 媒体查询 + JS resize 监听 |
| 自动更新 | `electron-updater` + `electron-builder` |
| 版本号 | `app.getVersion()` |
| 更新日志 | `co-check-update-dialog.vue` |

### 2.9 存储系统

| 功能 | 旧版实现 |
|------|---------|
| 配置存储 | `electron-store`，key: `config`，JSON 序列化 |
| 持久化 | 自动保存（watch deep） |
| 保存目录 | `~/Documents/Copicseal` 默认，可自定义 |
| 目录迁移 | `manageSaveDirectory` 移动旧目录文件到新目录 |
| 模板存储 | `{saveDirectory}/templates/index.json` + `*.json` |

---

## 3. 组件/页面架构

```
src/renderer/src/
├── App.vue                              # 根组件
├── views/
│   ├── co-mark.vue                      # 水印标记页面 (主页面?)
│   ├── components/
│   │   ├── co-main.vue                  # 主布局
│   │   ├── co-side.vue                  # 侧边栏（照片列表）
│   │   ├── co-menu.vue                  # 顶部菜单
│   │   ├── co-image-view.vue            # 图片预览
│   │   ├── co-image-list.vue            # 照片列表
│   │   ├── co-render.vue                # 渲染区（HTML 模板渲染）
│   │   ├── panels/
│   │   │   ├── co-tpl-panel.vue         # 模板选择 + 字体
│   │   │   ├── co-props-panel.vue       # 模板属性编辑
│   │   │   ├── co-output-panel.vue      # 导出设置
│   │   │   ├── co-bg-panel.vue          # 背景设置
│   │   │   └── co-info-panel.vue        # EXIF 信息
│   │   ├── dropdowns/
│   │   │   ├── co-menu-dropdown.vue     # 菜单下拉
│   │   │   └── co-presets-dropdown.vue  # 预设下拉
│   │   └── dialogs/
│   │       ├── co-settings-dialog.vue   # 设置弹窗
│   │       ├── co-about-dialog.vue      # 关于弹窗
│   │       └── co-check-update-dialog.vue # 更新弹窗
│   ├── tpls/
│   │   ├── tpl-default.vue              # 模板1: 白色边框
│   │   ├── tpl-default2.vue             # 模板2: 无框圆角
│   │   ├── tpl-default3.vue             # 模板3.0: PS启动窗(横)
│   │   ├── tpl-default4.vue             # 模板3.1: PS启动窗(竖)
│   │   ├── tpl-default5.vue             # 模板4
│   │   └── tpl-default6.vue             # 模板5
│   └── ...
├── components/
│   ├── co-button/                       # 通用按钮
│   ├── co-input/                        # 通用输入 (含 color-input, shadow-input, pos9-input)
│   ├── co-file-input/                   # 文件输入
│   ├── co-radio-group/                  # 单选组
│   ├── co-progress/                     # 进度条
│   ├── co-settings-panel/               # 折叠设置面板
│   ├── co-vars-input/                   # 模板变量输入 (wangeditor)
│   └── co-digital-7/                    # 数码管字体组件
├── uses/
│   ├── config.ts                        # 全局配置 composable
│   ├── co-pic.ts                        # 照片管理 composable
│   ├── common.ts                        # 通用 composable
│   ├── export.ts                        # 导出逻辑 composable
│   ├── progress.ts                      # 进度 composable
│   └── template-registry.ts             # 模板注册表 composable
└── utils/
    ├── template-loader.ts               # 远程模板编译 + 签名验证
    ├── render.ts                         # 渲染工具
    ├── exif.ts                           # EXIF 工具
    ├── storage.ts                        # 持久化存储
    ├── common.ts                         # 通用工具
    ├── element.ts                        # Element Plus 封装
    └── sfc.ts                            # SFC 工具
```

### 后端进程（主进程）

```
src/main/
├── index.ts                             # Electron 入口
├── handles.ts                           # IPC 处理器注册
└── utils/
    ├── capture.ts                        # Puppeteer 截图
    ├── exif.ts                           # EXIF 合并/清理
    ├── file.ts                           # 文件/文件夹操作
    ├── font.ts                           # 系统字体枚举
    ├── storage.ts                        # electron-store 封装
    ├── template.ts                       # 模板文件读写
    └── updater.ts                        # 版本/更新
```

### IPC 接口清单

| 通道 | 方向 | 参数 | 返回 |
|------|------|------|------|
| `captureDOM` | renderer→main | `{ html, dpi, exif, retainExif, output[] }` | `string[]` (路径) |
| `openDirectoryDialog` | renderer→main | — | `string` |
| `showCtxMenu` | renderer→main | `MenuItemConstructorOptions[]` | `string` (id) |
| `openTargetPath` | renderer→main | `string` | — |
| `getSysFonts` | renderer→main | — | `string[]` |
| `getAppVersion` | renderer→main | — | `string` |
| `manageSaveDirectory` | renderer→main | `newDir?, oldDir?` | `string` |
| `config:get` | renderer→main | `key, defaultValue?` | `any` |
| `config:set` | renderer→main | `key, value` | — |
| `config:delete` | renderer→main | `key` | — |
| `template:read` | renderer→main | `saveDirectory` | `DownloadedTemplate[]` |
| `template:write` | renderer→main | `templateData, saveDirectory` | — |
| `template:readFile` | renderer→main | `templateId, saveDirectory` | `object` |
| `template:delete` | renderer→main | `templateId, saveDirectory` | — |

---

## 4. 数据模型

### AppConfig

```typescript
interface AppConfig {
  output: {
    presets: Output[];       // 常用导出尺寸
    defaultPath: string;     // 默认导出路径
    retainExif?: boolean;    // 保留 EXIF
  };
  templatePresets: TemplatePreset[];
  fonts: {
    favorites: string[];
    defaultFont: string;
  };
  exportPresets: ExportPreset[];
  templateList: {
    enabled: { templateId: string; name: string }[];
    installedDir: string;
    remoteRegistry: TemplateRegistry[];
  };
  userDevices: UserDevice[];
  saveDirectory?: string;
}
```

### 关键类型

```typescript
interface Output {
  scale: number;
  type?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  width: number;
  height: number;
  isOriginal?: boolean;
}

interface Settings {
  background: {
    mode: 'none' | 'color' | 'image';
    padding?: [number, number];
    color?: { rgba: string };
    image?: { customUrl?: string; filters?: ImageFilter[] };
    style?: Style;  // 明暗/横竖版分风格
  };
  outputs: Output[];
  outputPath?: string;
}

interface TemplatePreset {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  description: string;
  templateProps?: Record<string, any>;
  background?: Settings['background'];
  fontFamily?: string;
}

interface TemplateRegistry {
  id: string;
  name: string;
  url: string;           // manifest.json URL
  isDefault?: boolean;   // 官方库不可删除
}

interface UserDevice {
  id: string;
  name: string;
  type: 'camera' | 'lens';
  exif: Record<string, string>;
}
```

---

## 5. 渲染管线（旧版）

```
用户选择模板 + 照片
  → Vue 渲染模板组件（props = 模板属性 + EXIF 数据）
  → co-render.vue 生成 DOM
  → 用户调整属性（co-props-panel）→ [响应式更新 DOM]
  → 用户点击导出
  → useExport() 提取 DOM HTML + 样式
  → 注入内联样式 + 计算 rem
  → IPC → Puppeteer setContent + screenshot
  → exiftool 写入 DPI + 原图 EXIF
  → 输出文件
```

---

## 6. 技术栈对比

| 维度 | 旧版 | 新版 |
|------|------|------|
| 框架 | Electron 31 | Tauri 2 |
| 前端 | Vue 3.4 | React 19 |
| UI库 | Element Plus 2.9 | shadcn/ui + Radix |
| 样式 | UnoCSS + Sass | Tailwind CSS 4 |
| 图标 | Iconify (mdi/solar) | lucide-react |
| 富文本 | wangeditor 5 | 待定 |
| EXIF 读取 | exifreader + exiftool-vendored | 待定（Rust kamadak-exif?） |
| 渲染引擎 | Puppeteer (Chromium) | 待定（Canvas / Rust image?） |
| 字体枚举 | font-list (Node) | 待定（Rust font-kit） |
| 取色 | colorthief | 待定 |
| 配置存储 | electron-store | 待定（Tauri fs + serde_json） |
| 自动更新 | electron-updater | tauri-plugin-updater |
| Lint | ESLint + Prettier | Biome |
| 包管理 | npm | pnpm |

---

## 7. 待评估的架构决策

| # | 决策点 | 旧版方案 | 新方案候选 |
|---|--------|---------|-----------|
| 1 | 渲染引擎 | Puppeteer (Chromium) | Canvas API / Rust image crate |
| 2 | EXIF 读取 | exifreader (JS) | Rust crate (kamadak-exif / rexif) |
| 3 | 模板格式 | Vue SFC + IIFE | React 组件 / JSON schema |
| 4 | 富文本编辑 | wangeditor | 待定（Tiptap / Slate?） |
| 5 | 字体枚举 | font-list (Node) | Rust font-kit |
| 6 | 取色 | colorthief (JS, Canvas) | Rust / Canvas API |
| 7 | 配置存储 | electron-store (JSON) | Tauri fs + serde_json |
