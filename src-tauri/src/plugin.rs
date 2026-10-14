use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

/// 下载进度事件名：前端 `listen('plugin://install-progress')`。
const PROGRESS_EVENT: &str = "plugin://install-progress";
/// 进度事件的最小间隔（字节）：12 MB 的包按块发事件会刷屏。
const PROGRESS_STEP_BYTES: u64 = 512 * 1024;
const MAX_MANIFEST_BYTES: u64 = 128 * 1024;
const DOWNLOAD_TIMEOUT_SECS: u64 = 900;

/// HEIC 转码组件（Windows）：装好后 `heif-dec.exe` 可以直接转码。
///
/// 这两个 id 既是内置目录里的条目，也是静态仓库里的目录名；
/// 需要用它们的**功能域**（`fs.rs` 的 HEIC、`exiftool.rs` 的元数据）通过
/// [`component_command`] / [`component_file`] 拿，插件层自己不写业务代码。
pub(crate) const HEIF_PLUGIN_ID: &str = "libheif";
/// 读 MakerNote 的 ExifTool：Windows 用自包含 exe，macOS/Linux 用 Perl 版（依赖系统 perl）。
pub(crate) const EXIFTOOL_PLUGIN_ID: &str = "exiftool";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginAsset {
    pub name: String,
    pub size: u64,
    pub sha256: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub id: String,
    pub version: String,
    #[serde(default)]
    pub notes: Option<String>,
    pub assets: Vec<PluginAsset>,
}

/// 目录里声明的「某平台对应哪个资产文件」，以及装完后必须存在的文件。
#[derive(Debug, Serialize, Clone)]
pub struct PluginAssetRef {
    /// 平台标识，如 `windows-x86_64`
    pub platform: String,
    pub file: String,
    /// 安装完成后必须存在的文件（相对安装根目录），缺一个就认为包不对、回滚。
    ///
    /// 上游压缩包的目录结构在各组件之间并不一致（exiftool 的 Windows 包还多套一层版本目录），
    /// 所以安装时会先归一化再按这里校验。
    pub required_files: Vec<String>,
    /// 这份资产装完之后怎么运行（直接执行 exe / 用系统 perl 跑脚本）
    pub run: ComponentRun,
}

/// 一份资产装完之后怎么运行。
///
/// 组件形态并不统一（libheif 是直接的 exe，exiftool 在 macOS/Linux 上是 Perl 脚本），
/// 把这件事**声明在资产上**，插件层就能保持通用：它只负责「装」与「按声明解析出该怎么跑」，
/// 至于跑起来干什么、参数怎么传，由各功能域自己的模块决定。
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ComponentRun {
    /// 直接执行资产里的可执行文件（libheif 的 `heif-dec.exe`、Windows 上的 `exiftool.exe`）
    Executable { file: String },
    /// 用系统 perl 跑脚本：`perl -I <lib> <script>`（macOS/Linux 的 Perl 版 exiftool）
    Perl { script: String, lib: String },
}

/// 内置插件目录（catalog）。
///
/// 这是「有哪些插件」的唯一真相源；至于「从哪拿」，源来自配置（默认官方源、用户可加镜像），
/// 前端只负责翻译与渲染，Rust 侧按目录 + 源来下载与安装。
#[derive(Debug, Serialize, Clone)]
pub struct PluginCatalogEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub homepage: String,
    /// 插件在源里的子目录名：清单是 `<源>/<remote_dir>/manifest.json`
    pub remote_dir: String,
    /// 支持的平台标识列表
    pub platforms: Vec<String>,
    pub assets: Vec<PluginAssetRef>,
    /// 探测「系统里是否已经装好」用的可执行文件名（在 PATH 里找）；None 表示该组件不做系统探测
    pub system_command: Option<String>,
    /// 探测系统里那份的版本时用的参数（例如 exiftool 的 `-ver`）；None 表示不探测版本
    pub system_version_args: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct InstalledPlugin {
    pub version: String,
    pub path: String,
    pub size: u64,
    pub installed_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PluginState {
    pub id: String,
    pub name: String,
    pub description: String,
    pub homepage: String,
    /// 当前平台是否有可用资产
    pub supported: bool,
    pub platform: String,
    /// 当前平台对应的资产（没有则为 None）
    pub asset: Option<PluginAssetRef>,
    /// 已安装版本，按安装时间升序
    pub installed: Vec<InstalledPlugin>,
    pub active_version: Option<String>,
    /// 插件根目录（供「打开目录」）
    pub directory: String,
    /// 系统 PATH 里已有的同名可执行文件（如包管理器装的 exiftool）
    pub system_path: Option<String>,
    /// 系统里那个可执行文件的版本（`exiftool -ver`）；取不到为 None
    pub system_version: Option<String>,
    /// 当前平台这份资产是否需要系统 perl；None 表示与 perl 无关
    pub perl_available: Option<bool>,
}

/// 拉到的远端清单 + 实际生效的源（多源按顺序尝试，界面要显示是哪个源给的）。
#[derive(Debug, Serialize, Clone)]
pub struct PluginManifestResult {
    pub manifest: PluginManifest,
    pub source: String,
}

/// 安装结果：新状态 + 资产来自哪个源。
#[derive(Debug, Serialize, Clone)]
pub struct PluginInstallOutcome {
    pub state: PluginState,
    pub source: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PluginInstallProgress {
    pub id: String,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percent: Option<u8>,
}

fn catalog() -> Vec<PluginCatalogEntry> {
    vec![
        PluginCatalogEntry {
            id: HEIF_PLUGIN_ID.to_string(),
            name: "libheif".to_string(),
            description:
                "Windows 上缺少系统 HEIF 解码组件时，用 libheif 自带的 heif-dec 转码 HEIC/HEIF。"
                    .to_string(),
            homepage: "https://github.com/copicseal/copicseal-static/tree/main/libheif".to_string(),
            remote_dir: HEIF_PLUGIN_ID.to_string(),
            platforms: vec!["windows".to_string()],
            system_command: None,
            system_version_args: None,
            assets: vec![
                PluginAssetRef {
                    platform: "windows-x86_64".to_string(),
                    file: "libheif-windows-x86_64.zip".to_string(),
                    required_files: vec!["heif-dec.exe".to_string()],
                    run: ComponentRun::Executable {
                        file: "heif-dec.exe".to_string(),
                    },
                },
                PluginAssetRef {
                    platform: "windows-aarch64".to_string(),
                    file: "libheif-windows-aarch64.zip".to_string(),
                    required_files: vec!["heif-dec.exe".to_string()],
                    run: ComponentRun::Executable {
                        file: "heif-dec.exe".to_string(),
                    },
                },
                PluginAssetRef {
                    platform: "windows-x86".to_string(),
                    file: "libheif-windows-x86.zip".to_string(),
                    required_files: vec!["heif-dec.exe".to_string()],
                    run: ComponentRun::Executable {
                        file: "heif-dec.exe".to_string(),
                    },
                },
            ],
        },
        PluginCatalogEntry {
            id: EXIFTOOL_PLUGIN_ID.to_string(),
            name: "ExifTool".to_string(),
            description:
                "读取相机 MakerNote 里的元数据（快门数等）。Windows 用自包含 exe；macOS/Linux 用 Perl 版，需要系统自带 perl。"
                    .to_string(),
            homepage: "https://github.com/copicseal/copicseal-static/tree/main/exiftool".to_string(),
            remote_dir: EXIFTOOL_PLUGIN_ID.to_string(),
            platforms: vec![
                "windows".to_string(),
                "macos".to_string(),
                "linux".to_string(),
            ],
            system_command: Some("exiftool".to_string()),
            system_version_args: Some(vec!["-ver".to_string()]),
            assets: vec![
                // Windows 的两份自带 Perl 运行时，不需要系统 perl
                PluginAssetRef {
                    platform: "windows-x86_64".to_string(),
                    file: "exiftool-windows-x86_64.zip".to_string(),
                    required_files: vec!["exiftool.exe".to_string()],
                    run: ComponentRun::Executable {
                        file: "exiftool.exe".to_string(),
                    },
                },
                PluginAssetRef {
                    platform: "windows-x86".to_string(),
                    file: "exiftool-windows-x86.zip".to_string(),
                    required_files: vec!["exiftool.exe".to_string()],
                    run: ComponentRun::Executable {
                        file: "exiftool.exe".to_string(),
                    },
                },
                // macOS 与 Linux 共用同一个 Perl 包（都靠系统 perl 跑脚本）
                PluginAssetRef {
                    platform: "macos".to_string(),
                    file: "exiftool-perl.zip".to_string(),
                    required_files: vec![
                        "exiftool".to_string(),
                        "lib/Image/ExifTool.pm".to_string(),
                    ],
                    run: ComponentRun::Perl {
                        script: "exiftool".to_string(),
                        lib: "lib".to_string(),
                    },
                },
                PluginAssetRef {
                    platform: "linux".to_string(),
                    file: "exiftool-perl.zip".to_string(),
                    required_files: vec![
                        "exiftool".to_string(),
                        "lib/Image/ExifTool.pm".to_string(),
                    ],
                    run: ComponentRun::Perl {
                        script: "exiftool".to_string(),
                        lib: "lib".to_string(),
                    },
                },
            ],
        },
    ]
}

fn find_entry(id: &str) -> Result<PluginCatalogEntry, String> {
    catalog()
        .into_iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| format!("未知插件: {id}"))
}

/// 当前平台标识：Windows 细分到架构（三个资产分别对应 x86_64 / aarch64 / x86）。
fn current_platform() -> String {
    if std::env::consts::OS == "windows" {
        format!("windows-{}", std::env::consts::ARCH)
    } else {
        std::env::consts::OS.to_string()
    }
}

/// 插件根目录：应用配置目录下的 `Plugins/`（与 data.db 同级）。
fn plugins_root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {e}"))?
        .join("Plugins");
    fs::create_dir_all(&dir).map_err(|e| format!("创建插件目录失败: {e}"))?;
    Ok(dir)
}

fn plugin_dir(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    Ok(plugins_root(app)?.join(safe_segment(id, "插件 id")?))
}

/// 只允许字母数字与 `-_`：id 与版本号都会拼进路径，直接挡住路径穿越。
fn safe_segment(value: &str, label: &str) -> Result<String, String> {
    let ok = !value.is_empty()
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.');
    if ok {
        Ok(value.to_string())
    } else {
        Err(format!("{label} 不合法: {value}"))
    }
}

/// 扫一个插件目录：已安装的版本、占用空间与安装时间（按时间升序）。
fn scan_installed(dir: &Path) -> Vec<InstalledPlugin> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut installed: Vec<InstalledPlugin> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_dir())
        .filter(|entry| !entry.file_name().to_string_lossy().starts_with('.'))
        .map(|entry| {
            let path = entry.path();
            InstalledPlugin {
                version: entry.file_name().to_string_lossy().to_string(),
                size: dir_size(&path),
                path: path.to_string_lossy().to_string(),
                installed_at: installed_at(&path),
            }
        })
        .collect();

    installed.sort_by(|a, b| a.installed_at.cmp(&b.installed_at));
    installed
}

/// 目录内文件总大小（插件是几十 MB 的 DLL 集合，装完要让用户看到占用）。
fn dir_size(path: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(path) else {
        return 0;
    };

    entries
        .filter_map(|entry| entry.ok())
        .map(|entry| match entry.metadata() {
            Ok(meta) if meta.is_dir() => dir_size(&entry.path()),
            Ok(meta) => meta.len(),
            Err(_) => 0,
        })
        .sum()
}

fn installed_at(path: &Path) -> Option<String> {
    fs::metadata(path)
        .ok()
        .and_then(|meta| meta.modified().ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string())
}

/// 读「系统里那份组件」的版本，参数由目录声明（例如 exiftool 的 `-ver`）。
///
/// 只在插件页展示用，所以按「可执行文件 + 参数」缓存一次：探测要起一个进程
/// （Windows 上的 exiftool 是解包好的 Perl，几百毫秒），而 `list_plugins` 每次进设置页都会调用。
fn system_version(path: &str, args: &[String]) -> Option<String> {
    static CACHE: std::sync::Mutex<Vec<(String, Option<String>)>> =
        std::sync::Mutex::new(Vec::new());

    let key = format!("{path} {}", args.join(" "));

    if let Ok(cache) = CACHE.lock() {
        if let Some((_, value)) = cache.iter().find(|(item, _)| item == &key) {
            return value.clone();
        }
    }

    let version = std::process::Command::new(path)
        .args(args)
        .output()
        .ok()
        .and_then(|output| {
            if !output.status.success() {
                return None;
            }

            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (!text.is_empty()).then_some(text)
        });

    if let Ok(mut cache) = CACHE.lock() {
        cache.push((key, version.clone()));
    }

    version
}

fn plugin_state(app: &AppHandle, entry: &PluginCatalogEntry) -> Result<PluginState, String> {
    let platform = current_platform();
    let asset = entry
        .assets
        .iter()
        .find(|asset| asset.platform == platform)
        .cloned();
    let installed = scan_installed(&plugin_dir(app, &entry.id)?);
    let active_version = active_version(&installed);
    // 系统里已经有这个组件时：界面上提示「系统已安装 vX」，但仍然允许用户装一份本地的
    //（装了就用装的，没装才用系统的 —— 见 resolve_exiftool）
    let system_path = entry.system_command.as_deref().and_then(find_in_path);
    let system_version = match (system_path.as_deref(), entry.system_version_args.as_deref()) {
        (Some(path), Some(args)) => system_version(path, args),
        _ => None,
    };
    // 只有「当前平台这份资产」是 Perl 脚本时才给出这个状态：Windows 的包自带运行时，
    // 不该让 Windows 用户看到跟他无关的 perl 提示
    let perl_available = asset
        .as_ref()
        .filter(|asset| matches!(asset.run, ComponentRun::Perl { .. }))
        .map(|_| find_in_path("perl").is_some());

    Ok(PluginState {
        id: entry.id.clone(),
        name: entry.name.clone(),
        description: entry.description.clone(),
        homepage: entry.homepage.clone(),
        supported: entry
            .platforms
            .iter()
            .any(|item| item.as_str() == std::env::consts::OS),
        platform,
        asset,
        installed,
        active_version,
        directory: plugin_dir(app, &entry.id)?.to_string_lossy().to_string(),
        system_path,
        system_version,
        perl_available,
    })
}

/// 生效版本 = 安装时间最新的那个（安装成功后会清掉旧版本，正常只有一个）。
fn active_version(installed: &[InstalledPlugin]) -> Option<String> {
    installed.last().map(|item| item.version.clone())
}

/// 已安装的 `heif-dec.exe`：Windows 且装了插件才返回。
///
/// 给 HEIC 预览转换用；未安装/非 Windows 返回 `None`，调用方自然回落到 WIC。
/// 在 PATH 里找一个可执行文件（Windows 额外试 `.exe`）。
///
/// 用于判「系统里已经装好了」：用 Homebrew / 包管理器装过 exiftool 的用户不该再被要求下载一份。
/// macOS 的 GUI 应用从 Finder 启动时 PATH 很干净（只有 `/usr/bin:/bin:/usr/sbin:/sbin`），
/// 所以 PATH 找不到时再补查几个常见安装目录。
fn find_in_path(name: &str) -> Option<String> {
    let candidates = [name.to_string(), format!("{name}.exe")];

    if let Some(paths) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&paths) {
            for candidate in &candidates {
                let path = dir.join(candidate);
                if path.is_file() {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
    }

    for dir in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"] {
        for candidate in &candidates {
            let path = Path::new(dir).join(candidate);
            if path.is_file() {
                return Some(path.to_string_lossy().to_string());
            }
        }
    }

    None
}

/// 归一化解压结果，让不同上游压缩包的布局对上层一致。
///
/// - 只有一层顶层目录时下沉一层（exiftool 的 Windows 包是 `exiftool-13.59_64/...`）
/// - 上游 Windows 包的可执行文件叫 `exiftool(-k).exe`，改名成约定的 `exiftool.exe`
fn normalize_extracted_layout(dir: &Path) -> Result<(), String> {
    let entries: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("读取解压结果失败: {e}"))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            !path
                .file_name()
                .map(|name| name.to_string_lossy().starts_with('.'))
                .unwrap_or(true)
        })
        .collect();

    if entries.len() == 1 && entries[0].is_dir() {
        let inner = entries[0].clone();
        for entry in fs::read_dir(&inner).map_err(|e| format!("读取解压结果失败: {e}"))? {
            let entry = entry.map_err(|e| format!("读取解压结果失败: {e}"))?;
            let from = entry.path();
            let to = dir.join(entry.file_name());
            fs::rename(&from, &to).map_err(|e| format!("整理解压结果失败: {e}"))?;
        }
        let _ = fs::remove_dir(&inner);
    }

    let legacy = dir.join("exiftool(-k).exe");
    if legacy.is_file() {
        fs::rename(&legacy, dir.join("exiftool.exe"))
            .map_err(|e| format!("重命名 exiftool 失败: {e}"))?;
    }

    Ok(())
}

/// 解析「该用哪个可执行文件 + 前置参数」来运行某个组件。
///
/// 通用能力，不认识任何具体组件：「怎么跑」完全来自资产自己声明的 [`ComponentRun`]。
/// 规则是**装了就用装的，没装才用系统的** —— 用户主动安装的那份应当生效，
/// 系统里自带的那份只是省一次下载的便利。
///
/// 返回 `Ok(None)` 表示既没装、系统里也没有（由调用方决定怎么提示）。
pub fn component_command(
    app: &AppHandle,
    id: &str,
) -> Result<Option<(PathBuf, Vec<String>)>, String> {
    let entry = find_entry(id)?;

    if let Some(command) = installed_component_command(app, &entry)? {
        return Ok(Some(command));
    }

    Ok(entry
        .system_command
        .as_deref()
        .and_then(find_in_path)
        .map(|path| (PathBuf::from(path), Vec::new())))
}

/// 已安装的那份组件怎么跑（没装返回 None）。
fn installed_component_command(
    app: &AppHandle,
    entry: &PluginCatalogEntry,
) -> Result<Option<(PathBuf, Vec<String>)>, String> {
    let dir = plugin_dir(app, &entry.id)?;
    let Some(version) = active_version(&scan_installed(&dir)) else {
        return Ok(None);
    };
    let platform = current_platform();
    let Some(asset) = entry.assets.iter().find(|asset| asset.platform == platform) else {
        return Ok(None);
    };
    let root = dir.join(version);

    match &asset.run {
        ComponentRun::Executable { file } => {
            let exe = root.join(file);
            Ok(exe.is_file().then_some((exe, Vec::new())))
        }
        ComponentRun::Perl { script, lib } => {
            let script_path = root.join(script);

            if !script_path.is_file() {
                return Ok(None);
            }

            let Some(perl) = find_in_path("perl") else {
                return Ok(None);
            };

            Ok(Some((
                PathBuf::from(perl),
                vec![
                    "-I".to_string(),
                    root.join(lib).to_string_lossy().to_string(),
                    script_path.to_string_lossy().to_string(),
                ],
            )))
        }
    }
}

/// 已安装组件目录里某个文件的路径（例如 libheif 的 `heif-dec.exe`）。
///
/// 插件层不知道调用方要哪个文件：由各功能域自己把相对路径传进来。
pub fn component_file(app: &AppHandle, id: &str, relative: &str) -> Option<PathBuf> {
    let dir = plugin_dir(app, id).ok()?;
    let version = active_version(&scan_installed(&dir))?;
    let file = dir.join(version).join(relative);

    file.is_file().then_some(file)
}

/// 归一化用户填的源：去空白、去结尾斜杠，只接受 http(s)。
fn normalize_source(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_end_matches('/');

    if trimmed.is_empty() || !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return None;
    }

    Some(trimmed.to_string())
}

/// 源 + 插件子目录 + 文件名 → 完整地址。
fn source_url(source: &str, remote_dir: &str, file: &str) -> String {
    format!("{source}/{remote_dir}/{file}")
}

/// 配置里的源整理成可用列表；为空或全部非法时回落到官方默认源。
fn resolve_sources(sources: &[String]) -> Vec<String> {
    let cleaned: Vec<String> = sources
        .iter()
        .filter_map(|item| normalize_source(item))
        .collect();

    if cleaned.is_empty() {
        crate::config::default_plugin_sources()
    } else {
        cleaned
    }
}

/// 按顺序尝试各个源，第一个能拿到清单（且 `id` 对得上）的胜出。
async fn fetch_manifest_from_sources(
    entry: &PluginCatalogEntry,
    sources: &[String],
) -> Result<PluginManifestResult, String> {
    let mut last_error = String::from("没有可用的插件源");

    for source in resolve_sources(sources) {
        let url = source_url(&source, &entry.remote_dir, "manifest.json");

        match fetch_manifest(&url).await {
            Ok(manifest) if manifest.id == entry.id => {
                return Ok(PluginManifestResult { manifest, source });
            }
            Ok(manifest) => {
                last_error = format!("源 {source} 的清单与插件不匹配（期望 {}）", manifest.id);
            }
            Err(error) => {
                last_error = format!("{source}：{error}");
            }
        }
    }

    Err(format!("所有插件源都不可用（{last_error}）"))
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(DOWNLOAD_TIMEOUT_SECS))
        .user_agent("Copicseal")
        .build()
        .map_err(|e| format!("初始化网络客户端失败: {e}"))
}

async fn fetch_manifest(url: &str) -> Result<PluginManifest, String> {
    let response = http_client()?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("获取插件清单失败: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("获取插件清单失败: HTTP {}", response.status()));
    }

    if let Some(length) = response.content_length() {
        if length > MAX_MANIFEST_BYTES {
            return Err("插件清单异常（体积过大）".to_string());
        }
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("读取插件清单失败: {e}"))?;

    serde_json::from_str(&text).map_err(|e| format!("插件清单解析失败: {e}"))
}

/// 流式下载到文件，边下边算 sha256 并发进度事件。
async fn download_asset(
    app: &AppHandle,
    id: &str,
    url: &str,
    dest: &Path,
) -> Result<(u64, String), String> {
    let response = http_client()?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("下载插件失败: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("下载插件失败: HTTP {}", response.status()));
    }

    let total = response.content_length();
    let mut response = response;
    let mut file = fs::File::create(dest).map_err(|e| format!("创建插件临时文件失败: {e}"))?;
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    let mut reported = 0u64;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("下载插件失败: {e}"))?
    {
        file.write_all(&chunk)
            .map_err(|e| format!("写入插件临时文件失败: {e}"))?;
        hasher.update(&chunk);
        downloaded += chunk.len() as u64;

        if downloaded - reported >= PROGRESS_STEP_BYTES || Some(downloaded) == total {
            reported = downloaded;
            let percent = total
                .filter(|total| *total > 0)
                .map(|total| ((downloaded * 100 / total).min(100)) as u8);
            let _ = app.emit(
                PROGRESS_EVENT,
                PluginInstallProgress {
                    id: id.to_string(),
                    downloaded,
                    total,
                    percent,
                },
            );
        }
    }

    file.flush()
        .map_err(|e| format!("写入插件临时文件失败: {e}"))?;

    Ok((downloaded, to_hex(&hasher.finalize())))
}

/// 条目名必须落在目标目录内：拒绝绝对路径、盘符与 `..`。
///
/// zip crate 的 `enclosed_name` 已经做了一层，这里再显式过一遍（且有单测兜底）。
fn safe_entry_path(name: &str) -> Option<PathBuf> {
    let mut clean = PathBuf::new();

    for part in Path::new(name).components() {
        match part {
            std::path::Component::Normal(segment) => clean.push(segment),
            std::path::Component::CurDir => {}
            _ => return None,
        }
    }

    (!clean.as_os_str().is_empty()).then_some(clean)
}

/// 解压到目标目录：拒绝路径穿越条目，目录结构原样保留。
fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| format!("打开插件包失败: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("读取插件包失败: {e}"))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|e| format!("读取插件包条目失败: {e}"))?;

        let Some(name) = entry.enclosed_name() else {
            return Err("插件包内包含非法路径".to_string());
        };
        let Some(relative) = name.to_str().and_then(safe_entry_path) else {
            return Err("插件包内包含非法路径".to_string());
        };

        let target = dest.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&target).map_err(|e| format!("创建插件目录失败: {e}"))?;
            continue;
        }

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建插件目录失败: {e}"))?;
        }

        let mut output = fs::File::create(&target).map_err(|e| format!("解压插件文件失败: {e}"))?;
        std::io::copy(&mut entry, &mut output).map_err(|e| format!("解压插件文件失败: {e}"))?;
    }

    Ok(())
}

/// 安装成功后只保留这一版：旧版本目录删掉，避免几十 MB 的残留。
fn remove_other_versions(dir: &Path, keep: &str) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Ok(());
    };

    for entry in entries.filter_map(|entry| entry.ok()) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if entry.file_name().to_string_lossy() == keep {
            continue;
        }
        let _ = fs::remove_dir_all(path);
    }

    Ok(())
}

#[tauri::command]
pub fn list_plugins(app: AppHandle) -> Result<Vec<PluginState>, String> {
    catalog()
        .iter()
        .map(|entry| plugin_state(&app, entry))
        .collect()
}

#[tauri::command]
pub async fn fetch_plugin_manifest(
    id: String,
    sources: Vec<String>,
) -> Result<PluginManifestResult, String> {
    let entry = find_entry(&id)?;
    fetch_manifest_from_sources(&entry, &sources).await
}

#[tauri::command]
pub async fn install_plugin(
    app: AppHandle,
    id: String,
    sources: Vec<String>,
) -> Result<PluginInstallOutcome, String> {
    let entry = find_entry(&id)?;
    let platform = current_platform();
    let asset_ref = entry
        .assets
        .iter()
        .find(|asset| asset.platform == platform)
        .ok_or_else(|| format!("当前系统没有该插件的版本（{platform}）"))?
        .clone();

    let PluginManifestResult { manifest, source } =
        fetch_manifest_from_sources(&entry, &sources).await?;

    let asset = manifest
        .assets
        .iter()
        .find(|asset| asset.name == asset_ref.file)
        .ok_or_else(|| format!("插件清单里没有 {} 的资产", asset_ref.file))?
        .clone();

    let version = safe_segment(&manifest.version, "插件版本")?;
    let root = plugin_dir(&app, &entry.id)?;
    fs::create_dir_all(&root).map_err(|e| format!("创建插件目录失败: {e}"))?;

    let temp_zip = root.join(format!(".{version}.part.zip"));
    let staging = root.join(format!(".{version}.tmp"));
    let target = root.join(&version);
    let _ = fs::remove_file(&temp_zip);
    let _ = fs::remove_dir_all(&staging);

    // 资产与清单同源：清单是哪个源给的，包就从哪个源下
    let url = source_url(&source, &entry.remote_dir, &asset.name);
    let result = install_from_url(
        &app,
        &entry.id,
        &url,
        &asset,
        &asset_ref.required_files,
        &temp_zip,
        &staging,
        &target,
    )
    .await;

    // 任何失败都不留半成品
    let _ = fs::remove_file(&temp_zip);
    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }

    match result {
        Ok(()) => {
            let _ = fs::remove_dir_all(&staging);
            remove_other_versions(&root, &version)?;
            Ok(PluginInstallOutcome {
                state: plugin_state(&app, &entry)?,
                source,
            })
        }
        Err(error) => Err(error),
    }
}

#[allow(clippy::too_many_arguments)]
async fn install_from_url(
    app: &AppHandle,
    id: &str,
    url: &str,
    asset: &PluginAsset,
    required_files: &[String],
    temp_zip: &Path,
    staging: &Path,
    target: &Path,
) -> Result<(), String> {
    let (downloaded, sha256) = download_asset(app, id, url, temp_zip).await?;

    if downloaded != asset.size {
        return Err(format!(
            "插件包大小不符（期望 {} 字节，实际 {downloaded} 字节）",
            asset.size
        ));
    }

    if !sha256.eq_ignore_ascii_case(&asset.sha256) {
        return Err("插件包校验失败（sha256 不符）".to_string());
    }

    fs::create_dir_all(staging).map_err(|e| format!("创建插件临时目录失败: {e}"))?;
    extract_zip(temp_zip, staging)?;

    // 上游压缩包的结构在不同组件之间不一致（exiftool 的 Windows 包还多套一层版本目录、
    // 可执行文件叫 `exiftool(-k).exe`），这里统一归一化，再按资产声明的必需文件校验
    normalize_extracted_layout(staging)?;

    for required in required_files {
        if !staging.join(required).is_file() {
            return Err(format!("插件包缺少必需文件: {required}"));
        }
    }

    if target.exists() {
        fs::remove_dir_all(target).map_err(|e| format!("覆盖旧插件失败: {e}"))?;
    }

    fs::rename(staging, target).map_err(|e| format!("安装插件失败: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn remove_plugin(app: AppHandle, id: String) -> Result<(), String> {
    let _entry = find_entry(&id)?;
    let dir = plugin_dir(&app, &id)?;

    if dir.exists() {
        fs::remove_dir_all(&dir)
            .map_err(|e| format!("卸载插件失败（文件可能正被占用，请稍后重试）: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_single_root_and_exiftool_exe_name() {
        // 不放 %TEMP%：某些受限环境（沙箱 / 安全软件）会拒绝在那里建目录
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("plugin-normalize-probe");
        let _ = fs::remove_dir_all(&dir);
        let inner = dir.join("exiftool-13.59_64");
        fs::create_dir_all(&inner).unwrap();
        fs::write(inner.join("exiftool(-k).exe"), b"x").unwrap();
        fs::write(inner.join("README.txt"), b"x").unwrap();

        normalize_extracted_layout(&dir).unwrap();

        let moved_up = dir.join("exiftool.exe").is_file() && dir.join("README.txt").is_file();
        let inner_gone = !inner.exists();
        let _ = fs::remove_dir_all(&dir);

        assert!(
            moved_up,
            "单层顶层目录应下沉，内容提到根上，并把 exiftool(-k).exe 改名为 exiftool.exe"
        );
        assert!(inner_gone, "空壳目录应删掉");
    }

    #[test]
    fn finds_executables_in_path() {
        let known = if cfg!(target_os = "windows") {
            "explorer"
        } else {
            "sh"
        };

        assert!(find_in_path(known).is_some(), "{known} 应该在 PATH 里");
        assert!(find_in_path("definitely-not-a-real-binary-xyz").is_none());
    }

    #[test]
    fn normalizes_and_resolves_sources() {
        // 去空白、去结尾斜杠
        assert_eq!(
            normalize_source("  https://mirror.example.com/static/  ").unwrap(),
            "https://mirror.example.com/static"
        );
        // 只接受 http(s)
        assert!(normalize_source("ftp://mirror.example.com").is_none());
        assert!(normalize_source("mirror.example.com/static").is_none());
        assert!(normalize_source("   ").is_none());

        // 全是垃圾 / 空列表 → 回落到官方默认源
        assert_eq!(
            resolve_sources(&[]),
            crate::config::default_plugin_sources()
        );
        assert_eq!(
            resolve_sources(&["".to_string(), "nope".to_string()]),
            crate::config::default_plugin_sources()
        );

        // 混合输入：只保留合法项，顺序不变
        assert_eq!(
            resolve_sources(&[
                "https://mirror.example.com/static/".to_string(),
                "bad".to_string(),
                "http://127.0.0.1:8080/plugins".to_string(),
            ]),
            vec![
                "https://mirror.example.com/static".to_string(),
                "http://127.0.0.1:8080/plugins".to_string(),
            ]
        );
    }

    #[test]
    fn builds_urls_from_source_and_remote_dir() {
        assert_eq!(
            source_url("https://host/a", "libheif", "manifest.json"),
            "https://host/a/libheif/manifest.json"
        );
        assert_eq!(
            source_url("https://host/a", "libheif", "libheif-windows-x86_64.zip"),
            "https://host/a/libheif/libheif-windows-x86_64.zip"
        );
    }

    #[test]
    fn safe_segment_rejects_traversal() {
        assert!(safe_segment("../evil", "id").is_err());
        assert!(safe_segment("a/b", "id").is_err());
        assert!(safe_segment("", "id").is_err());
        assert_eq!(safe_segment("libheif", "id").unwrap(), "libheif");
        assert_eq!(safe_segment("1.23.1", "版本").unwrap(), "1.23.1");
    }

    #[test]
    fn platform_matches_catalog_assets() {
        let entry = find_entry(HEIF_PLUGIN_ID).unwrap();
        let platform = current_platform();
        let supported = entry
            .platforms
            .iter()
            .any(|item| item.as_str() == std::env::consts::OS);

        if std::env::consts::OS == "windows" {
            assert!(supported);
            assert!(entry.assets.iter().any(|asset| asset.platform == platform));
        } else {
            // macOS / Linux：目录里没有该平台的资产，安装入口应被挡住
            assert!(entry.assets.iter().all(|asset| asset.platform != platform));
        }
    }

    #[test]
    fn parses_the_published_manifest_shape() {
        let manifest: PluginManifest = serde_json::from_str(
            r#"{
              "id": "libheif",
              "version": "1.23.1",
              "notes": "note",
              "assets": [
                { "name": "libheif-windows-x86_64.zip", "size": 12910157, "sha256": "EBF1" }
              ]
            }"#,
        )
        .unwrap();

        assert_eq!(manifest.id, "libheif");
        assert_eq!(manifest.version, "1.23.1");
        assert_eq!(manifest.assets.len(), 1);
        assert_eq!(manifest.assets[0].size, 12910157);
    }

    #[test]
    fn safe_entry_path_rejects_escapes() {
        assert!(safe_entry_path("../evil.txt").is_none());
        assert!(safe_entry_path("a/../../evil.txt").is_none());
        assert!(safe_entry_path("/abs/evil.txt").is_none());
        assert!(safe_entry_path("").is_none());
        assert_eq!(
            safe_entry_path("heif-dec.exe").unwrap(),
            PathBuf::from("heif-dec.exe")
        );
        assert_eq!(
            safe_entry_path("./sub/heif-dec.exe").unwrap(),
            PathBuf::from("sub").join("heif-dec.exe")
        );
    }

    /// 手动跑：`cargo test --lib plugin:: -- --ignored`（需要网络，会下载约 13 MB）。
    ///
    /// 覆盖「拉清单 → 下载 → 校验体积与 sha256 → 解压 → 必需文件」整条链路：用的就是生产
    /// 代码的同一批函数与同一个 HTTP 客户端，只是绕过了需要 `AppHandle` 的进度上报。
    #[test]
    #[ignore = "需要访问 GitHub 静态仓库"]
    fn installs_from_the_published_source() {
        let entry = find_entry(HEIF_PLUGIN_ID).unwrap();
        let platform = current_platform();
        let Some(asset_ref) = entry.assets.iter().find(|asset| asset.platform == platform) else {
            // 非 Windows：目录里本就没有该平台的资产
            return;
        };

        tauri::async_runtime::block_on(async {
            // 传空源列表 → 走内置官方源，正好顺带验证「默认源可用」
            let PluginManifestResult { manifest, source } =
                fetch_manifest_from_sources(&entry, &[]).await.unwrap();
            assert_eq!(manifest.id, entry.id);

            let asset = manifest
                .assets
                .iter()
                .find(|asset| asset.name == asset_ref.file)
                .expect("清单里应有当前平台的资产");

            let response = http_client()
                .unwrap()
                .get(source_url(&source, &entry.remote_dir, &asset.name))
                .send()
                .await
                .unwrap();
            assert!(response.status().is_success());

            let bytes = response.bytes().await.unwrap();
            assert_eq!(bytes.len() as u64, asset.size, "体积应与清单一致");
            assert_eq!(
                to_hex(&Sha256::digest(bytes.as_ref())),
                asset.sha256.to_lowercase(),
                "sha256 应与清单一致"
            );

            // 不放 %TEMP%：某些受限环境（沙箱 / 安全软件）会拒绝在那里建目录
            let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("target")
                .join("plugin-probe");
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).unwrap();

            let zip_path = dir.join("asset.zip");
            fs::write(&zip_path, &bytes).unwrap();

            let dest = dir.join("out");
            fs::create_dir_all(&dest).unwrap();
            extract_zip(&zip_path, &dest).unwrap();
            // 归一化 + 必需文件校验与真实安装走同一条路（上游包结构不一致，先归一化再校验）
            normalize_extracted_layout(&dest).unwrap();

            let required = catalog()
                .iter()
                .find(|entry| entry.id == HEIF_PLUGIN_ID)
                .and_then(|entry| entry.assets.first())
                .map(|asset| asset.required_files.clone())
                .unwrap_or_default();

            for file in required {
                assert!(dest.join(&file).is_file(), "插件包里缺少 {file}");
            }

            let _ = fs::remove_dir_all(&dir);
        });
    }
}
