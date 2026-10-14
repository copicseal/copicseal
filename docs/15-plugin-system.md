# 15 插件系统（libheif 与 exiftool）

> **定位**：把「系统缺少的能力」做成可按需安装的第三方组件，而不是把所有依赖都塞进安装包。
> **首个插件**：`libheif`（Windows 上的 HEIC/HEIF 转码），来源
> `copicseal/copicseal-static` 的 `libheif/` 目录。

---

## 1. 边界

- 插件 = **下载并落盘的可执行组件**（DLL / exe 集合），不是 JS 插件、也不是远程模板。
- **默认官方源**（静态仓库 `copicseal-static`），用户可以在设置里追加自己的镜像；源列表按顺序
  尝试，第一个可用的生效，安装包与清单来自同一个源。
- 安装必须由用户点击触发，**不做静默安装**；装完立即生效，无需重启。
- 本期不引入插件签名体系（校验手段是 HTTPS + `sha256`），也不做插件市场。

---

## 2. 平台策略

| 平台 | 策略 | 界面表现 |
|------|------|----------|
| Windows | 需要插件：系统可能缺 HEIF 解码（未装「HEIF 图像扩展」/「HEVC 视频扩展」） | 可安装 / 更新 / 卸载，显示版本与占用 |
| macOS | **禁用**：系统自带 HEIC 支持，走现有 `sips` 转码 | 显示「macOS 已内置该能力，无需安装插件」，按钮禁用 |
| Linux | 暂无资产 | 显示「当前系统没有该插件的版本」 |

平台判定在两处保持一致：目录里的 `platforms`（前端据此显示文案）与 Rust 侧按
`target_os` + `std::env::consts::ARCH` 选资产（安装入口的真实闸门）。

---

## 3. 目录与清单规范

### 3.1 落盘位置

```txt
%APPDATA%\com.copicseal.desktop\Plugins\
└─ libheif\
   └─ 1.23.1\            # 版本目录；安装成功后会删掉同 id 的其它版本
      ├─ heif-dec.exe
      ├─ heif.dll
      └─ *.dll
```

- 与 `data.db` 同级（应用配置目录），属于**机器级组件**，不跟随工作区备份迁移。
- **状态以磁盘为准**：`list_plugins` 扫描目录即得出「装了没、装的哪版、占多少空间」，
  不额外持久化，避免配置与磁盘漂移。

### 3.2 远端清单 `manifest.json`

放在静态仓库对应插件目录下，与资产同目录：

```jsonc
{
  "id": "libheif",
  "version": "1.23.1",
  "notes": "Windows HEIC/HEIF 转码（libheif 1.23.1）",
  "assets": [
    { "name": "libheif-windows-x86_64.zip", "size": 12910157, "sha256": "EBF1FAEA…" },
    { "name": "libheif-windows-aarch64.zip", "size": 10380244, "sha256": "BDD8F38D…" },
    { "name": "libheif-windows-x86.zip", "size": 11211386, "sha256": "0D64D9C4…" }
  ]
}
```

- 资产地址由**源 + 插件目录 + 资产名**推导，清单里不写绝对地址
  （清单是 `<源>/<插件 id>/manifest.json`，资产是 `<源>/<插件 id>/<资产名>`）。
- `size` 与 `sha256` 是必填：拿不到清单或字段缺失时，界面显示「未能获取版本信息」并
  **禁用安装**，宁可不装也不装一个无法校验的包。
- 更新流程：替换 zip → 改 `version` 与 `sha256` → 应用里点「更新」。

### 3.3 下载源（可配置）

配置项：`config.plugins.sources`，字符串数组，**顺序即优先级**。

```txt
https://static.copicseal.com                                     ← 内置源 1：静态仓库的自定义域名（CDN）
https://raw.githubusercontent.com/copicseal/copicseal-static/main ← 内置源 2：GitHub raw 兜底
https://cdn.example.com/copicseal-static                          ← 用户 / 镜像自加的源
```

- 取清单：按顺序请求 `<源>/<插件 id>/manifest.json`，第一个成功的源胜出
- 下载资产：沿用胜出的那个源，避免「清单来自 A、包来自 B」
- 列表为空或全是不合法地址 → 回落到上面这两个内置源，所以「默认源可用」永远成立
- 内置源的自定义域名与 GitHub raw 指向同一份静态仓库，镜像只要复刻目录结构即可
- 界面：设置 → 插件 →「下载源」卡片，可添加 / 移除 / 置顶 / 恢复默认；地址必须以 `http(s)://` 开头
- 镜像只要复刻同样的目录结构即可，客户端不需要为每个镜像改代码

---

## 4. 安装流程（`install_plugin`）

1. 按当前平台从目录里挑资产（没有 → 直接拒绝，macOS 即走这里）
2. 拉取 `manifest.json`，校验 `id` 匹配、取出该资产的 `size` / `sha256`
3. `reqwest` 流式下载到 `<id>/.<version>.part.zip`，每 512 KB 发一次
   `plugin://install-progress`（`{ id, downloaded, total, percent }`）
4. 校验**体积**与 **sha256**，任一不符即失败
5. 解压到 `<id>/.<version>.tmp/`：
   - 每个条目都要通过 `enclosed_name()` + `safe_entry_path()` 双重越界检查
     （拒绝绝对路径、盘符、`..`）
   - 解压后校验必需文件（libheif 需要 `heif-dec.exe`）存在
6. 原子 `rename` 到 `<id>/<version>/`，然后删掉同 id 的旧版本目录
7. **任一步失败都清理临时文件与临时目录**，磁盘上不留半成品

命令与事件：

| 名称 | 说明 |
|------|------|
| `list_plugins()` | 目录信息 + 每个插件的平台支持、资产、已安装版本、占用空间 |
| `fetch_plugin_manifest(id)` | 拉远端清单（只用于显示与校验，不落盘） |
| `install_plugin(id)` | 安装 / 更新，失败返回可读原因 |
| `remove_plugin(id)` | 卸载（整目录删除；文件被占用时提示稍后重试） |
| `plugin://install-progress` | 下载进度事件 |

---

## 5. HEIC 解码优先级

`fs.rs::create_preview_asset` 在识别到 `heic / heif / hif` 时：

```txt
Windows：插件 heif-dec.exe  →  系统 WIC  →  失败给提示
macOS  ：sips（系统自带，插件不参与）
Linux  ：不转换，直接使用原图
```

- 插件调用方式与 macOS 的 `sips` 一致：`heif-dec -q 92 <输入> <输出.jpg>`，
  用 `CREATE_NO_WINDOW` 避免弹控制台窗口，检查退出码与产物存在。
- 预览 JPEG 的质量与 WIC 路径保持同一常量（`PREVIEW_JPEG_QUALITY = 92`）。
- **缩略图由预览 JPEG 派生**，所以插件转码成功后缩略图自动受益，无需另开一条链路。
- 两条路都失败时的提示会同时给出两个出路：装插件（设置 → 插件）或装系统扩展。

### 5.1 失败时直接跳去安装

导入失败只提示「为什么」还不够，还得让用户一步到位，所以约定了一套**机器可读的错误码**：

| 错误码 | 含义 | 前端表现 |
|--------|------|----------|
| `heic-decoder-missing` | 系统解不开 HEIC/HEIF，且没装插件 | 提示里带「去安装插件」按钮，点击直达设置 → 插件（并高亮该页） |
| `heic-plugin-failed` | 装了插件但转码失败、系统也不可用 | 只如实报错，不再引导安装（避免误导） |

- Rust 侧错误串形如 `[[co:heic-decoder-missing]] 文案`，由 `fs.rs::coded_error()` 生成；
- 前端 `src/platform/errors.ts::parseFailureReason()` 拆出 `code` 与 `message`，
  `ImportFailure.code` 再交给 `import-feedback.ts` 决定要不要加按钮；
- 跳转走 `navigation-provider` 的 `appNavigate('/settings', 'plugins-section')`，
  设置页按 `ANCHOR_TABS` 先把 tab 切到「插件」再滚动定位；
- **不靠匹配文案判断**：文案改词不会让按钮失效。

---

## 6. 安全边界

| 风险 | 处理 |
|------|------|
| 插件源被替换成任意地址 | 下载地址只能由配置里的源 + 插件目录推导，安装时无法临时指定地址 |
| 用户添加了恶意源 | 自定义源属于**用户显式信任**：清单与包都来自它，`sha256` 只能证明传输无误、不能证明来源可信；界面文案已写明这一点 |
| 中间人篡改安装包 | HTTPS + `sha256` + `size` 双重校验，不符直接拒绝 |
| 恶意 zip（路径穿越、绝对路径） | `enclosed_name()` + `safe_entry_path()` 双重拒绝 |
| 装了一半的残留 | 失败即清理 `.part.zip` 与 `.tmp/` 目录 |
| 未经用户同意安装 | 只有用户点击「安装」才触发；卸载前二次确认 |
| 版本号被用作路径 | `safe_segment()` 只允许字母数字与 `-_.` |

---

## 7. 本机验收清单

Windows（缺 HEIF 扩展的机器，本仓库开发机即如此）：

1. 设置 → 插件：看到 libheif，显示远端版本、下载体积与「未安装」
2. 点安装 → 进度条走到 100% → 状态变为「已安装 v1.23.1 · 占用 45.2 MB」
3. 导入 HEIC/HEIF（缓存里已有样本）：预览与缩略图正常，不再出现 WIC 报错
4. 卸载 → 再导入同一张 HEIC → 回到「装插件 / 装系统扩展」的提示，且不出现未捕获异常
5. 手动把插件目录清掉（或断网）后再导入 → 落回 WIC 与提示，插件行状态同步为「未安装」

macOS：

1. 插件行显示「macOS 已内置该能力，无需安装插件」，安装按钮不可用
2. HEIC 导入照常工作（走 `sips`）

---

## 8. 已知限制与后续

- [ ] 未做包体裁剪：libheif 包解压后约 45 MB（含 ffmpeg 系、aom、x265 与打包的 VC 运行库），
      只为解码 HEIC 的话理论上可以更小
- [ ] 未做插件签名校验（依赖 HTTPS + sha256），自定义源等于信任该源；后续若要开放社区镜像
      或第三方提交的插件，需要补签名（minisign / ed25519 之类）
- [ ] 不支持取消下载、不支持多版本并存（安装新版即删旧版）
- [ ] Linux 暂无资产；若要支持需要先在静态仓库补 Linux 构建
- [ ] 下载依赖 `system-proxy` 特性复用系统代理；自动更新（`tauri-plugin-updater`）用的是
      reqwest 默认特性集，在只设置系统代理、不设环境变量的机器上可能同样受限，待单独确认
- [ ] 与「预览 / 导出源分离」联动：插件现在只服务预览链路，导出仍需要按需生成高质量源
      （见 `docs/TODO.md`）

---

## 9. 第二个组件：ExifTool（读相机 MakerNote）

快门数这类信息只存在于厂商 MakerNote（当前自带的 `kamadak-exif` 不解析），所以又会引出一个可下载组件。
它跟 libheif 的形态**完全不同**，因此组件层不能假设「都有个 Windows 二进制」：

| | libheif | exiftool |
|---|---|---|
| 适用平台 | 仅 Windows | Windows + macOS + Linux |
| 资产形态 | 自包含 zip（`heif-dec.exe`）| Windows：自包含 exe（内含 Perl 运行时）<br>macOS/Linux：Perl 版（`exiftool` 脚本 + `lib/`），依赖系统自带 `perl` |
| 安装前探测 | 系统是否已有 HEIC 解码能力 | **系统是否已有 `exiftool`** —— 有则显示「系统已安装」，不下载 |
| 调用方式 | 直接执行 `heif-dec.exe` | Windows 直接执行；macOS/Linux 用 `perl -I <目录>/lib <目录>/exiftool` |
| 兜底 | — | macOS 上没有 perl 时，面板给「到 exiftool.org 下载」的出口 |

实现要点：

- **插件层保持通用**：它只负责「装」与「按声明解析出该怎么跑」，**不认识任何具体组件**
  - 每份资产自带 `required_files`（装完必须存在的文件）与 `run`（怎么运行：`executable` 直接执行，
    `perl` 用系统 perl 跑脚本）。`run` 取代了最初的 `requires_perl` 布尔，也顺手消掉了
    「Windows 上提示缺 perl」那类跨平台串味
  - 目录项带 `system_command` / `system_version_args`（探测系统是否已装、以及它的版本）
  - 对外只有两个通用入口：`plugin::component_command(app, id)`（解析出可执行文件 + 前置参数）
    与 `plugin::component_file(app, id, relative)`（取安装目录里的某个文件）
- **组件 id 与「怎么用」归功能域自己**：HEIC 的 id 在 `fs.rs`，元数据命令在 `exiftool.rs`；
  `plugin.rs` 只保留目录声明 —— 这样 libheif / exiftool 后续被别的功能复用也不会互相牵扯
- 上游压缩包结构不一致（exiftool 的 Windows 包多一层版本目录、可执行文件叫 `exiftool(-k).exe`）：
  安装时统一**归一化**（单层顶层目录下沉 + 改名）后再校验必需文件 —— 这样静态仓库可以照上游原样放包
- `find_in_path` 除 PATH 外还补查 `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`：
  macOS 上从 Finder 启动的 GUI 应用 PATH 很干净（只有 `/usr/bin:/bin:/usr/sbin:/sbin`），
  不补查就漏掉 Homebrew 装的 exiftool
- 运行顺序：**装了就用装的，没装才用系统的** —— 用户主动安装的那份应当生效，
  系统里自带的那份只是省一次下载的便利
- 命令 `exiftool::read_exiftool_metadata(path, args)` 只读，返回原始 stdout（JSON 由前端解析），
  Windows 上带 `CREATE_NO_WINDOW` 起子进程

### 9.1 目前谁在用它

只有「更多功能 → 快门数查询」（`src/features/tools/shutter-count`）：它通过解析器抽象
（`shutter-count/provider.ts`）调用原生 ExifTool（`exiftool.rs`），结果里会显示实际使用的解析器。

起初这里还内置了 ExifTool 的 **WASM 版**作为兜底，**现已移除**：它给应用带来约 24 MB 的 wasm 资源
（brotli 后约 5 MB），而桌面端本就有原生替代，留着只增加体积与启动开销。
网页端因此暂时没有 EXIF 读取能力（`web-exif-adapter.ts` 返回空 EXIF）—— 当前以桌面端为主。

**HEIC 那条链保持原样**。
