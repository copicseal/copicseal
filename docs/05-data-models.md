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

Template 页面的当前工作状态：

| 字段 | 类型 | 说明 |
|------|------|------|
| activeAssetId | string | 当前预览图片 |
| templateId | string | 当前模板 ID |
| templateProps | object | 当前模板 props |
| zoom | number | 预览缩放 |
| fitMode | boolean | 是否适配预览区域 |
| exportConfig | object | 导出配置 |
| selectionIds | string[] | 当前多选资产 |

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
| propsSchema | object | 自动生成表单的 schema |
| componentKey | string | 运行时组件标识 |

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

统一导出配置：

| 字段 | 类型 | 说明 |
|------|------|------|
| format | 'png' \| 'jpg' \| 'webp' | 导出格式 |
| quality | number | 图片质量 |
| scale | number | 导出倍率 |
| outputDir | string | 输出目录 |

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
