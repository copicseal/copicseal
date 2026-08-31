# 11 — 平台能力抽象与 Provider 改造方案

## 概述

Copicseal 是一个 Web-first 的跨平台图片应用：同一套 React 业务代码必须能在浏览器中独立运行，并可由 Tauri 提供桌面端的高性能与系统集成能力。

本章定义平台能力的边界、Provider 链和渐进迁移方式。它不要求所有运行环境拥有相同的原生能力；统一的是接口语义、错误语义和用户可理解的降级体验。

---

## 11.1 改造目标

- 业务与 feature 层不直接依赖 Tauri API、浏览器 API、Node.js 或 Rust IPC。
- Web 是一等运行平台：可完成导入、预览、编辑和导出的核心工作流。
- Tauri 桌面端优先使用 Rust 能力，并在某项能力未实现或不支持时按需降级到 Web Provider。
- 平台差异通过能力声明和友好提示暴露，不能伪造浏览器无法提供的文件系统或系统能力。
- 图片处理引擎不进入业务层，统一通过 Image Contract 提供能力。

业务调用的目标形态：

```ts
await platform.image.resize(options);
await platform.files.save(output);
await platform.dialog.pickImages();
```

禁止在 `features/`、`features/template/runtime/` 或 `core/` 中直接调用 `invoke`、`window.__TAURI__`、`showOpenFilePicker` 等宿主 API。

---

## 11.2 分层与目录建议

```txt
features / core
          │
          ▼
       platform
├── contracts/       # 面向业务的稳定接口和数据类型
├── services/        # Provider 编排、降级与结果归一化
├── providers/
│   ├── tauri/       # Rust IPC 与桌面系统能力
│   ├── web/         # Browser API、Canvas、WebCodecs 或 WASM
│   └── wasm/        # 可选的跨平台图片处理实现
├── capabilities.ts
├── errors.ts
└── index.ts
```

现有 `bridge/` 可在迁移期间保留为 Tauri Provider 的内部适配层，但不能继续成为 feature 的公开依赖。待所有调用点迁移完成后，再移除或收敛该目录。

职责划分：

| 层 | 职责 |
|---|---|
| Contract | 定义跨平台的操作语义、输入、输出与错误码 |
| Provider | 将某一宿主或引擎能力实现为 Contract |
| Service | 按优先级调用 Provider，负责选择性降级和执行元数据 |
| Platform | 组合服务、能力集和运行时初始化，作为业务的唯一入口 |

Provider 之间不得相互调用。降级逻辑只属于 Service。

---

## 11.3 Platform Contract

统一入口包含以下能力域：

```ts
export interface Platform {
  readonly image: ImageService;
  readonly files: FileService;
  readonly storage: StorageService;
  readonly dialog: DialogService;
  readonly clipboard: ClipboardService;
  readonly system: SystemService;
  readonly window: WindowService;
  readonly capabilities: PlatformCapabilities;
}
```

Contract 应使用跨平台数据，而不是把桌面路径泄漏到业务层。图片输入、输出可使用 `Blob`、`Uint8Array`、MIME type、文件名和可选的用户授予文件句柄等抽象；只有桌面 Provider 的内部实现才处理本地路径。

### 图片能力

第一批稳定接口包括：

- 解码与基础元数据读取
- 缩放、裁剪、旋转、翻转
- 模糊、合成、扩展画布和透明度处理
- JPEG、PNG、WebP 的编码
- 预览缩略图生成

图片操作的结果需带有执行信息，供性能分析和问题排查使用：

```ts
interface ImageResult {
  data: Blob | Uint8Array;
  mimeType: string;
  meta: {
    provider: string;
    durationMs: number;
    fallbackFrom?: string[];
  };
}
```

完整 EXIF 解析与写入仍是独立的元数据能力；图片编解码 Provider 不应替代专业的元数据处理链路。

### 文件、存储与系统能力

| 能力域 | 桌面端优先实现 | Web 实现或降级 |
|---|---|---|
| 文件 | 系统选择器、读写任意用户授权路径、打开目录 | File API、File System Access API；不支持时下载导出 |
| 存储 | SQLite 与缓存索引 | IndexedDB 与浏览器缓存 |
| 对话框 | 原生文件/目录选择器 | 浏览器文件选择器 |
| 剪贴板 | 原生读写 | Clipboard API；受权限限制 |
| 系统与窗口 | 托盘、窗口控制、打开路径、更新 | 明确标记不支持或采用 Web 可用替代方案 |

---

## 11.4 Provider 注册与选择性降级

平台初始化时根据宿主注册 Provider。Tauri 中图片能力的典型优先级如下：

```txt
Tauri Rust Provider → Web/WASM Provider
```

纯 Web 环境只注册可用的 Web/WASM Provider。每一次调用都从链首开始，而不是在组件中判断当前运行环境。

```txt
platform.image.resize()
        │
        ▼
Tauri Provider ── 成功 ──► 返回结果
        │
        └── 未实现/不支持 ──► Web 或 WASM Provider ──► 返回结果或最终错误
```

仅以下两类错误允许降级：

| 错误码 | 含义 | 是否继续下一个 Provider |
|---|---|---|
| `PLATFORM_NOT_IMPLEMENTED` | 当前 Provider 尚未实现该操作 | 是 |
| `PLATFORM_UNSUPPORTED` | 当前宿主、格式或浏览器不支持该操作 | 是 |
| `PERMISSION_DENIED` | 用户或系统拒绝授权 | 否 |
| `INVALID_ARGUMENT` | 调用参数非法 | 否 |
| `IMAGE_DECODE_FAILED` / `IMAGE_ENCODE_FAILED` | 文件损坏、格式错误或编码失败 | 否 |
| `IO_FAILED` / `STORAGE_FAILED` | 磁盘、缓存或其他实际执行失败 | 否 |

不得因任意异常而降级，否则会掩盖损坏文件、权限拒绝和真实系统故障。

---

## 11.5 能力声明

`platform.capabilities` 用于 UI 在调用前决定是否展示或禁用功能；Service 的 Provider 链仍负责调用时的最终安全性。

能力应按操作粒度声明，例如：

```ts
interface PlatformCapabilities {
  image: {
    resize: boolean;
    composite: boolean;
    heicDecode: boolean;
  };
  files: {
    pickImages: boolean;
    saveToDirectory: boolean;
    download: boolean;
  };
  system: {
    tray: boolean;
    openPath: boolean;
    autoUpdate: boolean;
  };
}
```

能力为 `false` 时，UI 必须说明可用替代方案，例如浏览器中以“下载文件”代替“选择导出目录”。能力不是权限状态的替代品：即使能力为 `true`，用户仍可能拒绝浏览器或系统的运行时授权。

---

## 11.6 图片技术路线

默认路线：

```txt
Tauri：Rust 图像库 / fast_image_resize / HEIF 解码能力 / EXIF 链路
Web：Canvas / WebCodecs / WASM
```

两端实现都必须遵循同一套 Image Contract，不绑定特定语言、运行时或第三方处理引擎。RAW、PSD、专业 LUT、AI 修图和完整 EXIF 管理不属于第一阶段图片 Provider 的承诺范围；如未来增加对应引擎，仍需通过独立 Provider 接入。

---

## 11.7 与预览、导出和缓存的关系

- Workspace 继续是预览和导出内容的唯一视觉来源，不能维护另一套隐藏模板。
- `snapDOM` 负责从稳定的 Workspace 生成渲染结果；Platform 负责后续编码、保存或下载等宿主相关步骤。
- HEIC/HIF 的快速预览可继续使用 JPEG preview，但最终导出不得只使用该 preview。导出应按需从原始素材生成临时高质量源，并在任务结束后清理或短期缓存。
- Web 与桌面端缓存的实现不同，但缓存键、过期策略和用户可清理语义应保持一致。

---

## 11.8 渐进迁移计划

不进行一次性重构，按以下顺序迁移：

1. 建立 `platform` 的 Contract、错误体系、Provider 测试基架与宿主检测。
2. 盘点 `invoke`、浏览器文件 API、SQLite、图片处理和导出调用点，标记所属能力域。
3. 先迁移图片缩略图、读取、缩放、编码等核心图片能力，并覆盖 Tauri 成功、可降级失败、不可降级失败和链路耗尽测试。
4. 迁移导入、保存、导出目录和下载；Web 端必须提供可完成任务的显式路径。
5. 迁移 Settings、收藏、最近使用和缓存索引到 Storage Contract。
6. 最后迁移托盘、窗口、更新等桌面增强能力，并在 Web UI 中按能力隐藏或替代。
7. 删除或收敛不再被业务直接依赖的 `bridge/` 接口。

每次迁移都需验证：Web 构建可启动、Tauri 构建可启动、目标 Provider 的单元测试通过、真实错误不会触发错误降级，以及预览与导出结果一致。

---

## 11.9 验收标准

- `features`、`core` 和 `features/template/runtime` 不再直接导入宿主 API。
- Web 环境可完成核心图片处理流程，无法提供的系统能力有明确提示或可用替代方案。
- Tauri 环境优先使用桌面 Provider，并且仅对 `PLATFORM_NOT_IMPLEMENTED` / `PLATFORM_UNSUPPORTED` 进行降级。
- 每个 Provider 与降级路径均有独立测试。
- 图片处理实现可独立替换，不影响 Web 构建和核心业务类型。
