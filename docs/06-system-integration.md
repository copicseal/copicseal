# 06 — 系统集成与存储

## 概述

本章定义前端分层、Tauri 通信边界、素材基础设施与持久化策略。

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

## 6.2 分层职责

### `app`

- 应用初始化
- 路由与页面入口
- 全局布局壳层

### `features`

- `template`：边框水印业务
- `collage`：拼图业务
- `settings`：设置中心业务

### `runtime`

- 仅负责 Template 的 React 模板运行系统
- 管理模板注册、渲染与 props schema

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

- 前端到 Rust 的统一 API 封装
- 类型安全 `invoke`
- 错误边界统一处理

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

## 6.4 Tauri 通信层

建议结构：

```txt
bridge/
├── tauri.ts
├── export.api.ts
├── assets.api.ts
├── template.api.ts
└── collage.api.ts
```

职责：

- 隔离页面组件与 Tauri 命令细节
- 统一封装参数与返回类型
- 统一转换错误消息

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
