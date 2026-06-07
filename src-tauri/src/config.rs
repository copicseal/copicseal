use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const CONFIG_FILENAME: &str = "config.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub language: String,
    pub theme: String,
    pub save_directory: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let save = dirs::document_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Copicseal")
            .to_string_lossy()
            .to_string();

        Self {
            language: "zh-CN".to_string(),
            theme: "system".to_string(),
            save_directory: save,
        }
    }
}

fn config_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取配置目录: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建配置目录: {}", e))?;
    Ok(dir.join(CONFIG_FILENAME))
}

fn load_from_disk(app: &tauri::AppHandle) -> Result<AppConfig, String> {
    let path = config_file_path(app)?;
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| format!("读取配置失败: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析配置失败: {}", e))
    } else {
        Ok(AppConfig::default())
    }
}

fn save_to_disk(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_file_path(app)?;
    let content =
        serde_json::to_string_pretty(config).map_err(|e| format!("序列化配置失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("写入配置失败: {}", e))
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    load_from_disk(&app)
}

#[tauri::command]
pub fn update_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    save_to_disk(&app, &config)
}
