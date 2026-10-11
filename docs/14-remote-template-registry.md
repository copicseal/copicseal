# 14 — 远程模板注册表（设计与打包规范）

> **状态**：设计稿，**待评审，尚未实施**（本文件只描述方案，仓库代码未做任何改动）
> **日期**：2026-10-09
> **关联**：[03 模板系统](03-template-system.md)、[11 平台抽象](11-platform-abstraction.md)、[13 旧版对齐清单](13-parity-checklist.md)

## 14.1 目标

让「边框水印」（Template 页）的模板可以来自远程：用户添加注册表地址 → 浏览远端可用模板 → 安装到本机 → 启用后直接出现在模板页下拉里，渲染、属性面板、预览、导出链路与内置模板完全一致。

本文件同时回答另一个问题：**这些打包好的 React 模板组件到底是怎么打包出来的**（见 14.6），这是方案能否落地的前提。

成功标准：

1. 设置 → 边框水印 → 「模板」能看到官方注册表（内置地址）与自定义注册表，刷新后列出远端可用模板。
2. 安装需二次确认；下载后逐个文件校验 `sha256`；校验失败不落盘。
3. 启用后模板页下拉出现该模板（与内置模板分组），选用后按它自己的 schema 渲染与生成属性控件（不写任何手写表单）。
4. 改参数预览更新；导出走原有快照链路，产物正常。
5. 删除模板后照片回退默认模板、引用它的预设标记「模板已失效」，不崩。

## 14.2 决策与信任模型

### 14.2.1 已确认决策

| 议题 | 选择 | 说明 |
|---|---|---|
| 远程模板形态 | **打包的 ESM/React 组件，运行时动态加载执行** | 表现力与内置模板一致 |
| 下载通道 | **Rust 侧下载** | 不受 WebView CSP 限制，支持用户填任意注册表 URL，可直落盘并校验 |
| 注册表来源 | **内置官方地址 + 允许用户添加自定义注册表** | 开箱可用，同时保留第三方分发能力 |

### 14.2.2 选「可执行组件」的必然含义

远程模板与主窗口**同源同上下文**，因此它拥有与 Copicseal 相同的权限：能调用全部 Tauri 命令（读写本机文件、改配置、访问网络）。架构上这等价于「安装一个插件」，而不是「加载一份皮肤数据」。这一点必须写进 UI 文案与文档，不能只在代码注释里。

### 14.2.3 为什么本期不做沙箱

真正隔离只有两条路，都与现有导出链路冲突：

- **独立 WebviewWindow + 受限 capability**：导出是对画布 DOM 做快照（当前用 `@zumer/snapdom`），跨窗口无法序列化。
- **`<iframe sandbox>` 隔离**：`allow-scripts` 且不给 `allow-same-origin` 才有效，但跨源 iframe 的内容无法被快照；给 `allow-same-origin` 则等于没隔离。

因此沙箱列为**后续项**（14.12），本期用工程手段把风险压到可控（14.2.4）。

### 14.2.4 缓解措施（必须落到实现里）

1. **逐次显式确认**：每次安装都弹确认框，必须勾选「我已了解风险」才能继续；禁止静默安装、禁止后台自动安装。
2. **完整性校验**：清单声明每个文件的 `sha256`，安装前逐个校验，不匹配立即中止并清理临时文件。
3. **不自动更新**：只在用户点「更新」时下载；版本号进落地路径，模块缓存天然不串版本。
4. **一键可撤销**：删除同时清掉 DB 记录与磁盘目录。
5. **故障隔离**：模板加载/执行抛错由 Error Boundary 兜住，只影响该模板，不白屏、不影响其他模板。
6. **元信息以宿主为准**：`meta.id` 由宿主加注册表前缀，`meta.name` / `description` 缺失时回退清单声明，避免远程包冒用内置模板身份。

## 14.3 现状与缺口

仓库里已经有相当一部分脚手架，本期不需要重建数据层：

| 已存在 | 位置 |
|---|---|
| `comark_templates` 表（含 `source_type` / `registry_url` / `local_path` / `enabled` / `version`） | `src-tauri/src/db.rs` |
| 元数据 CRUD 四个命令（`list` / `upsert` / `remove` / `set_enabled`） | `src-tauri/src/comark.rs`、`src-tauri/src/lib.rs` |
| 前端 invoke 包装 | `src/platform/providers/tauri/api.ts` |
| `ComarkTemplateRecord` / `UpsertComarkTemplatePayload` 类型 | `src/platform/contracts/index.ts` |
| `template_list.remote_registry: TemplateRegistry[]` 配置项（默认空） | `src-tauri/src/config.rs` |
| web 端空桩 | `src/platform/providers/platform-runtime.ts` |

**缺口**（本期要做）：

1. 注册表拉取、bundle 下载、`sha256` 校验、原子落盘（Rust 侧目前完全没有网络能力）。
2. bundle 的加载、SDK 注入、注册表 overlay（前端）。
3. 注册表与安装状态的管理 UI。
4. 模板页下拉合并远程模板。
5. CSP 放行、参考实现、打包工具链、文档。
6. `comark.rs::remove_comark_template` 目前只 `remove_file(local_path)`，而落地物是目录，需改为删目录树。
7. `template_list.enabled`（内置模板启用清单）至今无人接线，本期不动，在 13 的 E5 里登记。

## 14.4 注册表格式

注册表是**一份静态 JSON**（`index.json`），可以放在任意 HTTPS 静态站点或 GitHub Raw 上。

```jsonc
{
  "abi": 1,                       // 注册表格式版本
  "name": "Copicseal 官方模板",
  "templates": [
    {
      "id": "stamp",              // 注册表内唯一，禁止斜杠与路径字符
      "name": "复古邮票",
      "version": "1.0.0",         // 语义化版本，进落地路径
      "description": "带齿孔与邮戳的复古边框",
      "author": "Copicseal",
      "license": "MIT",
      "tags": ["相框", "复古"],
      "abi": 1,                   // 模板包 ABI，必须与宿主 REMOTE_TEMPLATE_ABI 相等
      "entry": "stamp.mjs",       // 相对本清单 URL 解析
      "sha256": "9f2c…",          // entry 的十六进制小写 SHA-256（必需）
      "assets": [
        { "path": "assets/paper-1a2b3c.png", "sha256": "41d8…" }
      ]
    }
  ]
}
```

约束：

- 清单上限 **512 KB**；单个 bundle 上限 **8 MB**；单个 asset 上限 **8 MB**。超限直接失败并给出可读原因。
- `id` / `version` / `entry` / asset `path` 只允许 `[A-Za-z0-9._/-]`，且**拒绝 `..` 与绝对路径**（防路径穿越）。
- `abi` 不匹配：该条目标记「需要更新客户端」，不可安装（前向兼容）。
- 注册表 URL 与其清单内容全部视为**不可信输入**，逐个字段校验后才使用。

## 14.5 模板包格式与 SDK 契约（ABI）

### 14.5.1 包形状

模板包是**一个自包含的 ESM 文件**（`.mjs`），满足：

- **没有任何裸露的 `import` 说明符**（不 `import 'react'`、不 `import 'lodash'`）：宿主不提供 import map，运行时也不会有裸说明符解析。
- **默认导出工厂函数** `(sdk) => RegisteredTemplate`；由构建脚本自动生成的入口负责调用注入与转发（见 14.6.4）。
- 不访问 `process` / `Buffer` / Node 内置模块；不发起网络请求。

### 14.5.2 宿主注入的 SDK 面

```ts
export const REMOTE_TEMPLATE_ABI = 1;

export interface RemoteTemplateSdk {
  abi: 1;
  reactMajor: 19;                       // 宿主 React 主版本，不匹配则拒载
  // —— React 与 JSX 运行时（必须来自宿主，见 14.6.1）——
  React: typeof import('react');
  jsx: typeof import('react/jsx-runtime').jsx;
  jsxs: typeof import('react/jsx-runtime').jsxs;
  Fragment: typeof import('react/jsx-runtime').Fragment;
  // —— 宿主纯函数工具（单一实现，避免与宿主行为漂移）——
  defineTemplate: typeof defineTemplate;
  formatExifText: typeof formatExifText;
  EXIF_TEXT_VARIABLES: typeof EXIF_TEXT_VARIABLES;
  normalizeBrand / normalizeModelName / getBrandLogoSvg / getBrandLogoUrl: /* ./brand 的导出 */;
  useImageAspect: typeof useImageAspect;
  // —— 安装上下文 ——
  resolveAsset: (path: string) => string;   // manifest 里的 assets[].path → 本机可用 URL
  registryId: string;
  templateId: string;
}
```

### 14.5.3 渲染约定（与内置模板同一套，必须写进作者文档）

| 约定 | 原因 |
|---|---|
| 画布根尺寸由框架给的 `--co-base` / `--co-frame` 推导（保留 03 文档的 `calc(var(--co-base) * 比例)` 写法） | 预览自适应与缩放档位靠它反解 |
| 呈现照片的 `<img>` 必须带 `data-co-photo` | 框架靠这个句柄换算「100% = 照片原始像素宽度」并等待加载 |
| 样式一律内联 `style`，不依赖应用内的 Tailwind 类名 | 导出是 DOM 快照；类名不随模板包分发 |
| 不请求外部网络资源；静态图走 `sdk.resolveAsset()` | 快照栅格化时外部资源可能跨域失败 |
| 字体不自行加载 | 全局字体由宿主挂在画布根，HTML 文本靠继承；SVG 场景用注入的 `font` |

### 14.5.4 ABI 版本策略

- 宿主与包各自声明 `abi`，相等才加载；不等则拒载并提示「该模板需要更新的客户端」。
- `reactMajor` 一并校验，避免第二份 React 导致的 hooks 失效。
- 破坏性变更（SDK 面增删、渲染约定变化）→ `abi` 加一；只增字段不算破坏性变更。

## 14.6 模板组件怎么打包（重点）

### 14.6.1 为什么必须由宿主注入 React

模板组件里会用到 `useState`（例如内置的 `useImageAspect` 就是 hook）。hook 依赖 React 内部的 dispatcher，**只有宿主渲染器设置过**。若 bundle 自带一份 React，会命中「Invalid hook call」或渲染成两套互不相识的实例。

结论：`react`、`react/jsx-runtime` **永远不进 bundle**，全部由宿主在运行时注入。构建脚本必须能证明产物里没有 React（14.6.8）。

### 14.6.2 作者侧工程结构

```txt
my-template/                       # 一个模板 = 一个可独立构建的包
├─ template.config.json            # 作者填写的元信息（id/name/version/…）
├─ package.json                    # devDependencies: esbuild、@copicseal/template-sdk
├─ tsconfig.json                   # jsx: react-jsx, jsxImportSource: @copicseal/template-sdk
├─ src/index.tsx                   # 默认导出 defineTemplate({...})
├─ src/paper.png                   # 可选静态资源
├─ scripts/build.mjs               # 打包（本仓库提供同一份，作者可复制）
└─ dist/                           # 产物：<id>.mjs + template.json + assets/
```

`tsconfig.json` 关键两项：

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@copicseal/template-sdk"   // JSX 编译到 SDK 的 jsx-runtime
  }
}
```

### 14.6.3 SDK 包结构（`@copicseal/template-sdk`）

SDK 只含**类型**与**运行时垫片（shim）**，**不含 React**：

```txt
packages/template-sdk/sdk/
├─ package.json          # exports: "." / "./jsx-runtime" / "./host-validate"
├─ runtime.mjs           # 垫片实现
├─ jsx-runtime.mjs       # re-export jsx / jsxs / Fragment
├─ index.d.ts            # 作者可见的类型（defineTemplate、TemplateField、TemplateInjectedProps…）
├─ jsx-runtime.d.ts
└─ host-validate.mjs     # 宿主侧形状校验（+ .d.mts）
```

`runtime.mjs`（核心，约 40 行）：

```js
// 宿主注入的运行时；__bindSdk 必须在任何渲染发生前调用
let R = null;
let bound = null;

/** 只同步绑定，不做任何副作用；由自动生成的入口调用。 */
export function __bindSdk(sdk) {
  R = sdk;
  bound = sdk;
  Fragment = sdk.Fragment;      // 供 JSX 的 <>…</> 直接引用
}

/** 兜底：宿主也会在 import 前写好这个全局，手写包不调 __bindSdk 时仍可用 */
function runtime() {
  const value = R ?? globalThis.__CO_TEMPLATE_SDK__;
  if (!value) throw new Error('模板运行时尚未注入');
  return value;
}

// —— JSX 运行时：调用发生在渲染期，此时一定已注入 ——
export const jsx = (...args) => runtime().jsx(...args);
export const jsxs = (...args) => runtime().jsxs(...args);
export let Fragment = undefined;          // live binding，由 __bindSdk 赋值

// —— 宿主工具透传（保持与宿主同一实现）——
export const formatExifText = (...args) => runtime().formatExifText(...args);
export const useImageAspect = (...args) => runtime().useImageAspect(...args);
export const getBrandLogoSvg = (...args) => runtime().getBrandLogoSvg(...args);
export const getBrandLogoUrl = (...args) => runtime().getBrandLogoUrl(...args);
export const normalizeBrand = (...args) => runtime().normalizeBrand(...args);
export const normalizeModelName = (...args) => runtime().normalizeModelName(...args);

// defineTemplate 是纯数据组包，不需要宿主状态：自带一份即可，避免模块求值顺序问题
export function defineTemplate(input) {
  return {
    meta: input.meta,
    schema: { fields: input.fields },
    backgroundDefaults: input.backgroundDefaults,
    fontDefaults: input.fontDefaults,
    render: (props) => runtime().jsx(input.component, props),
  };
}

// React 命名空间：模板若需要 Fragment/useMemo 等可直接使用
export const React = new Proxy({}, { get: (_t, key) => runtime().React[key] });

export const EXIF_TEXT_VARIABLES = [
  /* 与宿主一致的字面量表 */
];
```

`jsx-runtime.mjs`：

```js
export { jsx, jsxs, Fragment } from './runtime.mjs';
```

要点说明：

- `jsx` / `jsxs` 是**转发函数**，渲染期才解引用，因此不存在「模块求值时运行时还没注入」的时序问题。
- `Fragment` 用 **live binding**（`export let` + 绑定期赋值）。打包成单文件后，JSX 编译出的 `jsx(Fragment, …)` 直接引用该变量，能拿到绑定后的真值。若某打包器把它快照成常量，退路是 `Symbol.for('react.fragment')`（React 19 的 Fragment 就是该符号）。
- `defineTemplate` 不依赖宿主，故自带实现（与宿主 15 行的实现等价）；这样 `export default defineTemplate({...})` 在模块求值期调用也不会出错。
- 类型侧 `index.d.ts` 面向作者，导出 `defineTemplate`、`TemplateField`、`TemplateInjectedProps`、`RegisteredTemplate` 等。**本期它与宿主 `src/features/template/templates/types.ts` 是两份文件，存在漂移风险**，已登记为后续项（14.12）。

### 14.6.4 生成入口（`build/entry.mjs`）

构建脚本先生成一个入口，保证「绑定 SDK → 再暴露作者的默认导出」这个顺序：

```js
// 由 scripts/build.mjs 生成，不要手写
import { __bindSdk } from '@copicseal/template-sdk';
import definition from '../src/index.tsx';

export default function createTemplate(sdk) {
  __bindSdk(sdk);
  return definition;
}
```

作者的 `src/index.tsx` 就是普通模板代码，**不需要**自己关心注入：

```tsx
import { defineTemplate, type TemplateField } from '@copicseal/template-sdk';
import { useImageAspect } from '@copicseal/template-sdk';

const fields = [
  { key: 'borderPadding', label: '相框边距', type: 'number', default: 0.006, min: 0, max: 0.05, step: 0.001 },
  { key: 'borderColor', label: '相框颜色', type: 'color', default: '#ffffff' },
] as const satisfies readonly TemplateField[];

type Params = { borderPadding: number; borderColor: string };

function Stamp({ photoUrl, borderPadding, borderColor }: /* 注入 + 参数 */ any) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);
  return (
    <div style={{ width: 'calc(var(--co-base) * 1)', padding: `calc(var(--co-base) * ${borderPadding} * ${aspect})`, background: borderColor }}>
      <img data-co-photo="" src={photoUrl} alt="" style={{ display: 'block', width: '100%' }} onLoad={handleLoad} />
    </div>
  );
}

export default defineTemplate({ meta: { id: 'stamp', name: '复古邮票', description: '…' }, fields, component: Stamp });
```

### 14.6.5 别名解析

打包时把 SDK 说明符指向垫片文件（本地开发指向仓库内目录，第三方作者指向 node_modules 里的 npm 包）。用 esbuild 插件实现：

```js
// scripts/build.mjs（节选）
const sdkAliasPlugin = {
  name: 'copicseal-template-sdk-alias',
  setup(build) {
    const map = {
      '@copicseal/template-sdk': sdkRuntimePath,           // runtime.mjs
      '@copicseal/template-sdk/jsx-runtime': sdkJsxRuntimePath,
    };
    build.onResolve({ filter: /^@copicseal\/template-sdk(\/jsx-runtime)?$/ }, (args) => ({
      path: map[args.path],
    }));
  },
};
```

### 14.6.6 esbuild 完整配置

```js
// scripts/build.mjs（核心配置）
import { build } from 'esbuild';

await build({
  entryPoints: [entryFile],          // 14.6.4 生成的 build/entry.mjs
  outfile: `dist/${config.id}.mjs`,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',                  // WebView2 / WKWebView 15.4+ / WebKitGTK 均支持
  splitting: false,                  // 必须单文件：宿主用 Blob 载入，不能有相对导入
  treeShaking: true,
  minify: false,                     // v1 不压缩：用户能审查自己安装的代码
  sourcemap: false,                  // Blob 载入下相对 sourcemap 不生效
  legalComments: 'inline',
  jsx: 'automatic',
  jsxImportSource: '@copicseal/template-sdk',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'file', '.jpg': 'file', '.jpeg': 'file', '.svg': 'file', '.webp': 'file' },
  assetNames: 'assets/[name]-[hash]',
  plugins: [sdkAliasPlugin, assetManifestPlugin, forbidNodeBuiltinsPlugin],
});
```

逐项理由：

| 配置 | 理由 |
|---|---|
| `bundle: true` + `splitting: false` | 宿主只 `import()` 一个 Blob URL，任何相对/裸导入都会解析失败 |
| `format: 'esm'` | 与动态 `import()` 一致；不用 UMD/IIFE |
| `platform: 'browser'` | 屏蔽 Node 内置模块；配合 `forbidNodeBuiltinsPlugin` 在构建立刻报错而不是运行期 |
| `target: 'es2022'` | 目标 WebView 都支持；不必降到 es2019 |
| `minify: false` | 可审查性优先（用户装的是可执行代码）；发布体积不是瓶颈（bundle 上限 8 MB） |
| `loader: 'file'` + `assetNames` | 资源不内联，产物落到 `dist/assets/`，由清单登记并走 `resolveAsset` |
| `define: process.env.NODE_ENV` | 避免某些依赖引用 `process` |

**反面做法**（明确禁止）：`external: ['react']`（会留下裸导入）、`format: 'cjs'`、`splitting: true`、`loader: dataurl` 处理大图（体积失控）。

### 14.6.7 产物结构与清单生成

```txt
dist/
├─ stamp.mjs                 # 唯一入口，自包含
├─ assets/paper-1a2b3c.png   # 若模板引用了静态资源
└─ template.json             # 由构建脚本生成，用于汇总进 registry.json
```

`template.json`（构建脚本合并 `template.config.json` 后写出）：

```jsonc
{
  "id": "stamp",
  "name": "复古邮票",
  "version": "1.0.0",
  "description": "…", "author": "…", "license": "MIT", "tags": ["相框"],
  "abi": 1,
  "entry": "stamp.mjs",
  "sha256": "9f2c…",
  "assets": [{ "path": "assets/paper-1a2b3c.png", "sha256": "41d8…" }]
}
```

汇总脚本（实验室里是 `packages/template-sdk/scripts/build.mjs` 的最后一步）扫描各模板的 `template.json`，按 `id` 归并成 `registry.json`（14.4 格式）。`sha256` 一律用 Node 内置 `crypto` 计算，不引入依赖。

### 14.6.8 静态校验脚本（`packages/template-sdk/scripts/verify.mjs`）

构建后必须跑一遍，任一条不通过就不出产物：

| 检查 | 判据 |
|---|---|
| 无裸露导入 | 产物中不出现 `import ... from '<非相对说明符>'`；ESM 单文件应当**零 import** |
| 无 React 副本 | 不含 `react.development`、`__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`、`react-dom` 等标记 |
| 无 Node 依赖 | 不含 `require(`、`process.`、`Buffer.` |
| 默认导出存在 | 能动态 `import()` 并断言 `typeof mod.default === 'function'` |
| 工厂可用 | 用一份 mock SDK 调一次工厂，断言返回值含 `meta` / `schema.fields` / `render` |
| 体积上限 | bundle ≤ 8 MB，单 asset ≤ 8 MB |
| 摘要一致 | 重新计算 `sha256` 与 `template.json` 相符 |

其中「用 mock SDK 调一次工厂」是最有价值的一条：它在**发布前**就能抓到 ABI 不匹配、忘了 `__bindSdk`、`defineTemplate` 误用等问题。

### 14.6.9 静态资源策略

- 资源用的 `file` loader 落成 `dist/assets/<name>-<hash>.<ext>`，路径写进清单 `assets[]`。
- 运行时通过 `sdk.resolveAsset('assets/paper-1a2b3c.png')` 取到**本机 URL**（宿主用 `convertFileSrc(baseDir + path)` 拼出），因此**不要写相对路径**：bundle 是从 `blob:` URL 载入的，相对路径没有意义。
- 推荐用一个 esbuild 插件事先改写：作者写 `import paper from './paper.png'`，插件把它替换成 `export default __resolveAsset("assets/paper-1a2b3c.png")`（`__resolveAsset` 从 SDK 垫片导出），作者无需手写路径。
- 小图标可以选 `loader: dataurl` 直接内联，但会进 bundle 体积与 `sha256`，大图不要这么做。
- **SVG 不能直接用 esbuild 的 `dataurl` loader 结果**：该 loader 对文本资源不做编码，产出的是
  `data:image/svg+xml,<?xml version="1.0" …>` 这类原样字符串。放进 HTML 属性没问题，但一旦写进
  CSS `url()`（例如用 `mask-image` 上色）就会因为其中的空格与引号构成非法值，**遮罩静默失效**。
  正确做法是 SVG 走 `text` loader 取源码，再用 `encodeURIComponent`（并把 `(` `)` 也编码）拼成
  `url("data:image/svg+xml,…")`。参考实现与回归断言见 `packages/template-sdk`（`stamp` 模板 + `scripts/smoke.mjs`）。
- 宿主侧 CSP 无需为资源改动：图片走 `convertFileSrc` 与现有照片预览同一条路径（现有 `img-src 'self' asset: https: data:` 已在生产环境承载照片预览；实现时在 Windows 上再验一次 `http://asset.localhost` 是否被匹配，若被拦则补 `http://asset.localhost`）。

### 14.6.10 禁止事项与常见错误

| 写法 | 后果 |
|---|---|
| `import React from 'react'` | 产物带裸导入 → 载入失败；若被 bundle 进去 → hooks 报错 |
| 忘记走生成入口、手写 `export default definition` | `__bindSdk` 未被调用 → 渲染时「模板运行时尚未注入」（宿主写全局可兜底，但不保证） |
| 动态 `import()` 分包 | Blob 载入下无法解析相对分包 |
| 引用应用内的 `@/shared/*`、Tailwind 类名 | 构建期解析失败；即使构建通过，宿主不提供样式 |
| 访问 `window.__TAURI_INTERNALS__` 直接发 IPC | 技术上可行（模板就是这么有权限），但属未定义行为，ABI 不保证 |
| 自己加载网络字体 / 外链图片 | 快照栅格化易跨域失败，且导出结果不稳定 |

### 14.6.11 为什么不选 Vite lib mode / tsup / 手写

- **Vite lib mode**：默认会注入 `import.meta`、CSS 处理与 preload 辅助代码，且要额外压 `rollupOptions` 才能压到「单文件 + 无 import」；对一个只是「TSX → 一个 ESM 文件」的场景太重。
- **tsup**：本质是 esbuild 包装，但少一层可控性，且我们需要的两个自定义插件（别名、资源改写）仍要手写。
- **手写 `.mjs`**：零构建，适合参考实现与最小复现；真实模板作者要 JSX/TS 类型，不现实。
- **esbuild**：仓库已间接依赖（Vite 的依赖，且 `pnpm-workspace.yaml` 已允许其构建脚本），配置 20 行可读可控，产物形态最容易验证。**结论：esbuild + 两个小插件 + 一个校验脚本。**

### 14.6.12 完整可跑示例

参考实现与打包工具链已经落地在 **`packages/template-sdk/`**（源码入库；`dist/`、`preview-dist/`、`preview/public/` 是构建产物，已在 `.gitignore` 中排除）：

```txt
packages/template-sdk/
├─ sdk/                         # SDK 核心：runtime.mjs / jsx-runtime.mjs / index.d.ts / host-validate
├─ templates/
│  ├─ stamp/                    # 测试模板：9 字段，覆盖五种字段类型 + 品牌工具 + 资源内联
│  │  ├─ template.config.json
│  │  ├─ src/index.tsx          # 见 14.6.4 的写法
│  │  └─ assets/postmark.svg
│  └─ filmstrip/                # 测试模板：8 字段，演示 visibleWhen 条件字段
├─ scripts/
│  ├─ build.mjs                 # 打包 + 清单 + 校验 + registry.json
│  ├─ verify.mjs                # 静态校验（单文件、零裸导入、无 React 副本、摘要、工厂可执行）
│  ├─ smoke.mjs                 # Node 侧真实渲染冒烟
│  ├─ build-preview.mjs         # Vite 构建「打包后模板的预览」静态站点
│  └─ serve.mjs                 # 预览站点静态服务器（必须 http，不能用 file://）
├─ preview/                     # 预览页：fetch → Blob → import → 工厂注入 → 画布渲染
├─ dist/                        # 产物（忽略）：<id>.mjs + <id>.template.json + registry.json
└─ preview-dist/                # 产物（忽略）：可静态托管的预览站点
```

实测（2026-10-09，esbuild 0.27.7 / Vite 7.3.5 / React 19.2.7）：两个测试模板分别 9.3 KB 与 13.2 KB，
静态校验与工厂/渲染校验全通过；`smoke.mjs` 断言 `{FocalLength}` / `{FNumber}` / `{ISO}` 等变量确实被宿主实现替换；
清空 `dist/` 后重复构建三次得到同一 `sha256`（可复现）；`tsc -p packages/template-sdk/tsconfig.json` 通过。
细节与命令见 `packages/template-sdk/README.md`。

注意：实验室里的 `packages/template-sdk/sdk/` 就是 14.6.3 描述的那个 SDK 包（包名仍为
`@copicseal/template-sdk`），目前由仓库内直接引用；接入宿主时按 14.12 迁移。

## 14.7 宿主侧实现设计

### 14.7.1 Rust（`src-tauri/`）

新增依赖：

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "gzip"] }
sha2 = "0.10"
```

新增 `src-tauri/src/remote.rs`：

```rust
const MAX_INDEX_BYTES: usize = 512 * 1024;
const MAX_BUNDLE_BYTES: usize = 8 * 1024 * 1024;

/// 模板落地根目录：app_config_dir()/Templates（与 data.db 同处应用配置目录）
fn templates_root(app: &tauri::AppHandle) -> Result<PathBuf, String>;

/// GET 文本（注册表清单）：限大小 + 超时 15s
#[tauri::command] pub async fn fetch_source(url: String) -> Result<String, String>;

#[derive(Deserialize)] pub struct RemoteAssetRef { pub path: String, pub sha256: Option<String> }

/// 下载 entry(+assets) → 逐个校验 sha256 → 原子落盘 → upsert DB → 返回记录
#[tauri::command] pub async fn install_comark_template(
    app: tauri::AppHandle,
    registry_id: String, registry_url: String, template_id: String,
    name: String, version: String, description: Option<String>,
    author: Option<String>, license: Option<String>,
    index_url: String, entry: String, entry_sha256: String,
    assets: Vec<RemoteAssetRef>, enabled: bool,
) -> Result<ComarkTemplateRecord, String>;

/// 载入已安装模板：bundle 文本 + 清单 + 落地目录（前端做 Blob → import）
#[derive(Serialize)] pub struct LoadedComarkBundle {
    pub source: String,
    pub manifest: serde_json::Value,
    pub base_dir: String,
}
#[tauri::command] pub fn read_comark_bundle(app: tauri::AppHandle, id: String) -> Result<LoadedComarkBundle, String>;
```

实现要点：

- 布局 `Templates/<registry_id>/<template_id>/<version>/{template.mjs, template.json, assets/}`；`local_path` 存 entry 绝对路径。**版本进路径**，更新即新 URL，避免模块缓存串版本。
- 下载先写 `<file>.part` 再 `rename`（与 `fs.rs` 缩略图的原子替换一致）；任一步失败清理整个 `<version>/` 目录。
- `sha256` 边下边算，不匹配即删临时文件并返回「模板文件校验失败」。
- `registry_id` / `template_id` / asset `path` 白名单校验 + 拒绝 `..`，且最终路径必须 `canonicalize` 后仍位于 `templates_root` 内。
- 成功后复用 `comark::upsert` 写 DB（`source_type = "remote"`、`registry_url` 存注册表 URL、`enabled` 用入参）。

`src-tauri/src/comark.rs`：`remove_comark_template` 在删 DB 行后改删「`<template_id>` 目录树」（保留 `built_in` 拒删与「至少保留一个启用」的现有守卫）。

`src-tauri/src/config.rs`：`TemplateListConfig::default()` 的 `remote_registry` 预置官方注册表，URL 收敛到一个常量便于替换：

```rust
pub const OFFICIAL_TEMPLATE_REGISTRY_URL: &str = "https://templates.copicseal.com/index.json"; // 占位，待确认
```

`src-tauri/src/lib.rs`：注册 3 个新命令。

### 14.7.2 平台层（`src/platform/`）

- `contracts/index.ts`：新增 `ComarkRegistryIndex` / `ComarkRegistryEntry` / `ComarkAssetRef` / `LoadedComarkBundle`；`ComarkTemplateRecord.source_type` 收紧为 `'built_in' | 'remote'`。
- `providers/tauri/api.ts`：包装 `fetchTemplateRegistry` / `installRemoteTemplate` / `readComarkBundle`。
- `providers/platform-runtime.ts`：web 桩——读注册表返回 `null`、安装与载入抛「网页端不支持远程模板」（与字体导入的 web 桩风格一致）。
- `services/template-defaults-service.ts`：新增 `resolveTemplateRegistries()` / `saveTemplateRegistries()`（沿用「整段读配置 + 只替换该字段」的现有写法）。
- 不新增 `Platform` 能力位、不加服务类——沿用字体功能「api 包装 + 运行时桩」的既有模式，避免多余分层。

### 14.7.3 运行时注册表（内置 + 远程 overlay）

新增 `src/features/template/remote/`：

| 文件 | 职责 |
|---|---|
| `abi.ts` | `REMOTE_TEMPLATE_ABI`、SDK 类型、`createRemoteTemplateSdk()` |
| `manifest.ts` | 清单与 bundle 元信息校验（abi、id、sha256 格式、字段合法性） |
| `loader.ts` | 读文本 → `Blob` → `import(/* @vite-ignore */ blobUrl)` → `factory(sdk)` → 形状校验 → 覆盖 `meta.id` → 返回 `RegisteredTemplate`；工厂返回后 `URL.revokeObjectURL` |
| `error-boundary.tsx` | 渲染远程模板的 Error Boundary：显示模板名与原因、禁用导出，不影响其他模板 |
| `types.ts` | 前端侧的注册表/安装/错误态类型 |

改造 `runtime/template-registry.ts`：

- 模块级 overlay：`const remoteTemplates = new Map<string, RegisteredTemplate>()`，配 `registerRemoteTemplates(list)` / `clearRemoteTemplates()`。
- 查找语义：`getTemplateById` = 内置优先 → overlay；`resolveTemplate` 回退顺序 = 指定 id → 内置默认 → 任一已注册（保证预览永远有渲染目标，沿用现有「任何非法 ID 都回退默认」的语义）。
- 统一改名以表达「内置 + 远程」：`listBuiltinTemplates`→`listTemplates`、`getBuiltinTemplateById`→`getTemplateById`、`getBuiltinTemplateSchema`→`getTemplateSchema`、`resolveBuiltinTemplate`→`resolveTemplate`。
  调用方共 6 处文件：`runtime/template-runtime.tsx`、`store/use-template-store.ts`、`lib/template-preset.ts`、`components/template-page.tsx`、`components/template-preview.tsx`、`components/template-selector.tsx`（`background.ts` 只用 `normalizeParams`，不受影响）。
- 同步 `runtime/index.ts` 与 `features/template/exports.ts` 的 barrel。

`runtime/template-runtime.tsx`：改用 `resolveTemplate`；远程模板的渲染包进 Error Boundary。

**加载顺序**：宿主**串行** await 每个模板的载入（避免 SDK 全局兜底在并发下串台），单个失败只记录并跳过。

### 14.7.4 状态管理

`src/features/template/remote/store/use-remote-template-store.ts`（zustand，沿用 `useFontLibrary` 的模块级 store 模式，保证设置页与模板页共享同一份）：

```ts
interface RemoteTemplateState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  revision: number;                                  // 注册表变更计数，供渲染方订阅
  registries: TemplateRegistry[];
  installed: ComarkTemplateRecord[];
  available: Record<string, ComarkRegistryEntry[]>;   // registryId → 条目
  errors: Record<string, string>;                     // registryId → 失败原因
  loadInstalled(): Promise<void>;                     // 启用的远程模板 → 加载 → 注册
  addRegistry(name: string, url: string): Promise<void>;
  removeRegistry(id: string): Promise<void>;
  refreshRegistry(registryId?: string): Promise<void>;
  install(entry: ComarkRegistryEntry, registry: TemplateRegistry): Promise<void>;
  remove(id: string): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
}
export function useRemoteTemplateRevision(): number;   // 渲染路径订阅用
```

- 启动只加载「已安装且启用」的模板；`revision` 变化触发模板页重渲染（晚到的注册也能生效）。
- `use-template-store.ts` 的配置逻辑不动，只跟随 14.7.3 的改名。

### 14.7.5 UI

**设置页**（`src/features/settings/`）：

- `settings-page.tsx`：`TAB_GROUPS` 的「边框水印」组新增 `{ id: 'template-remote', label: '模板' }`（排在「模板预设」之后），并挂对应 `TabsContent`；锚点映射表同步。
- 新组件 `remote-templates-tab.tsx`（只用现有 `shared/ui` 原语：`Dialog` / `Button` / `Input` / `Switch` / `Select` / `Collapsible` / `ScrollArea`），三个分区：
  1. **注册表**：官方（不可删除）+ 自定义列表（名称、URL、刷新、移除）；「添加注册表」校验 `http(s)`、去重。
  2. **可用模板**：按注册表分组，显示名称/版本/作者/许可/标签/描述 + 「安装」或「更新到 x.y.z」；每个注册表独立错误行 + 重试。
  3. **已安装**：启用 `Switch`、版本、来源、更新时间、删除（二次确认）。
- **安装确认文案（必须出现）**：「远程模板是第三方可执行代码，安装后将以与 Copicseal 相同的权限运行（可读写本机文件、访问网络）。请仅安装你信任来源的模板。」+ 必须勾选才能点「安装」。
- web 端显示「网页端不支持远程模板」的只读提示。

**模板页**：

- `template-selector.tsx`：数据源改 `listTemplates()`；用 `SelectGroup` + `SelectLabel` 按来源分组（内置 / 各注册表名），条目显示来源；损坏模板不出现；收藏与最近使用逻辑不变（对远程 id 同样生效）。
- `template-page.tsx`：挂载时触发 `loadInstalled()`，并用 `useRemoteTemplateRevision()` 订阅。
- 属性面板**不新增任何手写表单**：远程模板的字段来自它自己的 `schema`，与内置走同一条生成路径（03 文档的硬约束）。

### 14.7.6 CSP 变更

`src-tauri/tauri.conf.json` → `app.security.csp`：`script-src 'self'` 改为 `script-src 'self' blob:`。

- 选 **Blob 而非 asset 协议**：避开 Windows 的 `http://asset.localhost` 与 asset 协议的 MIME/CORS 不确定性；bundle 文本由 Rust 读回，MIME 由我们指定。
- 除这一处外不改动安全策略；`asset:` **不**加入 `script-src`。

## 14.8 数据流

```txt
设置 →「模板」页
  └─ resolveTemplateRegistries()        ← config.template_list.remote_registry
  └─ fetchTemplateRegistry(url)         ← Rust: fetch_source（reqwest / 15s）
  └─ 安装：确认弹窗 → install_comark_template(...)
         └─ Rust: 下载 → sha256 校验 → 原子落盘 → upsert DB
         └─ 返回 ComarkTemplateRecord

启动 / 模板页挂载
  └─ list_comark_templates() → 过滤 source_type='remote' && enabled
     └─ read_comark_bundle(id) → { source, manifest, base_dir }
        └─ Blob → import()（CSP: script-src blob:）
           └─ factory(sdk) → 校验 → registerRemoteTemplates() → revision++
  └─ 下拉 / TemplateRuntime / 属性面板 统一走 getTemplateById()
```

## 14.9 边界与失败模式

| 场景 | 行为 |
|---|---|
| 注册表不可达 / 404 / TLS 失败 / 超时 | 该注册表行显示错误 + 重试；其他注册表不受影响 |
| 清单非法 / abi 不匹配 / id 非法 | 拒绝该注册表或该条目，给出可读原因 |
| 远程 id 与内置 id 相同 | 宿主加 `<registryId>/` 前缀，天然不冲突 |
| `sha256` 不匹配 | 中止安装、删临时文件、报「模板文件校验失败」 |
| bundle 语法错误 / 工厂抛错 / 返回值非法 | 标为「损坏」，不进下拉；设置页提供「重新安装 / 删除」 |
| 缺少 `[data-co-photo]` | 属性面板给明确警告（缩放档位与自适应依赖该句柄） |
| 渲染期抛错 | Error Boundary 显示模板名与原因、禁用导出，其他模板不受影响 |
| 工作区目录被改 | 不受影响：模板落在**应用配置目录** `Templates/`（与 `Fonts/` 不同，属有意取舍） |
| 删除被引用的模板 | 沿用现有回退：照片回默认模板、预设标「模板已失效」 |
| 关闭全部远程模板 | 内置 6 个模板始终可用 |
| 离线 | 已安装模板照常加载（本地文件），仅注册表刷新失败 |
| 更新 | 版本进路径 → 新 URL → 不命中旧模块缓存；成功后清理旧版本目录 |

## 14.10 测试与验收

仓库无前端测试运行器（无 vitest），因此验证 = 静态检查 + 打包校验 + 本地 E2E。

1. **静态**：`pnpm build`（`tsc && vite build`）、`pnpm ci`（biome）、`pnpm check:rust`（`cargo fmt --check` + `clippy -D warnings`）。
2. **打包校验**：`packages/template-sdk/scripts/verify.mjs` 全项通过（14.6.8），尤其「用宿主 SDK 调一次工厂」。
3. **Rust 边界**：`sha256` 校验、大小上限、路径穿越拒绝、失败清理（纯函数部分用 `#[cfg(test)]` 覆盖，I/O 部分走 E2E）。
4. **本地 E2E**（`pnpm dev` + `node packages/template-sdk/scripts/serve.mjs`）：
   添加注册表 `http://127.0.0.1:8788/registry.json` → 刷新 → 安装 `stamp`（确认弹窗）→ 模板页下拉出现「复古邮票」→ 选用 → 改参数看预览 → 导出 PNG/JPG → 存模板预设并应用 → 删除模板 → 照片回默认模板 + 预设标失效。
5. **反向用例**：篡改 bundle 使 `sha256` 不匹配 → 安装失败且磁盘无残留；把 `abi` 改成 99 → 条目不可安装；删除 bundle 文件后重启 → 该模板被跳过并提示，其余正常；注册表返回非法 JSON → 只该行报错。
6. **CSP 核对**：仅新增 `blob:`；确认 `asset:` 未被加进 `script-src`；Windows 上验证模板资源（`convertFileSrc`）能显示。

## 14.11 假设与待确认

1. **官方注册表 URL 为占位值** `https://templates.copicseal.com/index.json`（集中在 `config.rs` 的 `OFFICIAL_TEMPLATE_REGISTRY_URL`）。给出真实地址（或改走 GitHub Raw）后替换即可。
2. 模板落地在**应用配置目录** `Templates/`（与 `data.db` 同级），不放工作区——理由是模板属程序代码而非用户文档资产。若要求与 `Fonts/` 一致放工作区，此处可单独替换。
3. 新增 Rust 依赖 `reqwest`(rustls-tls) 与 `sha2`；不引入 `tauri-plugin-http`（自有命令足够，且少一层权限配置）。
4. CSP 仅增加 `script-src blob:`。
5. `template_list.enabled`（内置模板启用清单）本期不接线；远程模板启用状态以 DB 的 `enabled` 为唯一真相源，并在 13 的 E5 登记。
6. v1 不校验注册表签名，依赖 HTTPS + 清单 `sha256` + 逐次用户确认。
7. 不修改 `src/shared/ui/` 下任何 shadcn 组件源码（只用组合与 `className` 扩展），因此无需更新 `src/shared/ui/README.md`。
8. SDK 类型与宿主模板类型本期是两份文件（有漂移风险），见 14.12。

## 14.12 后续项

| 项 | 说明 |
|---|---|
| 注册表签名 | 每个注册表固定一个 ed25519 公钥，清单带签名；未签名的第三方注册表在 UI 上明确标注「未验证」 |
| 模板沙箱 | 独立渲染宿主 + 快照回传，或改用非可执行的数据模板；与导出链路一并重新设计 |
| SDK 发布 | 把 `packages/template-sdk/sdk` 发布到 npm，并做类型单一真相源（从宿主 `types.ts` 生成 `index.d.ts`） |
| 模板市场能力 | 搜索、分类、评分、更新通知 |
| `template_list.enabled` | 决定接线为「内置模板启用清单」还是删除，与 13 的 E5 一起拍板 |
