use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppVersion {
    pub version: String,
    pub name: String,
}

#[tauri::command]
pub fn get_app_info(app: tauri::AppHandle) -> AppVersion {
    let config = app.config();
    AppVersion {
        version: config
            .version
            .clone()
            .unwrap_or_else(|| "0.0.0".to_string()),
        name: config
            .product_name
            .clone()
            .unwrap_or_else(|| "Copicseal".to_string()),
    }
}
