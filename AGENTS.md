# 项目知识库

**生成时间:** 2026-04-25 23:20:48
**提交:** 7d9d677
**分支:** dev

## 概述

Copicseal - 图像水印处理工具，支持 Windows/macOS 双平台。核心技术栈：Electron + Vue 3 + TypeScript + Element Plus + UnoCSS。

## 结构

```
./
├── src/
│   ├── main/           # 主进程 (Electron main)
│   ├── preload/        # 预加载脚本
│   └── renderer/       # 渲染进程 (Vue 3)
│       └── src/
│           ├── components/  # UI 组件库
│           ├── views/      # 页面视图
│           ├── uses/       # 组合式函数
│           ├── utils/      # 工具函数
│           ├── theme/      # 主题样式
│           └── assets/      # 静态资源
├── static/
│   └── templates/      # 水印模板
└── src-tauri/          # Tauri 配置
```

## 入口文件

| 文件 | 作用 |
|------|------|
| `src/main/index.ts` | 主进程入口 |
| `src/preload/index.ts` | 预加载脚本 |
| `src/renderer/src/main.ts` | Vue 应用入口 |
| `src/renderer/src/App.vue` | 根组件 |

## 命令

```bash
npm run dev          # 开发模式
npm run build       # 构建
npm run build:mac   # 构建 macOS
npm run build:win   # 构建 Windows
npm run typecheck   # 类型检查
```

## 约定

- **Vue 组件**: 使用 `<script setup lang="ts">` Composition API
- **组件前缀**: `Co` (如 `CoInput`, `CoVarsInput`)
- **样式**: SCSS + UnoCSS at-rules
- **自动导入**: Element Plus 组件按需加载

## 反模式

- ❌ 禁止使用 Options API（统一使用 `<script setup>`）
- ❌ 禁止全局注册 Vue 组件（使用 unplugin-vue-components）
- ❌ 禁止直接修改 props

## 构建配置

- **构建工具**: electron-vite
- **打包工具**: electron-builder
- **输出**: `dist/` (Windows), `out/` (开发预览)