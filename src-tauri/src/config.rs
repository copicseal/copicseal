use crate::db;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub language: String,
    pub theme: String,
    pub window_frame_mode: String,
    pub save_directory: String,
    pub cache: CacheConfig,
    pub output: OutputConfig,
    pub fonts: FontConfig,
    pub template_presets: Vec<TemplatePreset>,
    pub template_list: TemplateListConfig,
    /// 拼图模块的默认值：新建拼图用哪套画布样式与导出参数
    pub collage: CollageConfig,
    pub user_devices: Vec<UserDevice>,
    pub device_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct CacheConfig {
    pub directory: String,
    pub auto_cleanup_on_startup: bool,
    pub max_age_days: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct OutputConfig {
    pub presets: Vec<OutputPreset>,
    /// 导出面板「常用尺寸」下拉的快捷尺寸，可在设置 → 边框水印 → 导出里增删
    pub sizes: Vec<OutputSize>,
    pub default_path: String,
    pub retain_exif: bool,
}

/// 拼图默认值：设置 → 拼图 →「默认项 / 导出」两页写的就是这里。
///
/// 只在「新建/恢复默认」时被读：已经摆在画布上的拼图不会被它改掉。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct CollageConfig {
    /// 默认布局模式：grid / long / free
    pub layout_mode: String,
    /// 默认网格布局 id；空字符串表示用布局库的第一个
    pub layout_id: String,
    pub aspect_preset: String,
    pub custom_ratio_width: u32,
    pub custom_ratio_height: u32,
    pub background_color: String,
    pub gap: u32,
    pub padding: u32,
    pub border_radius: u32,
    pub shadow: u32,
    pub long_direction: String,
    pub long_align: String,
    pub long_size: u32,
    pub export_format: String,
    pub export_quality: String,
    pub export_scale: f64,
    pub export_width: u32,
    pub export_height: u32,
    pub export_lock_ratio: bool,
}

impl Default for CollageConfig {
    fn default() -> Self {
        Self {
            layout_mode: "grid".to_string(),
            layout_id: String::new(),
            aspect_preset: "1:1".to_string(),
            custom_ratio_width: 4,
            custom_ratio_height: 5,
            background_color: "#ffffff".to_string(),
            gap: 12,
            padding: 20,
            border_radius: 18,
            shadow: 18,
            long_direction: "vertical".to_string(),
            long_align: "center".to_string(),
            long_size: 720,
            export_format: "png".to_string(),
            export_quality: "high".to_string(),
            export_scale: 1.0,
            export_width: 2048,
            export_height: 2048,
            export_lock_ratio: true,
        }
    }
}

/// 一条常用尺寸：点一下即按该尺寸新建导出档位。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct OutputSize {
    pub id: Option<String>,
    pub label: String,
    pub width: u32,
    pub height: u32,
}

impl Default for OutputSize {
    fn default() -> Self {
        Self {
            id: None,
            label: "自定义".to_string(),
            width: 1920,
            height: 1080,
        }
    }
}

/// 内置常用尺寸：长边常见的成片规格 + 两个社交平台推荐像素。
///
/// 注意这是**初始值**：写进配置后由用户自己增删，删空即没有快捷尺寸。
fn default_output_sizes() -> Vec<OutputSize> {
    let preset = |label: &str, width: u32, height: u32| OutputSize {
        id: None,
        label: label.to_string(),
        width,
        height,
    };

    vec![
        preset("1080P", 1920, 1080),
        preset("2K", 2560, 1440),
        preset("2K 竖屏", 1440, 2560),
        preset("4K", 3840, 2160),
        preset("4K 竖屏", 2160, 3840),
        preset("方图 1080", 1080, 1080),
        preset("方图 2048", 2048, 2048),
        preset("朋友圈 2:1", 4524, 2262),
        preset("小红书", 1280, 1706),
    ]
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct OutputPreset {
    pub id: Option<String>,
    pub name: Option<String>,
    pub r#type: String,
    pub width: u32,
    pub height: u32,
    pub scale: f32,
    pub quality: f32,
    pub is_original: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct FontConfig {
    /// 引入的本机字体族名（只记引用，不复制系统字体文件）
    pub favorites: Vec<String>,
    pub default_font: String,
    /// 导入到工作区 `Fonts/` 的字体文件（在线下载与自定义导入都落在这里）
    pub imported: Vec<ImportedFont>,
    /// 字体备注：按族名记，本机引用与导入字体共用（如「手写」「正文」）
    pub notes: Vec<FontNote>,
}

/// 一条字体备注。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct FontNote {
    pub family: String,
    pub note: String,
}

/// 一个导入的字体文件。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct ImportedFont {
    pub id: String,
    /// 工作区 `Fonts/` 下的文件名
    pub file_name: String,
    /// CSS 族名：默认取字体自身的族名，与系统字体重名时加后缀
    pub family: String,
    /// `online` | `file`
    pub source: String,
    /// 来源（下载地址或原始文件路径），仅作展示
    pub origin: String,
    pub size: u64,
    pub added_at: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct TemplatePreset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template_id: String,
    pub template_props: serde_json::Value,
    pub background: serde_json::Value,
    pub font: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct TemplateListConfig {
    pub enabled: Vec<EnabledTemplate>,
    pub remote_registry: Vec<TemplateRegistry>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct EnabledTemplate {
    pub template_id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct TemplateRegistry {
    pub id: String,
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct UserDevice {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub brand: String,
    pub model: String,
    pub lens: String,
    pub exif_overrides: serde_json::Value,
}

impl Default for AppConfig {
    fn default() -> Self {
        let save_directory = default_save_directory();

        Self {
            language: "zh-CN".to_string(),
            theme: "system".to_string(),
            window_frame_mode: "frameless".to_string(),
            save_directory: save_directory.clone(),
            cache: CacheConfig::with_save_directory(&save_directory),
            output: OutputConfig::default(),
            fonts: FontConfig::default(),
            template_presets: Vec::new(),
            template_list: TemplateListConfig::default(),
            collage: CollageConfig::default(),
            user_devices: Vec::new(),
            device_id: String::new(),
        }
    }
}

impl CacheConfig {
    pub fn with_save_directory(save_directory: &str) -> Self {
        Self {
            directory: default_cache_directory(save_directory),
            auto_cleanup_on_startup: true,
            max_age_days: 30,
        }
    }
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self::with_save_directory(&default_save_directory())
    }
}

impl Default for OutputConfig {
    fn default() -> Self {
        Self {
            presets: Vec::new(),
            sizes: default_output_sizes(),
            default_path: default_export_directory(),
            retain_exif: true,
        }
    }
}

impl Default for OutputPreset {
    fn default() -> Self {
        Self {
            id: None,
            name: None,
            r#type: "jpeg".to_string(),
            width: 2048,
            height: 2048,
            scale: 1.0,
            quality: 0.92,
            is_original: false,
        }
    }
}

impl Default for FontConfig {
    fn default() -> Self {
        Self {
            favorites: Vec::new(),
            default_font: "Helvetica Neue".to_string(),
            imported: Vec::new(),
            notes: Vec::new(),
        }
    }
}

impl Default for TemplatePreset {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: String::new(),
            template_id: String::new(),
            template_props: serde_json::json!({}),
            background: serde_json::json!({}),
            font: String::new(),
        }
    }
}

impl Default for TemplateListConfig {
    fn default() -> Self {
        Self {
            enabled: vec![EnabledTemplate {
                template_id: "minimal".to_string(),
                name: "极简".to_string(),
            }],
            remote_registry: Vec::new(),
        }
    }
}

/// 应用数据根目录，同时也是默认的工作区目录。
fn default_app_directory() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Copicseal")
}

/// 工作区目录：应用自己的数据根目录，缓存等派生目录挂在它下面。
fn default_save_directory() -> String {
    default_app_directory().to_string_lossy().to_string()
}

/// 默认缓存目录：工作区目录下的 Cache，首字母大写与 Output 保持一致。
pub fn default_cache_directory(save_directory: &str) -> String {
    Path::new(save_directory)
        .join("Cache")
        .to_string_lossy()
        .to_string()
}

/// 默认文件导出目录：工作区根目录下的 Output，成品不和缓存混在一起。
fn default_export_directory() -> String {
    default_app_directory()
        .join("Output")
        .to_string_lossy()
        .to_string()
}

impl Default for UserDevice {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            device_type: "camera".to_string(),
            brand: String::new(),
            model: String::new(),
            lens: String::new(),
            exif_overrides: serde_json::json!({}),
        }
    }
}

fn read_json_value<T>(conn: &Connection, key: &str) -> Result<Option<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    let value = db::get_config_value(conn, key)?;
    value
        .map(|content| {
            serde_json::from_str(&content).map_err(|e| format!("解析配置 {key} 失败: {e}"))
        })
        .transpose()
}

fn write_json_value<T>(conn: &Connection, key: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let content =
        serde_json::to_string(value).map_err(|e| format!("序列化配置 {key} 失败: {e}"))?;
    db::set_config_value(conn, key, &content)
}

fn normalize_cache_config(cache: Option<CacheConfig>, save_directory: &str) -> CacheConfig {
    let mut next = cache.unwrap_or_else(|| CacheConfig::with_save_directory(save_directory));
    if next.directory.trim().is_empty() {
        next.directory = default_cache_directory(save_directory);
    }
    if next.max_age_days == 0 {
        next.max_age_days = 30;
    }
    next
}

fn load_from_db(app: &tauri::AppHandle) -> Result<AppConfig, String> {
    let conn = db::open_database(app)?;
    let defaults = AppConfig::default();

    let save_directory =
        read_json_value(&conn, "save_directory")?.unwrap_or(defaults.save_directory);
    let cache = normalize_cache_config(read_json_value(&conn, "cache")?, &save_directory);

    let mut config = AppConfig {
        language: read_json_value(&conn, "language")?.unwrap_or(defaults.language),
        theme: read_json_value(&conn, "theme")?.unwrap_or(defaults.theme),
        window_frame_mode: read_json_value(&conn, "window_frame_mode")?
            .unwrap_or(defaults.window_frame_mode),
        save_directory,
        cache,
        output: read_json_value(&conn, "output")?.unwrap_or(defaults.output),
        fonts: read_json_value(&conn, "fonts")?.unwrap_or(defaults.fonts),
        template_presets: read_json_value(&conn, "template_presets")?
            .unwrap_or(defaults.template_presets),
        template_list: read_json_value(&conn, "template_list")?.unwrap_or(defaults.template_list),
        collage: read_json_value(&conn, "collage")?.unwrap_or(defaults.collage),
        user_devices: read_json_value(&conn, "user_devices")?.unwrap_or(defaults.user_devices),
        device_id: read_json_value(&conn, "device_id")?.unwrap_or_default(),
    };

    migrate_legacy_defaults(&mut config);
    Ok(config)
}

/// 把"恰好等于老默认值"的配置迁移到新默认值。
///
/// 老的默认值都写在库里，光改默认值追不上；用户自己选过目录的则原样保留。
///
/// - 导出目录：老版本就是工作区目录（`<文档>/Copicseal`），现在成品挪进 `Output`
/// - 缓存目录：老版本是工作区目录下的 `cache`，现在统一成首字母大写的 `Cache`
fn migrate_legacy_defaults(config: &mut AppConfig) {
    let legacy_export = default_save_directory();
    let current_export = config.output.default_path.trim();

    if current_export.is_empty() || current_export == legacy_export {
        config.output.default_path = default_export_directory();
    }

    let legacy_cache = Path::new(&config.save_directory)
        .join("cache")
        .to_string_lossy()
        .to_string();
    if config.cache.directory.trim() == legacy_cache {
        config.cache.directory = default_cache_directory(&config.save_directory);
    }
}

fn save_to_db(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let mut conn = db::open_database(app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("创建配置事务失败: {e}"))?;

    write_json_value(&tx, "language", &config.language)?;
    write_json_value(&tx, "theme", &config.theme)?;
    write_json_value(&tx, "window_frame_mode", &config.window_frame_mode)?;
    write_json_value(&tx, "save_directory", &config.save_directory)?;
    write_json_value(&tx, "cache", &config.cache)?;
    write_json_value(&tx, "output", &config.output)?;
    write_json_value(&tx, "fonts", &config.fonts)?;
    write_json_value(&tx, "template_presets", &config.template_presets)?;
    write_json_value(&tx, "template_list", &config.template_list)?;
    write_json_value(&tx, "collage", &config.collage)?;
    write_json_value(&tx, "user_devices", &config.user_devices)?;
    write_json_value(&tx, "device_id", &config.device_id)?;

    tx.commit().map_err(|e| format!("提交配置事务失败: {e}"))
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    load_from_db(&app)
}

#[tauri::command]
pub fn update_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    save_to_db(&app, &config)
}

#[tauri::command]
pub fn get_device_id(app: tauri::AppHandle) -> Result<String, String> {
    let mut config = load_from_db(&app)?;
    if config.device_id.is_empty() {
        config.device_id = uuid::Uuid::new_v4().to_string();
        save_to_db(&app, &config)?;
    }
    Ok(config.device_id.clone())
}
