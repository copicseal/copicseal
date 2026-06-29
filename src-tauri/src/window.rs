use tauri::{AppHandle, Manager, WebviewWindow};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum WindowFrameMode {
    Native,
    Frameless,
}

impl WindowFrameMode {
    fn from_str(value: &str) -> Self {
        match value {
            "native" => Self::Native,
            _ => Self::Frameless,
        }
    }
}

pub fn apply_main_window_frame_mode(app: &AppHandle, mode: &str) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;

    apply_frame_mode(&window, WindowFrameMode::from_str(mode))
}

fn apply_frame_mode(window: &WebviewWindow, mode: WindowFrameMode) -> Result<(), String> {
    match mode {
        WindowFrameMode::Native => {
            window
                .set_decorations(true)
                .map_err(|e| format!("启用系统边框失败: {e}"))?;

            #[cfg(not(target_os = "macos"))]
            window
                .set_shadow(true)
                .map_err(|e| format!("启用窗口阴影失败: {e}"))?;
        }
        WindowFrameMode::Frameless => {
            window
                .set_decorations(false)
                .map_err(|e| format!("切换为无边框窗口失败: {e}"))?;

            #[cfg(not(target_os = "macos"))]
            window
                .set_shadow(false)
                .map_err(|e| format!("关闭窗口阴影失败: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn apply_window_frame_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    apply_main_window_frame_mode(&app, &mode)
}
