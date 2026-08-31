# 04 — 导出系统

## 概述

导出系统是 Template 与 Collage 共用的底层能力，用于将 Workspace 中的真实渲染结果输出为图片文件。

导出系统属于基础设施层，不属于任何单个 feature。渲染结果的编码与保存通过 Platform Contract 完成，以支持 Web 与 Tauri 两种运行环境。

---

## 4.1 设计目标

- 保证预览与导出结果一致
- 支持 Template 与 Collage 两类来源
- 支持单次导出与批量导出
- 支持稳定的进度、取消与错误反馈
- Web 与桌面端均可完成导出；根据平台能力选择目录保存或下载

---

## 4.2 基础链路

```txt
React
↓
DOM
↓
snapDOM
↓
Platform Export Service
├── encode PNG / JPG / WEBP
└── save to directory / download
```

### 说明

- 导出内容必须来自 Workspace 的真实渲染区
- 不允许维护一套与预览分离的隐藏导出模板
- 渲染稳定性由 `core/renderer` 负责
- 导出任务调度由 `core/scheduler` 负责
- Platform Provider 负责格式编码和宿主相关的保存方式

---

## 4.3 输出格式

支持以下格式：

- PNG
- JPG
- WEBP

### 输出参数

- 质量
- 倍率
- 文件名
- 输出目录

---

## 4.4 Template 导出

Template 导出支持：

- 导出当前图片
- 批量导出当前资产列表
- 多张图片按当前模板配置连续输出

批量导出时，当前模板、模板 props 与导出参数必须保持一致性。

---

## 4.5 Collage 导出

Collage 导出支持：

- 导出当前拼图结果
- 保持与当前画布布局一致
- 复用统一输出格式与质量参数

---

## 4.6 批量导出状态

导出状态至少包括：

- 当前任务来源（Template / Collage）
- 当前文件名
- 已完成数量 / 总数量
- 当前格式
- 当前倍率
- 取消状态
- 错误信息

---

## 4.7 命名与目录

系统支持：

- 默认导出目录
- 用户选择导出目录
- 按来源生成默认文件名

浏览器不支持目录选择或直接写入时，系统应以下载方式导出，并保留建议的文件名；不得将桌面目录选择器作为 Web 的前置条件。

Template 建议命名：

```txt
{原始文件名}@{模板名}.{格式}
```

Collage 建议命名：

```txt
collage-{时间戳}.{格式}
```
