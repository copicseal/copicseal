# 05 — 数据模型与配置

## 概述

本章定义 Template、Collage、Export 与 Settings 所需的核心数据模型。模型设计遵循以下原则：

- 无项目系统
- 无全局素材工作区
- 功能页各自维护本地会话状态
- 仅共享基础设施数据与默认配置

---

## 5.1 Template Asset

Template 页面中的图片素材对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| fileName | string | 原始文件名 |
| filePath | string | 本地文件路径 |
| previewUrl | string | 预览资源 |
| thumbnailUrl | string | 缩略图资源 |
| exif | object | EXIF 数据 |
| order | number | 资产排序 |
| selected | boolean | 是否选中 |

---

## 5.2 Template Session

Template 页面的状态分两层：页面级的会话状态，以及逐张照片各自的模板配置。

页面级会话状态：

| 字段 | 类型 | 说明 |
|------|------|------|
| activeAssetId | string | 当前预览图片 |
| zoom | `fit` \| 50 \| 100 \| 200 | 预览缩放档位；`100` 表示照片按原始像素宽度显示 |

每张照片各持一份模板配置，彼此独立：

| 字段 | 类型 | 说明 |
|------|------|------|
| photoId | string | 归属的照片 |
| templateId | string | 该照片使用的模板 ID |
| templateProps | object | 该照片的模板参数，切换模板时重置为该模板的默认值 |
| background | object | 该照片的背景设置，同样随模板切换重置为该模板的默认值 |
| exportPresets | ExportPreset[] | 该照片的输出档位，至少一档 |

约束：

- 未编辑过的照片沿用框架默认配置（默认模板及其默认参数与背景），不写入任何条目
- 切换模板只影响当前照片，其余照片保持各自设置
- 支持把当前照片的「模板与参数」或「背景」一键应用到其余照片；参数与模板必须一起复制，单独复制参数会与模板不匹配
- 素材被移除时其配置一并回收
- 运行态配置不做跨会话持久化，见 5.8 存储原则

---

## 5.3 Template Definition

模板定义对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 模板 ID |
| name | string | 模板名 |
| tags | string[] | 搜索与分类标签 |
| favorite | boolean | 是否收藏 |
| recentUsedAt | string | 最近使用时间 |
| propsSchema | object | 该模板独有的可调参数描述 |
| componentKey | string | 运行时组件标识 |

### 模板参数描述（propsSchema）

每个模板独立声明自己的可调参数。字段同时定义控件形态、默认值与校验范围，属性面板完全由它生成：

| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 参数键 |
| label | string | 展示名 |
| type | `number` \| `color` \| `select` \| `text` | 控件形态 |
| default | number \| string | 默认值，随字段定义 |
| min / max / step | number | 数值范围与步长，仅 `number` |
| options | { label, value }[] | 候选项，仅 `select` |

约束：

- 模板之间不共享参数集合，切换模板时参数重置为该模板的默认值
- 注入给模板的图片地址与 EXIF 数据不属于参数，不进入 schema
- 数值参数的取值是相对画布宽度的比例，不带单位

### 模板背景（backgroundDefaults）

背景是框架级能力，与模板自身的参数体系相互独立：模板有没有自己的边框，都不影响这组字段的含义。模板只负责给出自己认为最佳的默认值，用户可在属性面板覆盖。

| 字段 | 类型 | 说明 |
|------|------|------|
| mode | `none` \| `color` \| `image` | 背景模式 |
| color | string | 纯色背景颜色 |
| blur | number | 模糊强度，相对画框宽度的比例 |
| brightness | number | 模糊图亮度 |
| paddingHorizontal | number | 水平内边距，相对画框宽度的比例 |
| paddingVertical | number | 垂直内边距，同样以画框宽度为基准 |

约束：

- 字段之间支持条件显示：颜色仅纯色模式可见，模糊与亮度仅照片模式可见，内边距在两种有背景的模式下都可见
- `image` 模式当前使用正在编辑的照片本身；自定义背景图预留字段，暂不实现
- 尺寸影响见 [04 导出系统](./04-export-system.md) 的「背景与尺寸」

---

## 5.4 Collage Asset

Collage 页面中的图片素材对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| fileName | string | 原始文件名 |
| filePath | string | 本地文件路径 |
| previewUrl | string | 预览资源 |
| thumbnailUrl | string | 缩略图资源 |
| order | number | 素材排序 |
| selected | boolean | 是否被选中 |

---

## 5.5 Collage Session

Collage 页面的当前工作状态：

| 字段 | 类型 | 说明 |
|------|------|------|
| layoutMode | 'grid' \| 'free' | 布局模式 |
| layoutPreset | string | 当前布局预设 |
| canvasStyle | object | 间距、边距、背景、圆角、阴影 |
| items | object[] | 画布中的图片项 |
| selectedItemId | string | 当前选中图片项 |
| exportConfig | object | 导出配置 |

### Collage Item

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 画布项 ID |
| assetId | string | 素材引用 |
| x | number | 横向位置 |
| y | number | 纵向位置 |
| width | number | 宽度 |
| height | number | 高度 |
| scale | number | 缩放 |
| rotation | number | 旋转 |
| borderRadius | number | 圆角 |

---

## 5.6 Export Config

统一导出配置由一组输出档位构成：

| 字段 | 类型 | 说明 |
|------|------|------|
| presets | ExportPreset[] | 输出档位列表，至少一档 |
| outputDir | string | 输出目录；平台不支持目录写入时为空 |
| preserveExif | boolean | 是否保留原图 EXIF |
| dpi | number | 分辨率元数据，不参与尺寸计算 |

### Export Preset

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 档位标识 |
| label | string | 档位名称 |
| format | `png` \| `jpeg` \| `webp` | 导出格式 |
| width | number | 目标框宽度（像素），必填 |
| height | number | 目标框高度（像素），必填 |
| scale | number | 位图倍率，在解算尺寸之上超采样 |
| quality | number | 图片质量，仅 JPEG / WebP 生效 |

尺寸解算规则见 [04 导出系统](./04-export-system.md)。

---

## 5.7 Settings Config

设置中心统一管理以下默认配置：

### General

| 字段 | 说明 |
|------|------|
| theme | 主题 |
| language | 语言 |
| startupPage | 启动页 |
| defaultExportDir | 默认导出目录；仅在当前平台支持目录写入时生效 |
| autoUpdate | 自动更新；仅桌面端生效 |

### Template

| 字段 | 说明 |
|------|------|
| defaultTemplateId | 默认模板 |
| defaultFont | 默认字体 |
| defaultBorderWidth | 默认边框宽度 |
| defaultBackgroundColor | 默认背景色 |
| defaultExifFormat | 默认 EXIF 格式 |

### Collage

| 字段 | 说明 |
|------|------|
| defaultLayout | 默认布局 |
| defaultGap | 默认间距 |
| defaultBackgroundColor | 默认背景色 |
| defaultRadius | 默认圆角 |

### Export

| 字段 | 说明 |
|------|------|
| defaultFormat | 默认格式 |
| defaultScale | 默认倍率 |
| defaultQuality | 默认质量 |

---

## 5.8 存储原则

- Template 与 Collage 运行态状态不做项目化持久化
- Settings 作为默认配置持久化存储
- 模板收藏、最近使用等轻量状态可持久化
- 素材缩略图与缓存由基础设施统一管理
