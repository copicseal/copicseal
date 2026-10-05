use serde::Serialize;
use tauri_plugin_opener::OpenerExt;

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

/// 用系统默认程序打开外部链接。
///
/// 只放行 http(s)：这个命令的入参最终会交给系统打开器，限制协议可以避免
/// 前端被注入 `file://` 之类的东西后拉起本地文件。
#[tauri::command]
pub fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err(format!("只允许打开 http(s) 链接: {url}"));
    }

    app.opener()
        .open_url(url, None::<String>)
        .map_err(|error| error.to_string())
}
