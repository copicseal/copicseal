# Copicseal 远程模板 SDK 实验室

> **源码入库，构建产物不入库**：`sdk/`、`templates/`、`scripts/`、`preview/` 都提交；
> `dist/`、`preview-dist/`、`preview/public/` 由脚本生成，已在仓库根 `.gitignore` 中排除。
> 设计依据与宿主侧方案见 [docs/14-remote-template-registry.md](../../docs/14-remote-template-registry.md)。

这里的目的是把「远程模板」这条链路**先跑通、能看、能验**，再决定怎么接进宿主：

```txt
SDK 核心（作者侧垫片 + 类型）
   ↓ 被打进模板包
测试模板（TSX 源码 → 单文件 ESM 产物）
   ↓ 打包产物
打包后的模板预览（浏览器里按宿主的加载步骤真实渲染）
```

## 目录结构

```txt
packages/template-sdk/            # 本实验室
├─ sdk/                           # ① SDK 核心（包名 @copicseal/template-sdk）
│  ├─ runtime.mjs                 #   运行时垫片（不含 React，宿主注入）
│  ├─ jsx-runtime.mjs             #   JSX 自动运行时的出口
│  ├─ index.d.ts                  #   作者可见类型（字段/schema/注入 props…）
│  ├─ host-validate.mjs(.d.mts)   #   宿主侧形状校验：定义合法性与默认参数
│  └─ package.json                #   exports: "." / "./jsx-runtime" / "./host-validate"
├─ templates/                     # ② 测试模板
│  ├─ stamp/                      #   复古邮票：9 字段，覆盖五种类型 + 品牌 + 资源打包
│  │  ├─ template.config.json     #   元信息（id/name/version/author/license/tags/abi）
│  │  ├─ src/index.tsx            #   作者写的模板源码
│  │  └─ assets/postmark.svg      #   静态资源（打包成 data URL 内联）
│  └─ filmstrip/                  #   胶片条：8 字段，演示 visibleWhen 条件字段
├─ scripts/
│  ├─ lib/esbuild.mjs             #   定位 esbuild（pnpm store）+ SDK 别名 + @/ 别名
│  ├─ lib/host-sdk.node.ts        #   Node 精简宿主 SDK（校验/冒烟用，React external）
│  ├─ lib/mock.mjs                #   假照片（data URL SVG）与假 EXIF
│  ├─ build.mjs                   #   打包 + 清单 + 校验 + registry.json
│  ├─ verify.mjs                  #   静态校验（也可单独跑）
│  ├─ smoke.mjs                   #   Node 侧真实渲染冒烟（断言内容）
│  ├─ build-preview.mjs           #   组装 public + Vite 构建预览页
│  └─ serve.mjs                   #   预览页静态服务器（必须 http，不能用 file://）
├─ preview/                       # ③ 打包后模板的预览页源码
│  ├─ index.html / main.tsx       #   三栏：模板列表 / 画布 / 元信息与参数
│  ├─ host-sdk.ts                 #   浏览器宿主 SDK（直接引用仓库 src/ 的真实实现）
│  ├─ loader.ts                   #   与宿主同步骤的载入：文本 → Blob → import → 校验
│  └─ mock-data.ts                #   （浏览器版假数据，与 scripts/lib/mock.mjs 同源）
├─ dist/                          # 产物（忽略）：<id>.mjs + <id>.template.json + registry.json
└─ preview-dist/                  # 产物（忽略）：可静态托管的预览站点
```

## 快速开始

本机 PATH 上的 `node` 可能过旧（本机是 v12），请用 DSH 自带的 Node 24：

```powershell
$node = 'C:\Users\keli.yu\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

cd F:\temp\copicseal\packages\template-sdk
& $node scripts/build.mjs          # 打包两个测试模板 + 校验 + 生成 registry.json
& $node scripts/build-preview.mjs  # 构建预览页 → preview-dist/
& $node scripts/smoke.mjs          # Node 侧真实渲染冒烟
& $node scripts/serve.mjs          # 打开 http://127.0.0.1:8790/
```

类型检查（用仓库自带的 TypeScript）：

```powershell
& $node ..\..\node_modules\typescript\bin\tsc -p tsconfig.json
```

仓库根目录的 `pnpm` 脚本也能用（前提是 PATH 上的 `node` 足够新）：

```powershell
pnpm --dir packages/template-sdk build / preview / smoke / serve
```

依赖全部复用仓库根 `node_modules`（esbuild / Vite / React / TypeScript），**不需要**在实验室目录里再装一次。

## 本次实测结果（2026-10-09）

| 检查 | 结果 |
|---|---|
| `scripts/build.mjs` | esbuild 0.27.7；`filmstrip@0.2.0` 9.4 KB、`stamp@1.0.0` 13.4 KB，两个都通过校验 |
| 校验内容 | 单文件 ESM、零裸导入、无 React 副本、无 `require/process/Buffer`、sha256 与清单一致、工厂可执行、schema 合法、渲染结果含 `[data-co-photo]` |
| 可复现性 | 三次「清空 dist 后重建」得到同一 sha256（`stamp` = `76ddabc24163d825…`） |
| `scripts/smoke.mjs` | 2/2 通过；filmstrip 8 字段渲染 1825 字符、stamp 9 字段渲染 5656 字符；断言 `35mm` / `f/1.8` / `ISO 100` / 机型文案都被真实替换，并断言邮戳的 CSS 遮罩是**编码后**的 data URL |
| 反向验证 | 篡改产物（加裸导入 + `process` + 改内容）后，校验门报出全部 3 类问题 |
| `tsc -p tsconfig.json` | 通过（含被别名引入的仓库 `src/` 代码） |
| `biome check packages/template-sdk` | 28 个文件全绿（仓库 `biome.json` 已把 `packages/**` 纳入，`pnpm ci` 现在也扫这里） |
| `scripts/build-preview.mjs` | Vite 7.3.5，104 模块，`preview-dist/` 产出；品牌 Logo 资源来自仓库 `src/assets/logos/` |
| HTTP 抽检 | `/` 200 html、`/registry.json` 200 json、`/templates/stamp.mjs` 200 `text/javascript` |

产物示例（`dist/registry.json` 片段）：

```json
{ "id": "stamp", "name": "复古邮票", "version": "1.0.0", "abi": 1,
  "entry": "stamp.mjs",
  "sha256": "76ddabc24163d8257824605c821967b39d58744b91a25417533eb50dbcfb7f87",
  "assets": [] }
```

## 打包约定（本次实现的部分）

模板包 = **单文件 ESM**，默认导出工厂 `(sdk) => RegisteredTemplate`：

```js
// 由 scripts/build.mjs 生成（templates/<id>/.build-entry.mjs）
import { __bindSdk } from '@copicseal/template-sdk';
import definition from './src/index.tsx';

export default function createTemplate(sdk) {
  __bindSdk(sdk);   // 先绑定宿主运行时
  return definition;
}
```

关键点：

- **React 不进包**：`jsx` / `jsxs` / `Fragment` / hooks 都由宿主注入（SDK 垫片转发），否则模板里的 `useState` 会打到另一份 React 上。
- **不留裸导入**：构建时 `jsxImportSource` 指向 SDK，`@copicseal/template-sdk` 由 esbuild 插件解析到垫片；宿主用 Blob URL 载入，任何非相对说明符都解析不了。
- **静态资源内联**：位图走 `dataurl` loader（esbuild 对二进制会 base64 编码，放进 CSS `url()` 也安全）；
  **SVG 走 `text` loader** —— esbuild 的 `dataurl` 对**文本资源不做编码**，原样塞进 `url(data:image/svg+xml,<?xml …)`
  会因为里面的空格与引号变成非法值，遮罩会静默失效，所以 SVG 需要模板自己百分号编码
  （示例见 `templates/stamp/src/index.tsx` 的 `postmarkUrl`）。需外置资源时改走清单 `assets` + `sdk.resolveAsset`，见 docs/14 §14.6.9。
- **不压缩**（`minify: false`）：用户安装的是可执行代码，保留可审查性；`legalComments: inline` 保留许可证注释。

## 预览页做了什么

预览页刻意**照抄宿主的加载步骤**，因此在浏览器里就能验证「宿主将来要走的这条路」：

1. `fetch('registry.json')` → 列出模板（名称/版本/作者/许可/标签/sha256）；
2. 选中模板 → `fetch('templates/<entry>')` 取文本 → `Blob` → `import(blobUrl)` → 默认导出工厂；
3. `factory(createHostSdk({registryId, templateId}))` → `assertTemplateDefinition` 校验；
4. 画布按 `--co-base` 渲染，属性控件**全部由 schema 生成**（含 `visibleWhen` 条件显示）；
5. 渲染异常由 Error Boundary 兜住，只影响该模板。

宿主 SDK 的差异只有一处（都已注明）：

| 位置 | 差异 |
|---|---|
| `preview/host-sdk.ts`（浏览器） | 工具函数**直接引用仓库 `src/` 的真实实现**，品牌 Logo 也走真实 `brand.ts`（含 `import.meta.glob`，所以预览必须用 Vite 构建） |
| `scripts/lib/host-sdk.node.ts`（Node） | `brand.ts` 用了 Vite 专有 API，esbuild 打不出来，因此品牌工具退化为去空格 + Logo 返回 null；其余同样是真实实现 |

## 接进宿主时要搬什么

| 现在的位置 | 目标位置 |
|---|---|
| `sdk/`（垫片 + 类型） | 独立发布为 `@copicseal/template-sdk`（或留在仓库内供官方模板使用）；类型应从宿主 `types.ts` 生成，避免两份漂移 |
| `sdk/host-validate.mjs` | `src/features/template/remote/validate.ts` |
| `preview/loader.ts` | `src/features/template/remote/loader.ts`（把 `fetch` 换成 Rust 读回的 bundle 文本） |
| `scripts/build.mjs` 的构建配置 | 模板作者侧的官方构建脚本（发布到 `@copicseal/template-sdk` 的 `bin`） |

## 已知限制

- 两个测试模板**不使用**外置资源清单（`assets` + `resolveAsset`）：资源目前走 `dataurl` 内联，机制已按 docs/14 设计但未在本目录演练。
- Node 侧宿主的品牌工具是削弱版（原因见上表），品牌展示只在浏览器预览里验证。
- 预览页的假照片/假 EXIF 是为了让渲染可复现；它不覆盖宿主真实的 EXIF 读取路径。
- 建议**从仓库根目录**启动预览服务（`node packages/template-sdk/scripts/serve.mjs`）：把一个进程的工作目录设在本实验室目录里，会让该目录在进程存活期间无法被移动或删除（Windows 的目录占用限制）。
- 本目录**不参与应用的构建**（`pnpm build` 只处理 `src/`），但代码检查已合并进仓库 Biome 配置：
  `biome.json` 的 `files.includes` 加了 `packages/**`，`pnpm ci` = `biome ci src/ packages/`。
