# 02 — 核心工作流

## 概述

产品围绕三个一级页面运作：

```txt
Template
Collage
Settings
```

其中 Template 与 Collage 是独立的生产工作流，Settings 负责默认行为与系统设置。

---

## 2.1 Template 工作流

```txt
导入图片 → 选择模板 → 调整 Template Props → 预览 → 导出 / 批量导出
```

### 关键特征

- 以单图渲染为核心
- 模板通过 `propsSchema` 自动生成编辑表单
- 导出结果直接来自 `<TemplateRuntime />`
- 素材只在当前 Template 页面内可见

---

## 2.2 Collage 工作流

```txt
导入图片 → 选择布局模式 → 调整布局与选中项属性 → 预览 → 导出
```

### 关键特征

- 以多图组合为核心
- 支持 `Grid Layout` 与 `Free Layout`
- 资产栏只服务于当前拼图会话
- 导出结果直接来自 `<CollageCanvas />`

---

## 2.3 Settings 工作流

```txt
进入设置页 → 选择配置分类 → 修改默认行为 → 自动保存
```

### 配置分类

- General
- Template
- Collage
- Export
- Cache
- About

---

## 2.4 导入原则

所有业务页都遵循以下导入原则：

- 支持拖拽导入
- 支持系统文件选择导入
- 素材导入后立即进入可预览状态
- 不依赖项目保存才能继续工作

Template 额外支持：

- 粘贴导入
- 文件夹导入
- 多选与排序

Collage 额外支持：

- 拖入拼图
- 替换图片
- 删除图片

---

## 2.5 导出原则

- 导出来自当前 Workspace 的真实渲染结果
- 导出不依赖隐藏渲染路径或独立编辑器实现
- Template 与 Collage 共用导出基础设施，但不共享页面状态
- 批量导出始终展示进度与可取消状态
