# 01 — 产品愿景与目标

## 产品定位

Copicseal（可图匠）是一个以图片处理为核心的桌面应用，当前聚焦三项能力：

1. 边框水印
2. 拼图
3. 设置中心

这不是通用设计软件，也不是素材管理平台。产品聚焦于“快速导入、即时预览、直接导出”的图片生产体验。

---

## 核心目标

- 让用户围绕单张图或一组图快速生成可发布的结果
- 把真实预览作为主要交互中心，而不是表单或项目树
- 让 Template 与 Collage 成为两个互不干扰的独立功能域
- 通过统一导出管线输出稳定一致的最终图片

---

## 设计原则

```txt
Preview First
Feature Oriented
No Project System
No Global Asset Workspace
```

### Preview First

- 中央 Workspace 是最重要区域
- 预览即真实渲染结果
- 导出直接取自 Workspace 渲染结果

### Feature Oriented

- 所有用户操作围绕页面功能组织
- Template、Collage、Settings 是唯一一级页面
- 页面内资产、属性、状态都服务于当前功能

### No Project System

- 不提供项目、文档、画布工程、工作区切换
- 不要求用户先创建项目再编辑
- 导入图片后即可开始处理

### No Global Asset Workspace

- 不存在应用级素材中心
- Template Assets 与 Collage Assets 分别归属于对应页面
- 仅底层缓存、缩略图和文件访问能力可复用

---

## 页面边界

### Template

- 单图边框水印
- 模板渲染
- props 驱动编辑
- 批量导出

### Collage

- 多图拼图
- Grid Layout
- Free Layout
- 批量导出

### Settings

- 软件行为设置
- Template 默认行为
- Collage 默认行为
- Export 默认行为

---

## 成功标准

- 用户进入任一业务页面后，首先看到的是可工作的预览区
- 预览区、属性区、素材区各自职责清晰
- Template 与 Collage 可以独立演进，而不会互相污染状态或交互
- 用户不需要理解项目结构即可完成导入、编辑、导出
