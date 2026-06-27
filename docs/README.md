# Copicseal 架构设计书

> **项目**：Copicseal（可图匠）
> **定位**：以图片处理为核心的桌面应用
> **架构**：Tauri 2 + React 19 + Rust
> **版本**：v1.0.0（重构版文档）
> **日期**：2026-06-27

---

## 产品方向

Copicseal 是一个以图片处理为核心的桌面应用，当前只聚焦三个一级能力：

- 边框水印
- 拼图
- 设置中心

产品不引入项目系统，不提供全局素材工作区。所有操作都围绕当前功能页内的实时预览、局部素材和导出结果展开。

---

## 设计原则

```txt
Preview First
Feature Oriented
No Project System
No Global Asset Workspace
```

对应含义：

- 预览优先：Workspace 是真实渲染区，导出结果直接来自该区域
- 功能独立：Template 与 Collage 各自拥有独立页面、状态、交互与资产栏
- 无项目系统：不引入工程、画册、工作区或长期编辑项目模型
- 无全局素材库：素材只属于当前功能页，跨页面只共享底层缓存能力

---

## 页面结构

应用仅包含三个一级页面：

```txt
Template
Collage
Settings
```

对应：

```txt
边框水印
拼图
设置
```

---

## 全局布局

Template 与 Collage 采用统一三栏布局：

```txt
┌────────┬────────────────────────────┬──────────────┐
│        │                            │              │
│ Nav    │       Workspace            │ Properties   │
│        │                            │              │
│        ├────────────────────────────┤              │
│        │         Assets             │              │
└────────┴────────────────────────────┴──────────────┘
```

设置页使用独立的设置中心布局，不复用业务三栏结构。

---

## 导航与区域规范

### Nav

- 固定宽度 `72px`
- 仅图标展示，hover 时通过 tooltip 显示文字
- 不可折叠
- 不允许顶部 Tab 导航
- 永久显示

### Workspace

- 整个系统最重要区域
- 承担真实渲染与最终导出来源
- 必须尽可能大
- 运行链路为 `React → DOM → snapDOM → PNG`

### Properties

- 默认宽度 `320px`
- 可拖拽范围 `280px ~ 420px`
- 使用 `Accordion` 组织分区

### Assets

- 位于 Workspace 下方
- 属于当前功能，而不是整个应用
- Template Assets 与 Collage Assets 完全独立
- 仅共享底层素材缓存与文件能力

---

## 前端分层

前端代码全部限制在 `src/` 内，采用以下分层：

```txt
app        → 应用入口
features   → 用户可见功能
runtime    → 模板运行系统
core       → 渲染与调度核心
infra      → 基础设施层（IO / Export / Assets）
shared     → 通用 UI 与工具
bridge     → Tauri 通信层
```

```txt
src/
├── app/
├── features/
│   ├── template/
│   ├── collage/
│   └── settings/
├── runtime/
│   └── template/
├── core/
│   ├── renderer/
│   ├── scheduler/
│   ├── lifecycle/
│   └── constants/
├── infra/
│   ├── export/
│   ├── assets/
│   ├── fs/
│   ├── cache/
│   └── db/
├── bridge/
├── shared/
├── store/
└── utils/
```

---

## 文档索引

| 编号 | 文档 | 内容 |
|------|------|------|
| 01 | [产品愿景与目标](./01-product-vision.md) | 产品定位、设计原则、页面边界 |
| 02 | [核心工作流](./02-workflow.md) | Template / Collage / Settings 主流程 |
| 03 | [模板系统](./03-template-system.md) | 边框水印页面、模板运行、模板属性与导出 |
| 04 | [导出系统](./04-export-system.md) | 统一导出管线与批量导出规范 |
| 05 | [数据模型与配置](./05-data-models.md) | Template、Collage、导出与设置数据模型 |
| 06 | [系统集成与存储](./06-system-integration.md) | 前端分层、Tauri 通信、缓存与持久化 |
| 07 | [EXIF 元数据与相机信息](./07-exif-metadata.md) | EXIF 字段、映射、编辑与变量 |
| 08 | [产品需求规格](./08-product-requirements.md) | 完整功能需求清单 |
| 09 | [拼图系统](./09-collage-system.md) | 拼图页面、布局模式、属性编辑与导出 |
| 10 | [拼图开发清单](./10-collage-todo.md) | 拼图能力专项开发清单 |
| TODO | [总开发待办](./TODO.md) | 从零落地的整体实施计划 |
