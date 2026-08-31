# 01 — 产品愿景与目标

## 产品定位

Copicseal（可图匠）是一个以图片处理为核心的 Web-first 跨平台应用，当前聚焦三项能力：

1. 边框水印
2. 拼图
3. 设置中心

这不是通用设计软件，也不是素材管理平台。产品聚焦于“快速导入、即时预览、直接导出”的图片生产体验。

浏览器是独立可运行的一等平台，应可完成核心导入、预览、编辑和导出流程。Tauri 是高性能桌面宿主，为图片处理、本地文件、存储和系统集成提供增强能力；浏览器确实无法实现的能力必须明确标注，而不是伪造桌面行为。

---

## 核心目标

- 让用户围绕单张图或一组图快速生成可发布的结果
- 把真实预览作为主要交互中心，而不是表单或项目树
- 让 Template 与 Collage 成为两个互不干扰的独立功能域
- 通过统一导出管线输出稳定一致的最终图片
- 让业务功能只依赖统一的平台能力接口，而不绑定具体宿主

---

## 设计原则

```txt
Preview First
Feature Oriented
No Project System
No Global Asset Workspace
Web-first, Desktop Enhanced
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

### Web-first, Desktop Enhanced

- 核心业务在 Web 与 Tauri 中使用同一套 React 代码和平台 Contract
- Tauri 优先使用 Rust 与原生系统能力；单项能力未实现或不支持时，才按规则降级到 Web Provider
- Web 不要求模拟托盘、任意路径写入或自动更新等桌面专有能力，但必须提供清晰的可用替代方案

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

- 跨平台行为与能力设置
- Template 默认行为
- Collage 默认行为
- Export 默认行为

---

## 成功标准

- 用户进入任一业务页面后，首先看到的是可工作的预览区
- 预览区、属性区、素材区各自职责清晰
- Template 与 Collage 可以独立演进，而不会互相污染状态或交互
- 用户不需要理解项目结构即可完成导入、编辑、导出
