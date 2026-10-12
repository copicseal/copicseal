use tauri::{AppHandle, Manager, WebviewWindow};

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

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
            #[cfg(target_os = "macos")]
            {
                window
                    .set_title_bar_style(TitleBarStyle::Visible)
                    .map_err(|e| format!("切换标题栏样式失败: {e}"))?;

                window
                    .set_title("Copicseal")
                    .map_err(|e| format!("恢复窗口标题失败: {e}"))?;
            }

            #[cfg(target_os = "windows")]
            {
                window
                    .set_shadow(true)
                    .map_err(|e| format!("启用窗口阴影失败: {e}"))?;

                window
                    .set_decorations(true)
                    .map_err(|e| format!("启用窗口装饰失败: {e}"))?;
            }
        }
        WindowFrameMode::Frameless => {
            #[cfg(target_os = "macos")]
            {
                window
                    .set_title_bar_style(TitleBarStyle::Overlay)
                    .map_err(|e| format!("切换标题栏样式失败: {e}"))?;

                window
                    .set_title("")
                    .map_err(|e| format!("隐藏窗口标题失败: {e}"))?;
            }

            #[cfg(target_os = "windows")]
            {
                window
                    .set_shadow(false)
                    .map_err(|e| format!("关闭窗口阴影失败: {e}"))?;

                window
                    .set_decorations(false)
                    .map_err(|e| format!("关闭窗口装饰失败: {e}"))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn apply_window_frame_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    apply_main_window_frame_mode(&app, &mode)
}

/// 打开窗口的开发者工具。
///
/// 打包版默认没有 DevTools 入口（release 构建下 wry 会关掉它），设置页「关于」的
/// Logo 连点 5 次会调它，用来排查渲染与资源加载问题。
///
/// 这里直接调用、不加 `cfg`：`open_devtools` 只在 tauri 的 `devtools` feature 或
/// debug 构建下存在，而 Cargo.toml 已经固定给 tauri 打开了该 feature。若将来把那个
/// feature 去掉，这里会编译失败——比静默失效更容易发现。
#[tauri::command]
pub fn open_devtools(window: WebviewWindow) {
    window.open_devtools();
}
