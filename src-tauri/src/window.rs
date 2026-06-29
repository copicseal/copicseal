use tauri::{AppHandle, Manager, TitleBarStyle, WebviewWindow};

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
                .set_title_bar_style(TitleBarStyle::Visible)
                .map_err(|e| format!("切换标题栏样式失败: {e}"))?;

            window
                .set_title("Copicseal")
                .map_err(|e| format!("恢复窗口标题失败: {e}"))?;

            #[cfg(not(target_os = "macos"))]
            window
                .set_shadow(true)
                .map_err(|e| format!("启用窗口阴影失败: {e}"))?;
        }
        WindowFrameMode::Frameless => {
            window
                .set_title_bar_style(TitleBarStyle::Overlay)
                .map_err(|e| format!("切换标题栏样式失败: {e}"))?;

            window
                .set_title("")
                .map_err(|e| format!("隐藏窗口标题失败: {e}"))?;

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
