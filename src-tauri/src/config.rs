use crate::db;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub language: String,
    pub theme: String,
    pub save_directory: String,
    pub output: OutputConfig,
    pub fonts: FontConfig,
    pub template_presets: Vec<TemplatePreset>,
    pub template_list: TemplateListConfig,
    pub user_devices: Vec<UserDevice>,
    pub device_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct OutputConfig {
    pub presets: Vec<OutputPreset>,
    pub default_path: String,
    pub retain_exif: bool,
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
    pub favorites: Vec<String>,
    pub default_font: String,
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
        let save = default_save_directory();

        Self {
            language: "zh-CN".to_string(),
            theme: "system".to_string(),
            save_directory: save,
            output: OutputConfig::default(),
            fonts: FontConfig::default(),
            template_presets: Vec::new(),
            template_list: TemplateListConfig::default(),
            user_devices: Vec::new(),
            device_id: String::new(),
        }
    }
}

impl Default for OutputConfig {
    fn default() -> Self {
        Self {
            presets: Vec::new(),
            default_path: default_save_directory(),
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

fn default_save_directory() -> String {
    dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Copicseal")
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

fn load_from_db(app: &tauri::AppHandle) -> Result<AppConfig, String> {
    let conn = db::open_database(app)?;
    let defaults = AppConfig::default();

    Ok(AppConfig {
        language: read_json_value(&conn, "language")?.unwrap_or(defaults.language),
        theme: read_json_value(&conn, "theme")?.unwrap_or(defaults.theme),
        save_directory: read_json_value(&conn, "save_directory")?
            .unwrap_or(defaults.save_directory),
        output: read_json_value(&conn, "output")?.unwrap_or(defaults.output),
        fonts: read_json_value(&conn, "fonts")?.unwrap_or(defaults.fonts),
        template_presets: read_json_value(&conn, "template_presets")?
            .unwrap_or(defaults.template_presets),
        template_list: read_json_value(&conn, "template_list")?.unwrap_or(defaults.template_list),
        user_devices: read_json_value(&conn, "user_devices")?.unwrap_or(defaults.user_devices),
        device_id: read_json_value(&conn, "device_id")?.unwrap_or_default(),
    })
}

fn save_to_db(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let mut conn = db::open_database(app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("创建配置事务失败: {e}"))?;

    write_json_value(&tx, "language", &config.language)?;
    write_json_value(&tx, "theme", &config.theme)?;
    write_json_value(&tx, "save_directory", &config.save_directory)?;
    write_json_value(&tx, "output", &config.output)?;
    write_json_value(&tx, "fonts", &config.fonts)?;
    write_json_value(&tx, "template_presets", &config.template_presets)?;
    write_json_value(&tx, "template_list", &config.template_list)?;
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
