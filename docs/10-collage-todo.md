# 10 — 拼图开发清单

> 基于 2026-06-27 重制版产品文档
> 目标：独立完成 Collage 页面，不复用 Template 编辑状态与页面逻辑

---

## 1. 页面骨架

- [ ] 创建 `/collage` 页面入口
- [ ] 接入统一三栏业务布局
- [ ] 建立 `Collage Preview`
- [ ] 建立 `Collage Assets`
- [ ] 建立 `Properties` 面板

---

## 2. 预览与画布

- [ ] 创建 `<CollageCanvas />`
- [ ] 保证 Workspace 为真实渲染区域
- [ ] 建立从画布到导出的稳定链路
- [ ] 支持 Grid Layout
- [ ] 支持 Free Layout

---

## 3. 顶部布局工具栏

- [ ] 支持 `2 Grid`
- [ ] 支持 `3 Grid`
- [ ] 支持 `4 Grid`
- [ ] 支持 `6 Grid`
- [ ] 支持 `Auto Layout`
- [ ] 支持 `Free Layout`

---

## 4. Assets 能力

- [ ] 支持图片导入
- [ ] 支持拖入拼图
- [ ] 支持排序
- [ ] 支持替换图片
- [ ] 支持删除图片

---

## 5. Layout 面板

- [ ] 支持间距
- [ ] 支持边距
- [ ] 支持背景色
- [ ] 支持圆角
- [ ] 支持阴影

---

## 6. Selection 面板

- [ ] 选中图片后显示属性
- [ ] 支持缩放
- [ ] 支持位置调整
- [ ] 支持旋转
- [ ] 支持圆角

---

## 7. Export 面板

- [ ] 支持 PNG
- [ ] 支持 JPG
- [ ] 支持 WEBP
- [ ] 支持质量
- [ ] 支持倍率
- [ ] 支持导出

---

## 8. 独立性验收

- [ ] 不共享 Template 编辑器
- [ ] 不共享 Template 布局逻辑
- [ ] 不共享 Template 页面状态
- [ ] 仅复用 Export Pipeline
- [ ] 仅复用 Asset Infrastructure
