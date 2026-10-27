# Copicseal 发布流水线

> **面向对象**：维护者
> **覆盖范围**：GitHub Actions 打包、版本号规则、更新签名密钥、自动更新验证

---

## 12.1 触发方式

| 工作流 | 触发 | 结果 |
|--------|------|------|
| `Release CI`（`.github/workflows/release.yml`） | 推送 `v*` 标签 | 打包四个目标 → 生成 `latest.json` → 发布 GitHub Release |
| `Beta CI`（`.github/workflows/beta.yml`） | 推送到 `dev` 分支、或手动 `workflow_dispatch` | 打包四个目标，只上传 Actions artifact，不创建 Release |

两个工作流都调用 `.github/workflows/build.yml`（`workflow_call` 可复用流程），打包步骤只在那一处维护。

---

## 12.2 打包矩阵

| 产物标识 | 运行器 | Rust target | `--bundles` | 安装包 |
|----------|--------|-------------|-------------|--------|
| `windows-x64` | `windows-2025` | `x86_64-pc-windows-msvc` | `nsis` | `*-setup.exe` |
| `windows-arm64` | `windows-11-arm` | `aarch64-pc-windows-msvc` | `nsis` | `*-arm64-setup.exe` |
| `macos-arm64` | `macos-15` | `aarch64-apple-darwin` | `app,dmg` | `*.dmg`（含更新包 `*.app.tar.gz`） |
| `macos-x64` | `macos-15-intel` | `x86_64-apple-darwin` | `app,dmg` | `*.dmg`（含更新包 `*.app.tar.gz`） |

产物落在 `src-tauri/target/<target>/release/bundle/` 下（`nsis/`、`dmg/`、`macos/`）。

Windows 只发布 NSIS：更新清单里一个 `windows-x86_64` 平台键只能指向一种安装包，统一成 NSIS 才能让所有 Windows 用户走同一条更新路径。macOS 的 `*.dmg` 用于首次安装，`*.app.tar.gz` 供自动更新使用。

Linux 暂不打包（见 12.9 已知缺口）。

---

## 12.3 版本号

三处版本号（`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`）以 `scripts/sync-version.mjs` 为唯一同步入口：

```bash
pnpm sync:version 0.5.1   # 指定版本：写入 package.json 并同步另外两处
pnpm sync:version         # 不带参数：以 package.json 为准同步另外两处
```

发布流程：

1. 本地执行 `pnpm sync:version 0.5.1`，提交版本号改动；
2. `git tag v0.5.1 && git push origin v0.5.1`；
3. CI 以标签为准再次同步（标签不带 `v` 的部分即版本号），因此仓库与产物版本一定一致。

标签必须是 `v<semver>` 形式，否则 `sync-version.mjs` 会在编译前直接失败。

---

## 12.4 更新签名密钥（自动更新的前提）

Tauri 更新包使用 minisign 签名校验，**这套密钥与操作系统代码签名无关**，必须先生成好才能发布可自动更新的版本。

> **当前状态（2026-10-27）**：仓库已经生成过一对更新签名密钥，公钥已写入
> `plugins.updater.pubkey`（不再有 `PENDING_RELEASE_KEY` 占位符）。私钥保存在维护者本机的
> `~/.tauri/copicseal.key`（生成时**没有设置密码**），公钥在同目录的 `.key.pub`。
> 还需要做两件事才算真正可用：① 把私钥内容配置成仓库 Secret `TAURI_SIGNING_PRIVATE_KEY`
> （没有密码，所以不需要 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`）；② 离线备份私钥 —— 丢了以后
> 所有已安装的用户都再也收不到自动更新（见下面第 5、6 节）。

- **只需一对密钥**：`plugins.updater.pubkey` 只有一个字段，四个打包任务也都使用同一个 `TAURI_SIGNING_PRIVATE_KEY`。各平台分别给自己的产物签名，但用的是同一对密钥，没有"Windows 密钥"与"macOS 密钥"之分。
- **不需要 Apple / 微软开发者账号**：更新校验走的是这套 minisign 密钥，与系统代码签名是两条独立链路，插件在校验与安装阶段都不检查操作系统签名。不购买代码签名的代价只体现在首次安装：Windows 会弹 SmartScreen、macOS 需要在"隐私与安全性"中放行；后续自动更新由应用自行下载安装包，不再经过浏览器下载流程。

### 1. 生成密钥对

```bash
# macOS / Linux
pnpm tauri signer generate -w ~/.tauri/copicseal.key
```

```powershell
# Windows（PowerShell 不会为原生程序展开 ~，这里用显式路径）
pnpm tauri signer generate -w "$env:USERPROFILE\.tauri\copicseal.key"
```

命令会提示设置密码（可留空），并输出：

- 私钥文件（上例为 `~/.tauri/copicseal.key`）；
- 公钥字符串（打印在终端）。

### 2. 把公钥写入配置

将公钥**内容**填进 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`，替换掉占位符 `PENDING_RELEASE_KEY`：

```json
"updater": {
  "pubkey": "<signer generate 输出的公钥>",
  "endpoints": ["..."]
}
```

这里只能填公钥内容，**不能填文件路径**。流水线在"配置了签名密钥但公钥仍是占位符"时会直接报错拦截，避免发出装得上却验不过签名的版本。

### 3. 配置 GitHub Secrets

| Secret | 内容 |
|--------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | 私钥文件**内容**（不是路径） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成时设置的密码；未设密码则**不要创建**这个 secret（工作流会把空串 unset 掉，避免 Tauri 误判为"需要解密"） |

```bash
# macOS / Linux
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/copicseal.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

```powershell
# Windows
gh secret set TAURI_SIGNING_PRIVATE_KEY --body "$(Get-Content "$env:USERPROFILE\.tauri\copicseal.key" -Raw)"
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

### 4. 本地构建更新包时需要环境变量

`.env` 文件不生效，必须走真实环境变量：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "<私钥内容或路径>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<密码>"
```

```bash
export TAURI_SIGNING_PRIVATE_KEY="<私钥内容或路径>"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<密码>"
```

### 5. 备份与轮换约束

- **私钥丢失后，已经安装的客户端再也无法收到更新**；公钥轮换同理（旧客户端只认旧公钥）。请离线备份私钥与密码。
- 因此第一个带真实公钥的版本是"更新基线"：在它之前发布的任何构建都无法自动更新。
- 公钥只在下载校验阶段被解析：仍是占位符时"检查更新"可以正常返回新版本号，但点击下载会因公钥无法解码而失败——看到这种组合即可确认忘记替换公钥。
- 未配置签名密钥时流水线仍然可跑：会走 `.github/tauri-nosign.conf.json` 关闭 `createUpdaterArtifacts`，只产出安装包、不产出 `.sig` 与 `latest.json`——此时自动更新不可用。

### 6. 重新生成密钥会怎样

公钥是编译进客户端里的（`plugins.updater.pubkey`），客户端只认自己体内那一把。所以重新生成密钥等价于主动制造一次"密钥丢失"：

- 所有按旧公钥构建的已安装版本，**永远无法再收到任何自动更新**——它们会拿旧公钥去验新密钥的签名，在下载阶段直接失败。这些用户只能手动重新下载安装包。
- 新公钥只对"从新版本开始手动安装"的用户生效。
- 想平滑轮换，只能在客户端保留过渡逻辑：Rust 侧 `updater_builder().pubkey(<新公钥>)` 可以运行时指定公钥（官方明确这个 API 的用途就是密钥轮换），过渡版本先试新公钥、验不过再退回旧公钥，等用户都升级上来再删掉旧逻辑。JS 侧 `check()` 不支持指定公钥，这一步必须改 Rust。
- 如果私钥泄露到公开位置，必须按上面的流程轮换，否则任何人都能签出会被你的用户安装的"更新包"。

---

## 12.5 可选：操作系统代码签名

与更新签名完全独立，**不配置完全不影响自动更新**，只是首次安装的体验差一些。

**macOS**（消除 Gatekeeper 提示）：导出 Developer ID 证书为 `.p12` 后 base64 编码，配置以下 Secrets：

| Secret | 内容 |
|--------|------|
| `APPLE_CERTIFICATE` | `.p12` 的 base64 内容（`base64 -i cert.p12 \| pbcopy`） |
| `APPLE_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设置的密码 |
| `APPLE_SIGNING_IDENTITY` | 如 `Developer ID Application: xxx (TEAMID)` |
| `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | 公证所需的应用专用密码与团队 ID |

未配置时产物未签名：用户首次打开需在"隐私与安全性"中放行，更新包替换 `.app` 后同样受 Gatekeeper 约束。

**DMG 安装窗口里的提示**：Tauri 的 `dmg` 配置只能设置背景图（没有文本字段），所以安装提示画在
`src-tauri/dmg/background.png` 上，由 `tauri.conf.json` 的 `bundle.macOS.dmg` 引用
（窗口 660×400，图标落点与背景上的箭头对齐：app (180,170) / 应用程序 (480,170)）。
背景图里写明了未签名产物被 Gatekeeper 拦截时的解法：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Copicseal.app
```

背景图的源文件是同目录的 `background.html`（可读可改），重新生成：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=660,400 \
  --screenshot=src-tauri/dmg/background.png "file://$PWD/src-tauri/dmg/background.html"
```

**CI 上必须显式开启排版**：背景图和图标落点不是配置直接生效的，而是打包时由 Finder 通过 AppleScript
写进镜像里的 `.DS_Store`。Tauri 一旦检测到 `CI=true` 就默认跳过这一步（`--skip-jenkins`），产出的
DMG 里 `.background/background.png` 照样存在，但没有任何记录引用它——用户看到的就是一个白底窗口、
两个图标挤在左上角。因此 `.github/workflows/build.yml` 里设置了
`TAURI_BUNDLER_DMG_IGNORE_CI: "true"`，让 CI 也执行这段 AppleScript。

这条路径依赖运行器有完整 GUI 会话：GitHub 托管的 `macos-15` / `macos-15-intel` 可以；无头运行器
（Depot 等）会卡在 `Running AppleScript to make Finder stuff pretty` 或直接失败，遇到那种情况只能
删掉这个环境变量，改为在发布页与 README 里给提示。验证方法：挂载 DMG 后同时看到 `.DS_Store` 与
`.background/background.png` 才算排版生效，只有 `.background` 就是被跳过了（本地
`pnpm tauri build --bundles dmg` 一直会执行这一步，可用它做对照）。

注意背景图里的命令**不能复制**，所以同样的解法也要放在发布页 / README 里供用户复制。

如果用户反馈下载后提示"已损坏、无法打开"，可以在 `bundle.macOS.signingIdentity` 填 `"-"` 做 ad-hoc 签名——这不需要开发者账号，能缓解 Apple Silicon 上的"已损坏"判定；但 Tauri 有一个已知问题提到 ad-hoc 签名可能让 arm64 程序在 Rosetta 下运行，且此处未做实测，建议先按未签名发布，遇到问题再改。

**Windows**（消除 SmartScreen 警告）：需要 OV/EV 代码签名证书，与更新签名密钥无关，当前流水线未配置。

---

## 12.6 更新源与接口约定

`plugins.updater.endpoints` 按顺序尝试。**GitHub Release 是主源**，官网自建服务留作镜像/灰度：

```json
"endpoints": [
  "https://github.com/copicseal/copicseal/releases/latest/download/latest.json",
  "https://updates.copicseal.com/{{target}}/{{arch}}/{{current_version}}"
]
```

回退行为（以实现为准，比官方文档描述更宽松）：

| 情况 | 行为 |
|------|------|
| 传输错误（DNS 不存在、连接失败） | 记录错误并继续下一个 endpoint |
| 非 2XX（含 404） | 继续下一个 endpoint |
| `204 No Content` | **立即判定"无更新"，不再继续** |
| `200` + 响应体不是 JSON | **整体失败，不再继续** |
| `200` + 结构不合法 | 记录错误并继续下一个 endpoint |

所以 GitHub 不可用时才会走到自建服务；自建服务想要自己控制"无更新"的语义，就返回 `204`（而不是 `404`）。

**静态清单**（Release 上的 `latest.json`，由 `scripts/generate-latest-json.mjs` 生成）：

```json
{
  "version": "0.5.1",
  "pub_date": "2026-09-20T00:00:00.000Z",
  "platforms": {
    "windows-x86_64": { "signature": "<.sig 文件内容>", "url": "https://..." },
    "windows-aarch64": { "signature": "...", "url": "..." },
    "darwin-x86_64": { "signature": "...", "url": "..." },
    "darwin-aarch64": { "signature": "...", "url": "..." },
  }
}
```

约束：`signature` 必须是 `.sig` 文件**内容**（不能是路径或链接），`url` 必须是绝对地址，Tauri 会先整份校验再比较版本。平台键使用 `{os}-{arch}`，运行时先找 `{os}-{arch}-{installer}`（如 `windows-x86_64-nsis`）再回退到 `{os}-{arch}`。脚本里这四个平台是**必填**的：少一个就判定发布失败，避免发出一个"某平台永远收不到更新"的版本。

**自建更新服务**：若要在 URL 里使用 `{{target}}`（`windows`/`darwin`）、`{{arch}}`（`x86_64`/`aarch64`）、`{{current_version}}`，有更新时返回 `200` 与 `{ "version", "url", "signature", "notes?", "pub_date?" }`，无更新时按上表选择 `204` 或 `404`。

---

## 12.7 安装形态与自动更新的关系

- Windows：必须通过 NSIS `-setup.exe` 安装。安装阶段应用会被安装器结束并由安装器重新拉起（`installMode: passive` 对应 `/P /R`），所以界面上的"请重新启动"主要针对 macOS。
- macOS：从 `.dmg` 拖入 `/Applications` 安装；更新时插件会替换 `.app` 包（权限不足时通过系统授权对话框提权），完成后需要用户手动重启应用。
- 更新包由服务端产物决定安装方式：清单里指向 NSIS 就调用 NSIS，指向 MSI 就调用 `msiexec`。绿色版/未安装的副本不参与更新。
- 预发布标签（如 `v0.6.0-beta.1`）不会被 `releases/latest/download/latest.json` 命中，这是 GitHub 端点固有限制。

---

## 12.8 验证自动更新

本地验证（需要已生成密钥）：

1. 用 `0.5.0` 构建并安装（`bundle.createUpdaterArtifacts: true` + 签名环境变量）；
2. `pnpm sync:version 0.5.1` 后重新构建，得到新产物与 `.sig`；
3. 用 `node scripts/generate-latest-json.mjs --dist <产物目录> --tag v0.5.1 --version 0.5.1` 生成清单，并用本地 HTTP 服务托管；
4. 把 endpoint 临时指向本地地址、打开 `plugins.updater.dangerousInsecureTransportProtocol`（release 构建对 `http://` 会直接报错，debug 构建只警告）；
5. 在已安装的 `0.5.0` 中点击"检查更新"，观察版本号、下载进度与安装结果。

正式验证：安装 vN，发布 vN+1，在应用内"设置 → 关于"执行检查与安装。

---

## 12.9 已知缺口

- **私钥 Secret 已配置**（2026-10-27，仓库变量 `TAURI_SIGNING_PRIVATE_KEY`，无密码）。若换仓库或清空它，流水线仍能出安装包，但会跳过 `.sig` 与 `latest.json`（自动更新不可用）。配置方法见 12.4 第 3 节。
- `updates.copicseal.com` 尚未部署：GitHub Release 是主源，只有它失败时客户端才会尝试这个地址（当前会失败，最终判定"检查更新失败"并提示手动下载）。
- **Linux 暂不打包**：首发先只覆盖 Windows / macOS。上一版尝试加 `linux-x64` 时 `gdk-sys` 因缺 `gdk-3.0` 构建失败——依赖安装步骤的条件写成了 `startsWith(inputs.target, 'linux')`，而 target 是 `x86_64-unknown-linux-gnu`，apt 步骤被跳过。以后要加回来至少需要：
  1. 判断改成 `contains(inputs.target, 'linux')`；
  2. 装齐 `libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev libfontconfig1-dev libfreetype6-dev patchelf libfuse2`；
  3. 矩阵加 `ubuntu-22.04` / `x86_64-unknown-linux-gnu` / `--bundles appimage,deb`，并把 `linux-x86_64` 加回 `generate-latest-json.mjs` 的必填列表（`.AppImage.tar.gz` → `linux-{arch}` 映射已预留）。
- 官网自建更新服务（灰度/镜像）尚未实现，见 12.6 的接口约定。
- macOS 未配置签名与公证；Windows 未配置代码签名证书。
- 预发布版本无法通过 GitHub 端点被自动发现。

---

## 12.10 检查更新失败时的手动兜底

应用内更新不是唯一出路：**任何一次更新检查 / 下载 / 安装失败，都要给用户一个能自己拿到最新安装包的入口**——
官网下载页 <https://copicseal.com/download.html>（常量在 `src/shared/lib/links.ts` 的 `DOWNLOAD_URL`，换域名只改这一处）。

| 场景 | 行为 |
|------|------|
| 启动时自动检查（在线） | 失败弹一条 toast「检查更新失败」，带「前往官网下载」按钮（点击用系统浏览器打开下载页） |
| 启动时自动检查（离线） | 静默跳过：断网时提示去下载没有意义，也不该每次启动都打扰 |
| 设置 → 关于 → 检查更新失败 | 状态显示「检查更新失败」，下方出现虚线提示块 + 「前往官网下载」按钮 |
| 设置 → 关于 → 下载 / 安装失败 | 同上，提示「如果应用内更新一直失败，可以前往官网手动下载安装包」 |
| 当前环境不支持应用内更新（如网页端） | 显示「当前环境不支持应用内更新」，同样给出「前往官网下载」按钮 |
| 检查成功但没有新版本 | 只显示「已是最新版本」，不出现下载入口 |

这样即使签名密钥丢失、GitHub 端点被墙、或用户装的版本不在自动更新覆盖范围内，也有一条可执行的手动升级路径。

