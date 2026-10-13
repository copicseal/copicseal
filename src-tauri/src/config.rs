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
    /// EXIF 的显示口径（导出开关在 `output.retain_exif`）
    pub exif: ExifConfig,
    /// 插件下载源：默认内置官方源，用户可追加自己的镜像
    pub plugins: PluginConfig,
    /// 用户自己的设备档案（相机 / 镜头）：给不记录 EXIF 的机器与手动镜头用
    pub devices: DeviceConfig,
    /// 自定义品牌 Logo：内置品牌之外（或覆盖内置）的厂商标志
    pub logos: LogoConfig,
    /// 「更多功能」面板里已添加（启用）的小功能
    pub tools: ToolConfig,
    pub device_id: String,
}

/// 一条 EXIF 显示映射：命中的原文片段替换成展示值（空串＝删除该片段）。
///
/// 匹配在渲染侧做：大小写不敏感、词边界优先的子串匹配，同一字段首个命中生效。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct ExifMapping {
    /// 作用字段：make / model / lens_model
    pub field: String,
    pub r#match: String,
    pub replace: String,
}

/// EXIF 显示口径：拍摄时间格式、经纬度写法、焦段是否用等效 35mm、显示映射表。
///
/// 只影响写进照片的文字与「EXIF 信息」卡片的展示；导出文件里的元数据是原图 EXIF
/// 的搬运，不经过这里的映射与格式化。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct ExifConfig {
    pub date_format: String,
    /// letter = 度数+半球字母，chinese = 度数+中文（度分秒）
    pub gps_format: String,
    pub focal_length_35mm: bool,
    /// 显示映射；默认值就是内置表（`default_exif_mappings()`），清空即不再映射
    pub mappings: Vec<ExifMapping>,
}

impl Default for ExifConfig {
    fn default() -> Self {
        Self {
            date_format: "YYYY-MM-DD HH:mm:ss".to_string(),
            gps_format: "letter".to_string(),
            focal_length_35mm: false,
            mappings: default_exif_mappings(),
        }
    }
}

/// 内置显示映射：与旧版内置规则逐条对应，新装用户的 `exif.mappings` 默认就是它。
///
/// 前端同名的 `DEFAULT_EXIF_MAPPINGS`（`features/template/templates/exif-format.ts`）
/// 必须与本表保持一致，两边改动要同步。
pub fn default_exif_mappings() -> Vec<ExifMapping> {
    let model = |m: &str, r: &str| ExifMapping {
        field: "model".to_string(),
        r#match: m.to_string(),
        replace: r.to_string(),
    };
    let make = |m: &str, r: &str| ExifMapping {
        field: "make".to_string(),
        r#match: m.to_string(),
        replace: r.to_string(),
    };

    vec![
        model("ILCE-", "α"),
        model("NIKON Z ", "ℤ"),
        // 先匹配共享的那段（`Canon EOS` → `EOS`），再兜底删掉品牌词
        model("Canon EOS", "EOS"),
        model("Canon", ""),
        model("Digital Camera", ""),
        model("PENTAX", ""),
        make("SONY", "Sony"),
        make("LEICA", "Leica"),
        make("OLYMPUS", "Olympus"),
        make("OM", "Olympus"),
        make("NIKON", "Nikon"),
        make("PANASONIC", "Lumix"),
        make("PENTAX", "PENTAX"),
        make("RICOH", "RICOH"),
    ]
}

/// 插件下载源配置。
///
/// 源 = 一个「基础路径」，插件在它下面按 `<源>/<插件 id>/manifest.json` 与
/// `<源>/<插件 id>/<资产名>` 组织（镜像只要复刻同样的目录结构即可）。按列表顺序尝试，
/// 第一个能拿到清单的源胜出，同一个源再用于下载资产。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct PluginConfig {
    pub sources: Vec<String>,
}

impl Default for PluginConfig {
    fn default() -> Self {
        Self {
            sources: default_plugin_sources(),
        }
    }
}

/// 官方源：静态仓库 `main` 分支的原始文件地址。
pub fn default_plugin_sources() -> Vec<String> {
    vec!["https://raw.githubusercontent.com/copicseal/copicseal-static/main".to_string()]
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

/// 设备档案里的一行：字段名 + 用户手填的值。
///
/// `field` 取自前端那 10 个可改写字段（`make` / `model` / `lens_model` / `focal_length` /
/// `aperture` / `shutter_speed` / `iso` / `date_taken` / `latitude` / `longitude`），
/// 前端会忽略不认识的键，所以这里存字符串即可。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct DeviceFieldValue {
    pub field: String,
    pub value: String,
}

/// 用户自己的设备档案：相机或镜头，字段可自由增删。
///
/// 用途：相机 / 手动镜头不记录 EXIF 时，把已知信息存成档案，在边框水印页一键写进
/// 照片的「改动值」层（前端 `modifiedExif`），没有拍摄信息的照片也能有机型与参数。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct UserDeviceProfile {
    pub id: String,
    pub name: String,
    /// `camera` | `lens`
    pub category: String,
    pub fields: Vec<DeviceFieldValue>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct DeviceConfig {
    pub items: Vec<UserDeviceProfile>,
}

/// 一条自定义品牌 Logo。
///
/// 用途：内置品牌表（`src/assets/logos/`）收不全所有厂商，或者用户想换成自己的标志。
/// 匹配只看 EXIF 的 `make` / `model`：任一关键字出现即命中，数组顺序即优先级，
/// 自定义命中后**覆盖内置**。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct CustomLogo {
    pub id: String,
    pub name: String,
    /// 匹配关键字（大小写不敏感，逗号分隔由前端拆成数组）
    pub keywords: Vec<String>,
    /// 兜底：没有匹配到任何品牌时使用
    pub catch_all: bool,
    /// 工作区 `Logos/` 下的文件名
    pub file_name: String,
    pub size: u64,
    pub added_at: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct LogoConfig {
    pub items: Vec<CustomLogo>,
}

/// 「更多功能」面板里已启用的小功能。
///
/// 只记 id（功能本身是前端静态注册表，见 `src/features/tools/registry.ts`）：
/// 注册表里删掉某个 id 时，配置里的残留项会被前端忽略，不报错。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct ToolConfig {
    /// 已添加（启用）的功能 id，顺序即面板里的展示顺序
    pub enabled: Vec<String>,
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
            exif: ExifConfig::default(),
            plugins: PluginConfig::default(),
            devices: DeviceConfig::default(),
            logos: LogoConfig::default(),
            tools: ToolConfig::default(),
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
        exif: read_json_value(&conn, "exif")?.unwrap_or(defaults.exif),
        plugins: read_json_value(&conn, "plugins")?.unwrap_or(defaults.plugins),
        devices: read_json_value(&conn, "devices")?.unwrap_or(defaults.devices),
        logos: read_json_value(&conn, "logos")?.unwrap_or(defaults.logos),
        tools: read_json_value(&conn, "tools")?.unwrap_or(defaults.tools),
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

/// 写入配置。
///
/// 键是一份显式清单：**新增配置段时这里与 `load_from_db` 的读取清单都要加**，
/// 只加一边会出现「界面上改得动、离开页面又变回默认值」。
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
    write_json_value(&tx, "exif", &config.exif)?;
    write_json_value(&tx, "plugins", &config.plugins)?;
    write_json_value(&tx, "devices", &config.devices)?;
    write_json_value(&tx, "logos", &config.logos)?;
    write_json_value(&tx, "tools", &config.tools)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    /// `exif` 段的线上字段名是前后端的约定，改名会让配置静默丢值。
    ///
    /// 前端 `platform/contracts` 里的 `ExifSettings` 必须逐字对应这份键名；
    /// 对不上时 serde 会忽略未知字段并用默认值补齐，表现为「改完离开页面又变回默认」。
    #[test]
    fn exif_config_wire_keys_are_snake_case() {
        let value = serde_json::to_value(ExifConfig::default()).unwrap();
        let keys: Vec<&str> = value
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(
            keys,
            vec!["date_format", "focal_length_35mm", "gps_format", "mappings"]
        );

        let mapping = serde_json::to_value(ExifMapping::default()).unwrap();
        let mapping_keys: Vec<&str> = mapping
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(mapping_keys, vec!["field", "match", "replace"]);
    }

    /// 前端的载荷（下划线键）要能原样读回来，不被 `#[serde(default)]` 吞掉。
    #[test]
    fn exif_config_accepts_the_frontend_payload() {
        let payload = r#"{
            "date_format": "YYYY/MM/DD",
            "gps_format": "chinese",
            "focal_length_35mm": true,
            "mappings": [{ "field": "model", "match": "ILCE-", "replace": "α" }]
        }"#;
        let config: ExifConfig = serde_json::from_str(payload).unwrap();

        assert_eq!(config.date_format, "YYYY/MM/DD");
        assert_eq!(config.gps_format, "chinese");
        assert!(config.focal_length_35mm);
        assert_eq!(config.mappings.len(), 1);
        assert_eq!(config.mappings[0].r#match, "ILCE-");
    }

    /// 新装用户的默认映射就是内置表（不是空表：空表是「不做映射」的意思）。
    #[test]
    fn default_exif_config_carries_the_builtin_mappings() {
        let config = ExifConfig::default();
        assert_eq!(config.mappings.len(), 14);
        assert_eq!(config.date_format, "YYYY-MM-DD HH:mm:ss");
        assert_eq!(config.gps_format, "letter");
        assert!(!config.focal_length_35mm);
    }

    /// `devices` 段的线上字段名同样是前后端约定，改名会让设备档案静默丢字段。
    #[test]
    fn device_config_wire_keys_are_snake_case() {
        let profile = serde_json::to_value(UserDeviceProfile::default()).unwrap();
        let profile_keys: Vec<&str> = profile
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(
            profile_keys,
            vec![
                "category",
                "created_at",
                "fields",
                "id",
                "name",
                "updated_at"
            ]
        );

        let field = serde_json::to_value(DeviceFieldValue::default()).unwrap();
        let field_keys: Vec<&str> = field
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(field_keys, vec!["field", "value"]);

        let config = serde_json::to_value(DeviceConfig::default()).unwrap();
        let config_keys: Vec<&str> = config
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(config_keys, vec!["items"]);
    }

    /// 前端载荷（下划线键 + 字段数组）要能原样读回来，不被 `#[serde(default)]` 吞掉。
    #[test]
    fn device_config_accepts_the_frontend_payload() {
        let payload = r#"{
            "items": [
                {
                    "id": "d-1",
                    "name": "A7M4",
                    "category": "camera",
                    "fields": [
                        { "field": "make", "value": "SONY" },
                        { "field": "model", "value": "ILCE-7M4" }
                    ],
                    "created_at": 1,
                    "updated_at": 2
                }
            ]
        }"#;
        let config: DeviceConfig = serde_json::from_str(payload).unwrap();

        assert_eq!(config.items.len(), 1);
        assert_eq!(config.items[0].category, "camera");
        assert_eq!(config.items[0].fields.len(), 2);
        assert_eq!(config.items[0].fields[1].value, "ILCE-7M4");
        assert_eq!(config.items[0].updated_at, 2);
    }

    /// `logos` 段的键名同样是前后端约定：改名会让自定义 Logo 静默丢失。
    #[test]
    fn logo_config_wire_keys_are_snake_case() {
        let logo = serde_json::to_value(CustomLogo::default()).unwrap();
        let logo_keys: Vec<&str> = logo
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(
            logo_keys,
            vec![
                "added_at",
                "catch_all",
                "file_name",
                "id",
                "keywords",
                "name",
                "size"
            ]
        );

        let config = serde_json::to_value(LogoConfig::default()).unwrap();
        let config_keys: Vec<&str> = config
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(config_keys, vec!["items"]);
    }

    /// 前端载荷（下划线键 + 关键字数组）要能原样读回来。
    #[test]
    fn logo_config_accepts_the_frontend_payload() {
        let payload = r#"{
            "items": [
                {
                    "id": "l-1",
                    "name": "我的厂牌",
                    "keywords": ["SONY", "ILCE"],
                    "catch_all": false,
                    "file_name": "mylogo.svg",
                    "size": 2048,
                    "added_at": 7
                }
            ]
        }"#;
        let config: LogoConfig = serde_json::from_str(payload).unwrap();

        assert_eq!(config.items.len(), 1);
        assert_eq!(config.items[0].keywords, vec!["SONY", "ILCE"]);
        assert!(!config.items[0].catch_all);
        assert_eq!(config.items[0].file_name, "mylogo.svg");
        assert_eq!(config.items[0].size, 2048);
    }

    /// `tools` 段的键名同样是前后端约定。
    #[test]
    fn tool_config_wire_keys_are_snake_case() {
        let config = serde_json::to_value(ToolConfig::default()).unwrap();
        let keys: Vec<&str> = config
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();

        assert_eq!(keys, vec!["enabled"]);
    }

    /// 前端载荷（已启用功能 id 数组）要能原样读回来；注册表里已删掉的 id 也不丢，
    /// 由前端忽略（这样降级/回滚版本时不会连累用户配置）。
    #[test]
    fn tool_config_accepts_the_frontend_payload() {
        let payload = r#"{ "enabled": ["shutter-count", "removed-tool"] }"#;
        let config: ToolConfig = serde_json::from_str(payload).unwrap();

        assert_eq!(config.enabled, vec!["shutter-count", "removed-tool"]);
    }
}
