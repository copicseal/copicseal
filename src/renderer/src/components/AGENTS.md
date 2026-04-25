# UI 组件目录

**OVERVIEW**: 高复杂度 Vue 3 组件目录，9个顶级组件。

**STRUCTURE**:
- `co-file-input` — 文件输入组件
- `co-settings-panel` — 设置面板
- `co-vars-input` — 变量输入组件
- `co-radio-group` — 单选组件
- `co-progress` — 进度组件
- `co-input` — 输入组件（含 co-shadow-input）
- `co-icon` — 图标组件
- `co-button` — 按钮组件
- `co-digital-7` — 数字字体组件

**WHERE TO LOOK**:
- 所有组件使用 `<script setup lang="ts">`
- 组件前缀：`Co`（如 CoInput, CoVarsInput）
- 样式：SCSS + UnoCSS at-rules

**CONVENTIONS**:
- 遵循项目级 Vue 3 约定
- index.vue / index.tsx 作为入口
- 无目录特定偏差

**ANTI-PATTERNS**:
- ❌ 使用 Options API
- ❌ 全局注册组件
- ❌ 直接修改 props
