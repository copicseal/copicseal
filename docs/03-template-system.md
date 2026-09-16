# 03 — 模板系统

## 概述

Template 页面负责边框水印的完整生产流程，包括模板渲染、属性编辑、图片资产管理与批量导出。

路径：

```txt
/template
```

---

## 页面布局

```txt
┌────────┬────────────────────────────┬──────────────┐
│        │                            │              │
│ Nav    │      Template Preview      │ Properties   │
│        │                            │              │
│        ├────────────────────────────┤              │
│        │      Template Assets       │              │
└────────┴────────────────────────────┴──────────────┘
```

---

## 3.1 Workspace

Template 的 Workspace 渲染当前模板运行结果：

```tsx
<TemplateRuntime />
```

### Workspace 要求

- 显示当前模板的真实渲染结果
- 支持缩放控制
- 提供 `Fit`、`50%`、`100%`、`200%`
- 导出结果直接来自当前渲染区域

---

## 3.2 Properties

Properties 采用 `Accordion` 组织，包含四个核心区块。

### Template Selector

模板选择器展示可用模板，例如：

```txt
Leica
Film
Minimal
Instagram
```

支持：

- 搜索
- 收藏
- 最近使用

### Template Props

属性表单必须由 `propsSchema` 自动生成。

```txt
边框宽度
字体
字体大小
颜色
圆角
Logo
```

约束：

- 禁止手写模板专用表单
- 模板 UI 编辑项必须来源于 schema
- schema 同时定义默认值、类型、控件形态与校验规则

### 背景

背景是框架级能力，与模板自身的参数体系相互独立：模板有没有自己的边框，都不影响它。

```txt
无背景
纯色背景
照片模糊
```

字段：

```txt
背景模式
背景颜色
模糊强度
模糊图亮度
水平内边距
垂直内边距
```

约束：

- 默认值由当前模板提供，用户可以覆盖
- 切换模板时背景重置为该模板的默认值
- 字段按模式条件显示，不相关的字段不出现在面板上
- 内边距与模糊强度都是相对画框宽度的比例，不是像素值
- 背景是否启用会改变导出尺寸的语义，见 [04 导出系统](./04-export-system.md)

### Export

导出区块包含：

```txt
PNG
JPG
WEBP
质量
倍率
```

并提供：

- 导出
- 批量导出

---

## 3.3 Assets

Template Assets 只属于 Template 页面。

内容：

```txt
图片缩略图列表
```

支持：

- 拖拽导入
- 粘贴导入
- 文件夹导入
- 多选
- 排序
- `Ctrl+A`
- `Delete`

---

## 3.4 模板运行系统

Template 页依赖独立的模板运行系统负责执行 React 模板。

### 职责

- 注册模板
- 加载模板元信息
- 解释 `propsSchema`
- 将 props 转化为可编辑 UI
- 管理模板生命周期
- 为导出提供稳定渲染目标

### 运行链路

```txt
Template Selector
↓
Template Registry
↓
propsSchema
↓
Template Runtime
↓
DOM
↓
Export Pipeline
```

---

## 3.5 数据边界

Template 与 Collage 必须独立。

Template 只共享以下能力：

- Export Pipeline
- Asset Infrastructure
- EXIF Infrastructure

Template 不共享以下内容：

- 编辑器状态
- 页面布局逻辑
- 属性面板状态
- 资产栏状态
---

## 3.6 2026-06-30 实现约束补充

- Template 页面组件位于 `features/template`
- 通用工作台布局组件位于 `shared/layouts`
- 左侧内容区拆分为上方 `Template Preview` 与下方 `Template Assets`
