# 09 — 拼图系统

## 概述

Collage 页面负责多图拼接与导出，是与 Template 平行的独立功能域。

路径：

```txt
/collage
```

核心原则：

```txt
Collage 与 Template 完全独立
```

禁止：

- 共享编辑器
- 共享布局逻辑
- 共享状态

仅共享：

- Export Pipeline
- Asset Infrastructure

---

## 页面布局

```txt
┌────────┬────────────────────────────┬──────────────┐
│        │                            │              │
│ Nav    │      Collage Preview       │ Properties   │
│        │                            │              │
│        ├────────────────────────────┤              │
│        │      Collage Assets        │              │
└────────┴────────────────────────────┴──────────────┘
```

---

## 9.1 Workspace

Collage 的 Workspace 渲染：

```tsx
<CollageCanvas />
```

支持：

- Grid Layout
- Free Layout

导出结果直接来自当前画布区域。

---

## 9.2 顶部工具栏

提供布局切换入口：

- `2 Grid`
- `3 Grid`
- `4 Grid`
- `6 Grid`
- `Auto Layout`
- `Free Layout`

---

## 9.3 Properties

Properties 使用 `Accordion` 组织，至少包含以下区块。

### Layout

- 间距
- 边距
- 背景色
- 圆角
- 阴影

### Selection

选中图片后显示：

- 缩放
- 位置
- 旋转
- 圆角

### Export

与 Template 使用相同的导出参数结构：

- PNG
- JPG
- WEBP
- 质量
- 倍率
- 导出

---

## 9.4 Assets

Collage Assets 只属于当前拼图页面。

支持：

- 拖入拼图
- 排序
- 替换图片
- 删除图片

---

## 9.5 数据流

```txt
Collage Assets
↓
Layout Mode / Preset
↓
Collage Canvas
↓
DOM
↓
Export Pipeline
```

---

## 9.6 布局能力

### Grid Layout

- 适合规则拼图
- 由布局预设驱动
- 优先支持固定格数与自动布局

### Free Layout

- 适合自由摆放
- 支持位置与缩放调整
- 单图属性由 Selection 面板控制
