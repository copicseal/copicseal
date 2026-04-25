# 视图层目录

**OVERVIEW**: 视图层聚合页面级 UI 与可复用片段，覆盖 6 个子目录。

**STRUCTURE**:
- `tpls` — 模板页面
- `components` — 共享 UI 根目录
- `components/panels` — 面板组件集合
- `components/dialogs` — 对话框集合
- `components/dialogs/components` — 对话框子组件
- `components/dropdowns` — 下拉菜单组件

**WHERE TO LOOK**:
- `tpls/tpl-default.vue` — 默认模板
- `components/panels/co-output-panel.vue` — 输出面板
- `components/dialogs/co-settings-dialog.vue` — 设置对话框

**CONVENTIONS**:
- 视图组件使用 `<script setup lang="ts">`
- co- 前缀组件命名

**ANTI-PATTERNS**:
- ❌ 业务逻辑直接写入视图组件
- ❌ 模板中复杂计算
- ❌ 全局样式污染
- ❌ 深层 props 传递