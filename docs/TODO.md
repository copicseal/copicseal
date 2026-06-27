# Copicseal 总开发待办

> 基于 2026-06-27 重制版产品文档
> 目标：按新的产品定位、页面结构与 UI 规范从零完成实现

---

## Phase 0 — 文档与边界确认

- [x] 重写产品定位与设计原则
- [x] 明确三个一级页面：`Template` / `Collage` / `Settings`
- [x] 明确统一布局：`Nav + Workspace + Properties + Assets`
- [x] 明确 `No Project System`
- [x] 明确 `No Global Asset Workspace`
- [x] 明确 Template 与 Collage 的独立边界
- [x] 明确前端范围全部位于 `src/`

---

## Phase 1 — 应用骨架

- [x] 建立 `app/` 路由结构
- [x] 实现 `/template`、`/collage`、`/settings` 三个页面入口
- [x] 实现左侧 `Nav` 固定宽度 `72px`
- [x] 为导航图标补全 tooltip
- [x] 禁止顶部 Tab 式页面导航
- [x] 实现统一页面壳层布局
- [x] 实现 `Properties` 面板默认 `320px`
- [x] 实现 `Properties` 面板拖拽宽度 `280px ~ 420px`
- [x] 实现 `Workspace` 与 `Assets` 的垂直分区结构

---

## Phase 2 — Template 页面基础能力

- [x] 创建 `features/template/`
- [x] 建立 `Template Preview` 区域
- [x] 接入 `<TemplateRuntime />`
- [x] 实现 Template 页面缩放控制
- [x] 支持 `Fit`
- [x] 支持 `50%`
- [x] 支持 `100%`
- [x] 支持 `200%`
- [x] 建立 `Template Assets` 区域
- [x] 实现图片缩略图列表
- [x] 支持拖拽导入
- [x] 支持粘贴导入
- [x] 支持文件夹导入
- [x] 支持多选
- [x] 支持排序
- [x] 支持 `Ctrl+A`
- [x] 支持 `Delete`

---

## Phase 3 — Template 模板系统

- [x] 创建模板注册表
- [x] 提供内置模板数据结构
- [x] 实现 `Template Selector`
- [x] 支持模板搜索
- [x] 支持模板收藏
- [x] 支持最近使用
- [x] 定义 `propsSchema` 结构
- [x] 建立 Schema 到表单控件的自动生成器
- [x] 禁止手写模板专用表单
- [x] 打通模板切换到预览更新链路
- [x] 为模板属性提供默认值与校验

---

## Phase 4 — Template 导出能力

- [x] 建立 Template `Export` 面板
- [x] 支持 `PNG`
- [x] 支持 `JPG`
- [x] 支持 `WEBP`
- [x] 支持质量调节
- [x] 支持倍率调节
- [x] 支持“导出当前”
- [x] 支持“批量导出”
- [x] 保证导出结果来自当前 Template Workspace

---

## Phase 5 — Collage 页面基础能力

- [x] 创建 `features/collage/`
- [x] 建立 `Collage Preview` 区域
- [x] 接入 `<CollageCanvas />`
- [x] 建立 `Collage Assets` 区域
- [x] 支持图片导入
- [x] 支持拖入拼图
- [x] 支持排序
- [x] 支持替换图片
- [x] 支持删除图片
- [x] 建立顶部布局工具栏
- [x] 支持 `2 Grid`
- [x] 支持 `3 Grid`
- [x] 支持 `4 Grid`
- [x] 支持 `6 Grid`
- [x] 支持 `Auto Layout`
- [x] 支持 `Free Layout`

---

## Phase 6 — Collage 属性系统

- [x] 建立 `Layout` 面板
- [x] 支持间距
- [x] 支持边距
- [x] 支持背景色
- [x] 支持圆角
- [x] 支持阴影
- [x] 建立 `Selection` 面板
- [x] 选中图片后支持缩放
- [x] 选中图片后支持位置调整
- [x] 选中图片后支持旋转
- [x] 选中图片后支持圆角
- [x] 建立 `Export` 面板
- [x] 与 Template 共用导出参数结构

---

## Phase 7 — Settings 页面

- [ ] 创建 `features/settings/`
- [ ] 实现 Settings 独立页面布局
- [ ] 建立 `General` 设置分组
- [ ] 支持主题
- [ ] 支持语言
- [ ] 支持启动页
- [ ] 支持默认导出目录
- [ ] 支持自动更新
- [ ] 建立 `Template` 设置分组
- [ ] 支持默认模板
- [ ] 支持默认字体
- [ ] 支持默认边框宽度
- [ ] 支持默认背景颜色
- [ ] 支持默认 EXIF 格式
- [ ] 建立 `Collage` 设置分组
- [ ] 支持默认布局
- [ ] 支持默认间距
- [ ] 支持默认背景色
- [ ] 支持默认圆角
- [ ] 建立 `Export` 设置分组
- [ ] 支持默认格式
- [ ] 支持默认倍率
- [ ] 支持默认质量
- [ ] 建立 `Cache` 分组
- [ ] 建立 `About` 分组

---

## Phase 8 — 基础设施

- [ ] 建立 `infra/assets/`
- [ ] 建立 `infra/export/`
- [ ] 建立 `infra/fs/`
- [ ] 建立 `infra/cache/`
- [ ] 建立 `infra/db/`
- [ ] 建立统一导入能力
- [ ] 建立缩略图缓存能力
- [ ] 建立预览资源缓存能力
- [ ] 建立统一导出管线
- [ ] 建立导出任务状态与取消机制

---

## Phase 9 — Runtime / Core / Bridge

- [ ] 建立 `runtime/template/`
- [ ] 建立模板注册与执行能力
- [ ] 建立 `core/renderer/`
- [ ] 建立 DOM 稳定性控制
- [ ] 建立 `core/scheduler/`
- [ ] 建立导出任务调度
- [ ] 建立 `bridge/tauri.ts`
- [ ] 建立 `bridge/export.api.ts`
- [ ] 建立 `bridge/assets.api.ts`
- [ ] 建立 `bridge/template.api.ts`
- [ ] 建立 `bridge/collage.api.ts`

---

## Phase 10 — 收尾与验收

- [ ] 验证 Template 页面主流程
- [ ] 验证 Collage 页面主流程
- [ ] 验证 Settings 页面主流程
- [ ] 验证预览与导出一致性
- [ ] 验证 Template 与 Collage 状态互不污染
- [ ] 验证 `biome check`
- [ ] 验证 `vite build`
- [ ] 验证 Tauri 构建链路
