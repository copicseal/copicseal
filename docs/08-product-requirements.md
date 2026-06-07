# 08 — 产品需求规格

> Copicseal Tauri 需要实现的完整功能需求
> 版本：v1.0 | 日期：2026-06-06

---

## 1. 产品定义

Copicseal 是一款摄影后期批处理桌面工具，为照片添加包含相机参数信息的相框水印。

### 1.1 核心工作流

```
导入照片 → 查看 EXIF → 选择模板 → 自定义样式 → 配置导出规格 → 导出
```

### 1.2 目标用户

摄影爱好者、社交媒体内容创作者，需要对照片批量添加统一风格的相机参数水印。

---

## 2. 照片导入

### 2.1 支持的格式

| 格式 | 说明 |
|------|------|
| JPEG | 完全支持 |
| PNG | 支持透明背景 |
| HEIC | 自动转换为 PNG 后处理 |
| WebP | 现代格式支持 |

### 2.2 导入方式

- 拖拽照片文件到应用窗口
- 点击导入按钮打开系统文件选择器
- 支持批量导入多张照片

### 2.3 导入后处理

- 生成预览缩略图 URL
- 提取 EXIF 元数据
- 提取照片色彩调色板
- HEIC 格式自动转为 PNG 显示

---

## 3. 照片管理

### 3.1 照片列表

- 左侧缩略图列表展示当前会话所有照片
- 点击缩略图切换当前编辑的照片
- 当前选中的照片有高亮边框标识
- 支持从会话中移除照片（不删除原文件）
- 支持继续追加照片到会话

### 3.2 实时预览

- 中央区域实时渲染当前照片 + 模板的合成效果
- 修改模板属性后即时刷新预览
- 修改背景样式后即时刷新预览
- 修改字体后即时刷新预览
- 支持预览缩放功能
- 支持横版 / 竖版预览切换

### 3.3 照片独立状态

每张照片独立维护：原始文件引用、EXIF 元数据、选中的模板及属性、导出规格、背景样式、字体选择。

支持全局默认设置和单张照片独立设置两种模式。

---

## 4. EXIF 元数据

### 4.1 EXIF 读取

自动读取照片的 EXIF 元数据，至少包含以下字段：

| 分类 | 字段 |
|------|------|
| 拍摄参数 | 光圈 (FNumber)、快门速度 (ExposureTime)、ISO、焦距 (FocalLength) |
| 设备信息 | 相机品牌 (Make)、相机型号 (Model)、镜头型号 (LensModel) |
| 时间信息 | 拍摄时间 (DateTimeOriginal) |
| 其他 | 闪光灯 (Flash)、白平衡 (WhiteBalance)、曝光程序、测光模式、GPS 信息 |

### 4.2 相机品牌

- 自动识别相机品牌并格式化为友好名称（如 "Sony α"、"Nikon ℤ"）
- 支持 25+ 个相机品牌 Logo 显示（SVG 格式，自动适配明暗模式）
- 品牌列表：Apple, Canon, DJI, Google, GoPro, Hasselblad, Huawei, Insta360, Leica, Lumix, Nikon, Nokia, Olympus, OnePlus, OPPO, Pentax, Ricoh, Samsung, Sigma, Sony, Vivo, Xiaomi, Zeiss 等

### 4.3 EXIF 编辑

- EXIF 字段可手动编辑（补充或修正元数据）
- 用户可创建自定义相机/镜头设备数据库
- 设备数据库支持增删改查

### 4.4 文本模板变量

支持在模板中使用 EXIF 变量语法：
- `{FocalLength}` — 焦距
- `{FNumber}` — 光圈
- `{ISO}` — ISO
- `{ExposureTime}` — 快门速度
- `{Make}` — 相机品牌
- `{Model}` — 相机型号
- `{LensModel}` — 镜头型号
- `{DateTimeOriginal}` — 拍摄时间

### 4.5 导出时 EXIF 处理

- 可选择保留或移除原图 EXIF 信息
- 导出时写入应用版本信息 (Software)

---

## 5. 模板系统

### 5.1 内置模板

- 提供 6 套内置模板（白色边框、无框圆角、PS 启动窗等）
- 每套模板有不同的视觉风格和可配置属性

### 5.2 模板属性

每个模板可自定义以下属性：
- 边距 (Padding / Margin)
- 边框颜色 (Border Color)
- 圆角 (Border Radius)
- 阴影 (Box Shadow)
- 字体大小 (Font Size)
- 文字行间距
- Logo 颜色
- 排版方向（自动 / 横版 / 竖版）

### 5.3 模板预设

- 可保存当前模板属性配置为预设（命名保存）
- 支持加载已保存的预设
- 支持删除预设

### 5.4 远程模板

- 支持对接远程模板注册表（manifest.json）
- 浏览远程模板列表、预览、下载
- 远程模板签名验证（Ed25519）
- 已下载模板可启用或禁用
- 支持自定义模板注册表 URL
- 至少保留一个模板处于启用状态
- 远程模板代码安全加载（沙箱执行）

### 5.5 模板注册表格式

```json
{
  "id": "registry-id",
  "name": "模板库名称",
  "version": "1.0.0",
  "groups": [
    {
      "id": "group1",
      "name": "分组名称",
      "templates": [
        { "id": "tpl-001", "name": "模板名称", "url": "./templates/tpl-001.json" }
      ]
    }
  ]
}
```

---

## 6. 导出系统

### 6.1 输出格式

- JPEG（可调质量）
- PNG（支持透明背景）
- WebP（可调质量）

### 6.2 输出规格

- 支持配置多个输出规格（宽度 × 高度 × 缩放比例 × 质量）
- "原始尺寸"模式：使用照片 EXIF 原始尺寸
- 导出规格可保存为预设（命名保存/加载/删除）

### 6.3 批量导出

- 支持多张照片 × 多个规格的批量导出
- 进度条显示：当前文件名、完成数量/总数、百分比
- 支持取消导出（当前文件完成后停止）

### 6.4 文件命名与 DPI

- 导出文件命名格式：`{原始文件名}@{宽度}x{高度}.{格式}`
- 支持设置 DPI 并在导出时写入（PNG 和 JPEG 不同方式）
- 导出路径通过系统目录选择器配置

### 6.5 导出后操作

- 打开导出目标文件夹

---

## 7. 背景样式

### 7.1 背景模式

| 模式 | 说明 |
|------|------|
| 无背景 | 透明 PNG 输出 |
| 纯色背景 | 颜色选择器 + 边距设置 |
| 图片背景 | 自定义图片 URL + CSS 滤镜 |

### 7.2 背景滤镜

支持以下 CSS 滤镜：
- 模糊 (Blur)
- 亮度 (Brightness)
- 对比度 (Contrast)
- 灰度 (Grayscale)
- 色相 (Hue-Rotate)
- 反转 (Invert)
- 饱和度 (Saturate)

### 7.3 响应式背景

- 明暗模式可配置不同的背景样式
- 横版和竖版可配置不同的背景样式
- 优先级：横竖版 > 明暗 > 默认

---

## 8. 字体系统

- 枚举系统已安装的字体
- 字体列表搜索和过滤
- 选择字体后实时预览效果
- 支持收藏常用字体
- 支持设置默认字体
- 回退字体链：用户选择字体 → 系统字体 → sans-serif

---

## 9. 全局配置

### 9.1 用户设置

- 语言切换
- 明暗主题切换
- 默认保存目录配置
- EXIF 保留开关

### 9.2 配置管理

- 导出预设管理界面
- 模板预设管理界面
- 字体收藏管理界面
- 设备数据库管理界面

### 9.3 设备数据库

- 自定义相机/镜头信息的增删改查
- 支持导入/导出设备数据

---

## 10. 文件与存储

### 10.1 保存目录

- 默认保存目录：`~/Documents/Copicseal`
- 首次启动自动创建
- 用户可自定义保存目录
- 更换保存目录时迁移已有文件

### 10.2 配置持久化

- 应用配置以 JSON 格式持久化存储
- 配置修改后自动保存
- 首次启动时初始化默认配置

### 10.3 设备标识

- 生成和维护唯一的设备 ID

---

## 11. 系统集成

### 11.1 窗口

- 默认窗口尺寸：900 × 670 像素
- 最小窗口尺寸：700 × 500 像素
- 标题栏显示应用名称 "Copicseal"
- 响应式布局适配窗口大小变化

### 11.2 右键菜单

- 支持自定义右键上下文菜单
- 菜单项可动态配置

### 11.3 文件系统

- 调用系统原生目录选择器
- 在系统资源管理器中打开文件/文件夹

### 11.4 应用更新

- 获取当前应用版本号
- 检查服务器是否有新版本
- 展示更新日志
- 自动更新支持（基础配置）

---

## 12. UI 布局

### 12.1 编辑器页面

```
┌──────────────────────────────────────────────────────┐
│  [添加照片]  3 张照片                  [导出] [设置]  │  ← 顶部工具栏
├──────────┬───────────────────────┬───────────────────┤
│  photo1  │                       │  [EXIF]           │
│  ┌────┐  │                       │  ┌─────────────┐  │
│  │    │  │                       │  │ 相机: Sony α │  │
│  └────┘  │      预览区域          │  │ 光圈: f/2.8  │  │
│  photo2  │                       │  │ ...          │  │
│  ┌────┐  │                       │  └─────────────┘  │
│  │    │  │                       │                   │  ← 右侧控制面板
│  └────┘  │                       │  [模板]            │  (Tab 切换)
│  photo3  │                       │  ┌─────────────┐  │
│  ┌────┐  │                       │  │ 模板选择器   │  │
│  │    │  │                       │  │ 属性编辑     │  │
│  └────┘  │                       │  └─────────────┘  │
│          │                       │                   │
│          │                       │  [背景] [字体]    │
│          │                       │  [导出设置]       │
├──────────┴───────────────────────┴───────────────────┤
│  左侧照片列表    中央预览区         右侧控制面板        │
└──────────────────────────────────────────────────────┘
```

### 12.2 设置页面（独立弹窗或页面）

```
┌───────────────────────────────────────────────┐
│  设置                                    [✕]  │
│  ┌──────┬────────┬────────┬────────┬──────┐   │
│  │ 通用  │  输出  │ 模板预设 │ 模板库  │ 设备 │   │  ← Tabs
│  └──────┴────────┴────────┴────────┴──────┘   │
│                                               │
│  [当前 Tab 内容]                                │
│                                               │
└───────────────────────────────────────────────┘
```

### 12.3 右侧控制面板

编辑器右侧为垂直 Tab 切换的控制面板，使用图标 + 文字的列表形式，每个 Tab 对应一个功能面板：

```
┌─────────────────────┐
│ 📷 照片信息   ▶     │  ← 当前展开的 Tab（高亮）
│ 🎨 模板       ▷     │
│ 🖼️ 背景       ▷     │
│ 🔤 字体       ▷     │
│ 📤 导出       ▷     │
├─────────────────────┤
│                     │
│  当前 Tab 的        │
│  面板内容展开区      │  ← 可滚动
│                     │
└─────────────────────┘
```

**交互规则**：
- 点击 Tab 展开对应面板，其他 Tab 折叠
- 同一时间只有一个面板展开
- 面板内容过长时内部滚动
- Tab 列表垂直排列，面板内容在 Tab 列表下方

#### 12.3.1 照片信息 Tab（EXIF）

展开后显示当前选中照片的 EXIF 信息：

- **相机品牌 Logo**：顶部显示对应品牌的 SVG 图标
- **设备信息区**：相机型号、镜头型号（可编辑）
- **拍摄参数区**：光圈、快门、ISO、焦距、曝光补偿（只读）
- **其他信息**：拍摄时间、白平衡、测光模式（只读）
- **GPS 信息**：经纬度（如有）
- **空状态**：无 EXIF 数据时提示"未读取到 EXIF 信息"
- **字段可编辑**：用户可点击相机/镜头字段手动修改，修改后在渲染中即时生效

#### 12.3.2 模板 Tab

展开后分为上下两个区域：

**模板选择区**（上半部分）：
- 模板缩略图列表（网格布局，2-3 列）
- 内置 6 个模板始终显示
- 已下载的远程模板追加在后面，标记"远程"角标
- 当前选中模板有蓝色边框高亮
- 悬停显示模板名称 tooltip

**属性编辑区**（下半部分）：
- 根据当前模板动态渲染属性表单
- 常见属性控件：颜色选择器、数值输入/滑块、下拉选择、开关
- 属性列表项：排版方向、边距、边框色、文字颜色、字体缩放、Logo 颜色、阴影、行间距等
- 修改任意属性后预览即时刷新

**预设操作**：
- "保存为预设"按钮 → 弹窗输入名称
- "加载预设"下拉 → 列出已保存预设
- "删除预设"按钮（确认提示）

#### 12.3.3 背景 Tab

- **模式选择器**：Segmented Control（无 / 纯色 / 图片）
  - 选择"无"时其他选项隐藏
  - 选择"纯色"时显示颜色选择器 + 边距滑块
  - 选择"图片"时显示 URL 输入框 + 滤镜区

- **颜色选择器**（纯色模式）：带透明度拾取
- **边距配置**（纯色模式）：水平边距 + 垂直边距，两个数值滑块
- **图片 URL 输入**（图片模式）：文本框 + 预览缩略图
- **滤镜区**（图片模式）：
  - 7 个滤镜各一个滑块：模糊、亮度、对比度、灰度、色相、反转、饱和度
  - 每个滑块有数值显示 + 重置按钮
- **分场景配置**：展开"高级"后可分别设置暗色模式、横版模式的独立背景样式

#### 12.3.4 字体 Tab

- **搜索框**：输入过滤系统字体列表
- **字体列表**：垂直滚动列表，每项显示字体名（以该字体渲染）
- **收藏操作**：每项右侧有星标按钮，点击切换收藏状态
- **分类标签**：全部 / 已收藏 / 中文字体 / 英文等宽
- **默认字体**：顶部显示当前默认字体名 + 修改按钮
- **字体预览**：选中字体后中部显示"预览文字"卡片，使用该字体渲染

#### 12.3.5 导出 Tab

- **格式选择**：Radio Group（JPEG / PNG / WebP）
- **尺寸配置**：
  - 宽度输入 + 高度输入（联动或独立）
  - "原始尺寸"开关 → 勾选后宽高输入禁用
- **缩放滑块**：0.5x – 3.0x
- **质量滑块**：JPEG/WebP 时显示，1-100
- **DPI 设置**：数值输入 + 预设快捷选项（72/150/300）
- **导出预设**：下拉选择已保存预设 + "另存为预设"按钮 + "删除"按钮
- **导出路径**：
  - 显示当前导出目录（可点击打开选择器）
  - "打开文件夹"图标按钮
- **导出按钮**（主要操作）：
  - "导出当前"（蓝色主按钮）
  - "批量导出全部"（次要按钮）
- **进度条**（导出过程中显示）：
  - 文件名 + 当前/总数 + 百分比
  - "取消"按钮

---

## 13. 数据模型

### 13.1 照片对象 (Photo)

```typescript
interface Photo {
  id: string;           // 唯一标识
  name: string;         // 文件名
  path: string;         // 文件路径
  size: number;         // 文件大小 (bytes)
  mimeType: string;     // MIME 类型
  previewUrl: string;   // 预览 URL
  isHeic: boolean;      // 是否 HEIC 格式
  exif?: PhotoExif;     // EXIF 数据
  templateId?: string;  // 选中模板 ID
  templateProps?: Record<string, unknown>; // 模板属性
  settings: PhotoSettings; // 照片级设置
}
```

### 13.2 EXIF 数据 (PhotoExif)

```typescript
interface PhotoExif {
  make?: string;
  model?: string;
  lensModel?: string;
  fNumber?: number;
  exposureTime?: string;
  iso?: number;
  focalLength?: string;
  dateTimeOriginal?: string;
  flash?: string;
  whiteBalance?: string;
  exposureProgram?: string;
  meteringMode?: string;
  gps?: { latitude: number; longitude: number };
  imageWidth?: number;
  imageHeight?: number;
  xResolution?: number;
  yResolution?: number;
}
```

### 13.3 模板 (Template)

```typescript
interface Template {
  id: string;
  name: string;
  description?: string;
  mode: 'builtin' | 'remote';  // 内置 / 远程
  source?: string;              // 远程模板库名称
  props: TemplateProp[];        // 可配置属性
  component: () => JSX.Element; // 渲染组件
}

interface TemplateProp {
  key: string;
  label: string;
  type: 'color' | 'number' | 'select' | 'slider';
  default: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
}
```

### 13.4 导出规格 (OutputSpec)

```typescript
interface OutputSpec {
  id?: string;
  name?: string;
  type: 'jpeg' | 'png' | 'webp';
  width: number;
  height: number;
  scale: number;
  quality: number;     // 0-1
  isOriginal?: boolean; // 使用原始尺寸
}
```

### 13.5 应用配置 (AppConfig)

```typescript
interface AppConfig {
  saveDirectory: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  output: {
    presets: OutputSpec[];
    defaultPath: string;
    retainExif: boolean;
  };
  fonts: {
    favorites: string[];
    defaultFont: string;
  };
  templatePresets: TemplatePreset[];
  templateList: {
    enabled: { templateId: string; name: string }[];
    remoteRegistry: TemplateRegistry[];
  };
  userDevices: UserDevice[];
}
```

---

## 14. 技术实现要点

### 14.1 模板组件化

模板基于 React 函数组件实现，一个模板即为一个组件。模板组件通过 Props 接收配置参数，在组件内部根据 props 值渲染出对应的视觉效果。

```typescript
// 模板组件接口
interface TemplateComponentProps {
  /** 照片信息 */
  photo: Photo;
  /** 模板可配置属性 */
  props: Record<string, unknown>;
  /** 背景样式 */
  background: BackgroundSettings;
  /** 字体族 */
  fontFamily: string;
}

// 模板组件示例
function TplDefault({ photo, props, background, fontFamily }: TemplateComponentProps) {
  return (
    <div className="template-container" style={{ fontFamily }}>
      {/* 背景层 */}
      <BackgroundLayer settings={background} />
      {/* 照片层 */}
      <img src={photo.previewUrl} alt={photo.name} />
      {/* 水印文字层 */}
      <TextOverlay exif={photo.exif} config={props} />
    </div>
  );
}
```

- 内置 6 套模板各为一个独立的 React 组件
- 远程模板通过代码字符串动态编译为组件
- 模板属性面板根据组件声明的 Props Schema 动态渲染编辑表单

### 14.2 图片导出（snapdom）

导出采用前端截图方案，使用 `snapdom` 等 DOM-to-Image 库，将模板组件渲染的 DOM 节点捕获为图片。

```
导出流程：
  配置导出参数 → 渲染模板 DOM → snapdom 捕获 → 输出图片文件
```

- 在导出时，将模板组件渲染到一个离屏 DOM 容器中
- 待渲染完成后，使用 snapdom 对该 DOM 节点截图
- 支持输出 JPEG / PNG / WebP 格式
- 导出质量通过 snapdom 的质量参数控制
- DPI 信息通过 EXIF 写入方式追加到输出文件

### 14.3 导出尺寸控制（--base-size）

导出尺寸通过 CSS 自定义属性 `--base-size` 控制。模板组件的所有尺寸单位均以该变量为基准，实现一次渲染匹配多种输出规格。

**工作原理**：

```
1. 设定基准值 → 设 --base-size: 16
2. 渲染模板 → 测出实际渲染尺寸 w × h
3. 计算比值 → ratio = 目标尺寸 / 实际尺寸
4. 调整基准 → 设 --base-size: 16 × ratio
5. 重新渲染 → 输出尺寸 = 目标尺寸
```

```
示例：目标导出 1920×1080

  --base-size: 16  →  渲染结果: 960×540
  ratio = 1920 / 960 = 2.0
  --base-size: 32  →  渲染结果: 1920×1080 ✓
```

**模板适配**：模板组件内所有涉及尺寸的样式均使用 `calc()` 或相对单位，以 `--base-size` 为基准：

```css
.template-container {
  padding: calc(var(--base-size) * 0.5);
  font-size: calc(var(--base-size) * 0.875);
  gap: calc(var(--base-size) * 0.25);
}
```

- 传入首次 `--base-size` 渲染一次 → 测量 DOM 实际宽高
- 计算目标尺寸与实际尺寸的缩放比
- 用缩放比修正 `--base-size`，再次渲染 → 输出尺寸精确匹配

---
