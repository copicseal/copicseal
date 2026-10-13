# 更多功能（小工具面板）

## 1. 定位

左侧导航栏的 **更多功能** 图标打开一个面板，用来收纳「不值得占一个一级入口、但偶尔要用」的小工具。
面板结构参考常见客户端：

```txt
更多功能                                    [管理]
已添加功能
  ┌──────┐ ┌──────┐
  │ 快门数 │ │  …   │
  └──────┘ └──────┘
未添加功能
  ┌──────┐ ┌──────┐
  │  …   │ │  …   │
  └──────┘ └──────┘
```

- **管理** 切换管理态：管理态下点格子就在两边来回移动（启用 / 停用），格子右上角显示 `+` / `−`
- **已添加的功能会出现在左侧导航栏**（与「边框」「拼图」同级），点进去是**独立页面** `/tools/<id>`
  （`tool-page.tsx`，带自己的窗口头与滚动容器）；面板非管理态点格子＝直接进入该页面，
  面板本身只做「加 / 减」，不在这里展开功能内容

## 2. 数据与状态

| 位置 | 内容 |
|------|------|
| `config.tools.enabled` | 已添加（启用）的功能 id 数组，**顺序即展示顺序** |
| `src/features/tools/registry.ts` | 功能注册表（静态）：id、名称/说明文案 key、图标、默认启用状态、懒加载入口 |
| `useTemplateStore` | `enabledTools` / `setEnabledTools`：面板与侧栏共享的镜像 |

约定：

- 配置里**没有** `tools` 段（老配置）→ 按注册表里的 `defaultEnabled` 渲染，且**不写回配置**；只有用户真的动过开关才落盘
- 配置里出现注册表已不存在的 id → 前端忽略（不报错、不丢数据），这样降级/回滚版本不会连累用户配置
- Rust 侧只存字符串数组（`ToolConfig`），不认识具体功能，因此新增功能**不需要改 Rust**

## 3. 新增一个功能

1. 在 `src/features/tools/registry.ts` 里加一条：`id`、`nameKey` / `descriptionKey`（i18n）、`icon`、`defaultEnabled`、`load`
2. 实现 `load()` 指向的组件，签名是 `({ onBack }: ToolViewProps) => ReactNode`
3. `load()` 必须**动态 import** 重依赖（WASM、大解析库）；主包不能带上它们
4. 需要新的配置项时，走 `config.<section>` + Rust 镜像（照 `devices` / `logos` / `tools` 的写法）

## 4. 快门数查询（第一个功能）

### 4.1 能力抽象（为插件化预留）

```ts
interface ShutterCountProvider {
  id: string;
  label: string;                                  // 展示在结果里的「解析器」
  isAvailable(): Promise<boolean>;                // 插件未安装时返回 false，自动回退
  read(input: { bytes: Uint8Array; fileName: string }): Promise<ShutterCountResult>;
}
```

- `provider.ts` 提供 `registerShutterCountProvider(provider, { priority })` 与 `readShutterCount(input)`
- `readShutterCount` 按优先级依次尝试可用实现，第一个成功的胜出；全部失败抛最后一个错误
- 现在只有 `providers/exiftool-wasm.ts` 一个实现（priority 100）

**为什么这样切**：以后要像 libheif 那样把解析能力做成插件（宿主侧原生实现、按需下载安装）时，
插件宿主只要注册一个更低 priority 的 provider，UI 与数据结构都不用动 —— 结果里会显示实际使用的解析器名称。

### 4.2 取值口径

候选标签按「语义最准确 → 最次」排序，取第一个有值的：

```txt
ShutterCount → ShutterCount2 → ShutterCount3 → MechanicalShutterCount
             → ShutterActuations → ImageNumber
```

- 传给 ExifTool 的参数是 `-json -n`（`-n` 保证数值不被格式化成带千分位的字符串）
- 读不到时 `shutterCount` 为 `null`：界面显示「这个文件里没有快门数字段」并解释常见原因，
  **不允许用 0 顶替**
- 一并取回机身序列号 / 固件 / 文件序号等字段，便于排查不同机型的口径差异

### 4.3 失败语义

| 情况 | 行为 |
|------|------|
| 照片被编辑 / 二次导出 / 手机拍摄 | 提示「没有快门数字段」+ 常见原因，不报错 |
| 文件超过 100 MB | 直接拒绝（整份文件要进 JS 内存） |
| 解析抛错 | 显示可读错误 + 保留「换一个文件」入口 |
| 首次解析较慢 | 显示「正在解析…（首次要加载解析器）」 |

## 5. 第三方组件与体积

| 组件 | 许可 | 说明 |
|------|------|------|
| `@uswriting/exiftool` | Apache-2.0 | ExifTool 的 WASM 封装 |
| `@6over3/zeroperl-ts`（其依赖） | Apache-2.0（wrapper） | WASM 版 Perl 运行时；**解包 48.9 MB**（esm / cjs 各一份 24.2 MB 的 `zeroperl.wasm`） |
| ExifTool / Perl（打包在 zeroperl 内） | Artistic-1.0 或 GPL-1.0+（双许可） | 随包分发走 Artistic 分支，**需要在应用内提供第三方许可声明**（见 TODO） |

- 实际进包的是**被引用的那一份** wasm（约 24 MB，ESM 版）；`dist` 增量以打包实测为准
- 打包版必须给 CSP 加 `'wasm-unsafe-eval'`（`src-tauri/tauri.conf.json`）：Chromium 系在 `script-src 'self'`
  下会拒绝 WASM 实例化。开发模式页面由 Vite 提供，不套用这份 CSP，所以**必须在打包版里验**

#### wasm 资源地址为什么需要手动接管

zeroperl 的浏览器分支用**写死的相对路径**取运行时：

```js
a = await (await (e ?? fetch)("./zeroperl.wasm")).arrayBuffer();
```

也就是说它相对**页面**去取 —— 在 Vite 下必然取错（dev 时根路径没有该文件、打包后资源名带 hash），
结果是 404 拿到 `index.html`，报成
`CompileError: WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 64 6f`（`<!do`）。

好在那个 `e` 是外部注入的 fetch（由 `@uswriting/exiftool` 的 `fetch` 选项一路透传），所以
`providers/exiftool-wasm.ts` 里：

1. `import zeroperlWasmUrl from '@6over3/zeroperl-ts/zeroperl.wasm?url'`（该子路径在包的 `exports` 里）
2. 给 `parseMetadata` 传一个自定义 `fetch`，把 `zeroperl.wasm` 那次请求改指到这个资源地址

因此 `@6over3/zeroperl-ts` 是**直接依赖**（不是只靠 exiftool 的传递依赖），版本需与之一致。

#### 还必须在 vite 里显式切分 chunk

这两个包是 CJS/互操作形态，Rollup 的 commonjs 插件会把它们并进**入口 chunk**（构建时还会警告跨 chunk 循环），
于是「动态 import」白做。`vite.config.ts` 里用 `build.rollupOptions.output.manualChunks` 把
`@uswriting/exiftool` 与 `zeroperl` 单独切成 `exiftool` chunk：这样入口的解析量少一块、也消掉了跨 chunk 循环告警。
（注意：web 端的 EXIF 适配器是**静态**依赖 ExifTool 的，所以桌面端这个 chunk 仍会随应用加载；
真正按需的只有 24 MB 的 wasm 资源。）

实测（`pnpm build` 后的 `dist`）：

| 产物 | 体积 |
|------|------|
| 入口 `index-*.js` | 约 1.52 MB（切分前 1.69 MB） |
| `exiftool-*.js`（懒加载） | 约 136 KB |
| `shutter-count-view-*.js`（懒加载） | 约 5.5 KB |
| `zeroperl-*.wasm`（运行时按需 fetch） | **24.18 MB**（gzip 约 7.5 MB） |

> 本机若 `vite build` 报 `[vite:esbuild-transpile] remove …\Temp\esbuild-*: Access is denied`，
> 把临时目录指到可写位置即可（例如 `$env:TEMP='…/src-tauri/target/vite-tmp'`），与代码无关。

## 6. 相关文件

| 区域 | 文件 |
|------|------|
| 注册表 | `src/features/tools/registry.ts` |
| 功能页面 | `src/features/tools/tool-page.tsx`；路由 `src/app/routes.ts`（`/tools/<id>`）与 `src/app/app.tsx` 的 `renderPage` |
| 面板（管理入口） | `src/features/tools/more-tools-dialog.tsx` |
| 开关持久化 | `src/features/tools/lib/tool-settings.ts`、`config.tools`（Rust `ToolConfig`） |
| 快门数 | `src/features/tools/shutter-count/{provider.ts,providers/exiftool-wasm.ts,shutter-count-view.tsx}` |
| 入口 | `src/shared/components/co-sidebar.tsx` |
| CSP | `src-tauri/tauri.conf.json` |
