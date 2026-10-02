# shadcn/ui 组件目录说明

本目录是 `shadcn add` 生成的组件源码。按 `AGENTS.md` 工作原则 8：**组件必须最大限度减少修改**，
优先在业务侧用 `className`、`variant`、组件组合扩展；一旦改动本目录的源码，就要登记到下面的
[本地改动清单](#本地改动清单)，写清楚**哪个组件、改了什么、应用于什么地方**。

## 一、安装与升级约定

项目配置见 `components.json`：style `radix-mira`、base `radix`、`rsc: false`、图标库 `lucide-react`，
别名 `ui` = `@/shared/ui`、`utils` = `@/shared/lib/utils`。

```bash
pnpm exec shadcn add <component>          # 安装
pnpm exec shadcn add <component> --dry-run   # 升级前看影响范围
pnpm exec shadcn add <component> --diff <file>   # 升级前看逐行差异
```

安装 / 升级后必须做的收尾（**不要直接 `--overwrite`**，会冲掉下面的本地改动）：

1. **改 `cn` 的导入**：当前 registry 的组件源码写的是 `import { cn } from 'cn'`，registry 项也声明了
   `dependencies: ["cn"]` —— 这个 `cn` 是 shadcn 官方新发的 npm 包（clsx + tailwind-merge 的替代品）。
   本项目沿用自建的 `cn`（`src/shared/lib/utils.ts`），所以装完要把 `'cn'` 改回 `'@/shared/lib/utils'`：
   不改的话，要么多出一个 `cn` 依赖、项目里同时存在两套 `cn` 实现，要么（没装 `cn` 包时）直接报
   `TS2307: Cannot find module 'cn'`。
   > 长期方案是统一迁移到 `cn` 包（改 `src/shared/lib/utils.ts` 与全部引用），目前没做，按安装后替换处理。
2. **删掉 `'use client'`**：项目是 Vite SPA（`rsc: false`），RSC 指令没有意义，统一删除。
3. **跑一次 `pnpm check`**（`biome check --write`）统一格式。

如果 `shadcn add` 报 `ERR_PNPM_UNEXPECTED_STORE`（pnpm 选的 store 和 `node_modules` 的链接来源不一致，
命令会在写文件之前中断），先跑 `pnpm store path` 确认 store 位置，再 `pnpm install` 重新链接。
这是本机 pnpm 环境问题，不是组件问题：在 store 不可写的受限环境下 pnpm 会退回到项目内的
`.pnpm-store`，从而和安装时用的 store 对不上。

## 二、本地改动清单

| 组件 | 改了什么 | 为什么 | 应用于什么地方 |
|------|----------|--------|----------------|
| `button.tsx` | 新增 variant `plain: 'text-muted-foreground hover:text-foreground'` | 需要"看着像纯文本"的图标按钮：无背景无边框，hover 才变色，语义上仍是 `<button>` 而不是链接 | [template-page.tsx:151](../../features/template/components/template-page.tsx#L151) 素材面板收起/展开按钮；[template-export-panel.tsx:44](../../features/template/components/template-export-panel.tsx#L44) 导出预设的删除按钮 |
| `slider.tsx` | Thumb 的 key 由 `key={index}` 改为 `` key={`thumb-${sliderValue}-${_values.length}`} ``，渲染方式由 `Array.from({ length })` 改回 `_values.map` | 规避 biome `suspicious/noArrayIndexKey`；用值而不是下标做 key | 全部滑块：[settings-page.tsx:422](../../features/settings/settings-page.tsx#L422)、[template-export-panel.tsx:94](../../features/template/components/template-export-panel.tsx#L94)、[collage-properties-panel.tsx:117](../../features/collage/components/collage-properties-panel.tsx#L117) 等 |
| `scroll-area.tsx` | 新增 4 个可选 prop：`scrollbarOrientation`、`horizontalWheelScroll`、`viewportClassName`、`viewportRef`；滚动条渲染改为按 `scrollbarOrientation` 条件渲染 | ① `viewportRef` 把 Viewport 的 ref 透出给 `useElementSize` 测量可用区（视口尺寸只由容器决定、与滚动内容无关，不会形成测量回环）；② `scrollbarOrientation: 'none'` 用于滚动位置由业务自己控制的场景；③ `viewportClassName` 给 Viewport 补类名（如 `[&>div]:h-full`）；④ `horizontalWheelScroll` 把纵向滚轮转成横向滚动，用于横向素材条 | [template-preview.tsx:162](../../features/template/components/template-preview.tsx#L162) 预览视口测量与导出时隐藏滚动条；[template-page.tsx:171](../../features/template/components/template-page.tsx#L171) 收起态横向素材条；[template-page.tsx:288](../../features/template/components/template-page.tsx#L288) 底部横向素材列表 |
| `tooltip.tsx` | **整文件是本地实现，不是 registry 版本**：`delayDuration` 默认 `120`（registry 为 `0`）、`TooltipContent` 默认 `side='right'` / `sideOffset={10}`、样式用 `bg-popover` + `border` + `text-popover-foreground`，去掉了 registry 的箭头、`data-slot` 与深色气泡样式 | 素材面板的提示要浅色气泡、右侧出现、延迟稍长以免划过时闪烁 | [template-page.tsx:145](../../features/template/components/template-page.tsx#L145) 起的素材面板与素材列表提示 |
| `toaster.tsx` | 保留旧版 sonner 包装（`className="toaster group"` + `group-[.toaster]:*` 类名），当前 registry 已不再提供该文件 | 当前 registry 对应的是 `sonner.tsx`（依赖 `next-themes`），迁移会牵动主题来源，暂不在本次范围内 | [app.tsx:14](../../app/app.tsx#L14)、[app.tsx:121](../../app/app.tsx#L121) 全局 toast 容器 |

`accordion.tsx`、`avatar.tsx`、`dropdown-menu.tsx` 全仓库无引用，已于 2026-10-02 删除。

## 三、上游更新记录

| 日期 | 组件 | 上游变化 | 处理 |
|------|------|----------|------|
| 2026-10-02 | `switch.tsx` | 新增 `group-has-[:focus-visible]/field-label:border-transparent`、`group-has-[:focus-visible]/field-label:ring-0`；删除 `'use client'` | 已同步（该类只在使用 shadcn `Field`/`FieldLabel` 时生效，本项目尚未使用 `Field`，属对齐上游的惰性类）；`'use client'` 按本目录约定不再引入 |
| 2026-10-02 | `radio-group.tsx` | `RadioGroupItem` 新增 `group-has-[:focus-visible]/field-label:ring-0`、`group-has-[:focus-visible]/field-label:not-data-checked:border-input`、`group-has-[:focus-visible]/field-label:data-checked:border-primary` | 已同步（同上） |
| 2026-10-02 | `accordion.tsx`、`avatar.tsx`、`dropdown-menu.tsx` | 组件本身与上游一致，但全仓库无引用 | 已删除，减少后续升级的核对量 |
| 2026-10-02 | `tabs.tsx` | 上游新增 `'use client'` | 不同步，按本目录约定本项目不加 RSC 指令 |
| 2026-10-02 | `dialog.tsx`、`input.tsx`、`resizable.tsx`、`select.tsx` | 与上游一致 | 无需处理 |
| 2026-10-02 | `button.tsx`、`slider.tsx`、`scroll-area.tsx` | 上游与本地的差异全部来自第二节的本地改动 | 保留本地改动，不覆盖 |

核对方式：把 `shadcn add` 的输出按第一节的收尾规则处理后，与本目录逐文件 `diff`。
`radix-mira` 这一版 registry 与本地文件的格式差异（引号、换行、import 分组）由 `biome check --write` 统一，不算改动。

## 四、遗留项

- `tooltip.tsx` 是本地实现，上游 Tooltip 改版不会自动同步，升级 registry 时需要人工比对。
- `toaster.tsx` 若迁移到 registry 的 `sonner.tsx`，需要先决定主题来源（会引入 `next-themes` 依赖）。
