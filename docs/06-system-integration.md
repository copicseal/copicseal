# 06 — 系统集成与存储

## 概述

本章定义前端分层、平台能力边界、素材基础设施与持久化策略。平台 Contract 的完整设计见 [11 — 平台能力抽象与 Provider 改造方案](./11-platform-abstraction.md)。

---

## 6.1 前端边界

前端实现范围全部限制在 `src/`：

```txt
src/
├── app/
├── features/
│   ├── template/
│   ├── collage/
│   └── settings/
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
├── platform/
│   ├── contracts/
│   ├── services/
│   └── providers/
├── bridge/           # 迁移期间仅供 Tauri Provider 内部使用
├── shared/
├── store/
└── utils/
```

---

## 6.2 分层职责

### `app`

- 应用初始化
- 路由与页面入口
- 全局布局壳层

### `features`

- `template`：边框水印业务
- `collage`：拼图业务
- `settings`：设置中心业务

### `core`

- 渲染稳定性控制
- 导出任务调度
- 生命周期管理

### `infra`

- Export Pipeline
- Asset Infrastructure
- 文件访问与缓存
- 数据库存储

### `bridge`

- 迁移期间封装 Tauri `invoke`
- 仅作为 `platform/providers/tauri` 的内部适配层
- 不作为 feature、`features/template/runtime` 或 core 的公开依赖

### `platform`

- 向业务公开图片、文件、存储、对话框、剪贴板、系统和窗口等稳定 Contract
- 负责根据宿主注册 Tauri、Web 或 WASM Provider
- 由 Service 统一执行 Provider 编排、错误归一化和选择性降级
- 提供 UI 可用的能力声明；不负责伪造不具备的宿主能力

---

## 6.3 Feature 独立原则

Collage 与 Template 完全独立，禁止：

- 共享编辑器
- 共享布局逻辑
- 共享状态

仅共享：

- Export Pipeline
- Asset Infrastructure

---

## 6.4 平台通信与 Provider

建议结构：

```txt
platform/
├── contracts/
├── services/
├── providers/
│   ├── tauri/
│   └── web/
├── capabilities.ts
├── errors.ts
└── index.ts
```

职责：

- 隔离业务代码与 Tauri、浏览器、WASM 等宿主细节
- Provider 彼此独立，Service 统一决定调用顺序与降级
- 只允许 `PLATFORM_NOT_IMPLEMENTED` 与 `PLATFORM_UNSUPPORTED` 触发降级
- 实际解码、权限、参数、I/O 和存储错误必须原样转换后向上抛出

---

## 6.5 Asset Infrastructure

素材基础设施只提供底层能力，不提供全局素材工作区。

### 提供能力

- 文件导入
- 粘贴导入
- 文件夹扫描
- 缩略图生成
- 预览 URL 管理
- 缓存管理

### 不提供能力

- 全局素材库页面
- 跨页面共享素材面板
- 项目级素材归档

---

## 6.6 持久化策略

### 持久化内容

- Settings 默认配置
- 模板收藏
- 模板最近使用记录
- 缓存索引

### 不持久化为项目的内容

- Template 当前会话编辑状态
- Collage 当前会话编辑状态
- 全局工作区快照

---

## 6.7 文件系统与缓存

| 功能 | 说明 |
|------|------|
| 选择目录 | 调用系统目录选择器 |
| 打开文件 | 使用系统默认程序打开 |
| 打开文件夹 | 打开导出目录 |
| 缩略图缓存 | 为素材栏提供快速展示 |
| 预览资源缓存 | 降低重复读取成本 |

桌面端可通过 Tauri 访问用户明确授权的本地路径；Web 端使用浏览器 File API 与 File System Access API。浏览器不支持选择目录或直接写入时，导出必须降级为用户可见的下载操作。

---

## 6.8 数据库存储

SQLite 用于存储轻量配置与索引：

| 数据类型 | 说明 |
|----------|------|
| General 设置 | 主题、语言、启动页等 |
| Template 默认配置 | 模板默认行为 |
| Collage 默认配置 | 拼图默认行为 |
| Export 默认配置 | 格式、倍率、质量 |
| 模板收藏与最近使用 | 提升模板选择体验 |
| 缓存索引 | 资源缓存定位 |

Web 端使用 IndexedDB 与浏览器缓存承载等价的配置和索引语义。业务层只能通过 Storage Contract 访问它们。
---

## 6.9 2026-06-30 实现约束补充

### `shared/layouts`

- 只存放可复用布局组件
- 不直接判断当前业务页面，也不直接渲染 Template / Collage 的业务内容
- 通过 props 或 children 暴露 `Nav`、`Workspace`、`Assets`、`Properties` 等插槽

### `features/*` 页面职责

- `features/template` 与 `features/collage` 提供页面入口组件
- 页面组件引用 `shared/layouts` 进行组装，而不是由布局层反向承载页面逻辑
- 左侧内容区固定为上下分栏：上方 `Workspace`，下方 `Assets`

---

## 6.10 运行环境原则

- Web 是一等运行环境，不加载或等待 Tauri 才能启动。
- Tauri 是桌面增强宿主，优先提供 Rust 图片处理、SQLite、原生文件与系统能力。
- UI 使用 `platform.capabilities` 决定是否展示桌面专有操作；调用时仍由 Provider 链处理实际支持情况。
- 不允许在页面组件中散落 `isTauri()`、`window.__TAURI__` 或浏览器 API 分支。
