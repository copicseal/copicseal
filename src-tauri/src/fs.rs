use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct ImageMeta {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub ext: String,
    pub mime_type: String,
}

/// 支持的图片格式
const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "heic", "webp"];

/// 检查文件是否为支持的图片格式
fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// 读取图片文件元数据
#[tauri::command]
pub async fn read_image_file(path: String) -> Result<ImageMeta, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    if !is_supported_image(path) {
        return Err(format!("不支持的格式: {}", path.display()));
    }

    let metadata = std::fs::metadata(path).map_err(|e| format!("读取文件失败: {}", e))?;

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "heic" => "image/heic",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };

    Ok(ImageMeta {
        name: path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        ext,
        mime_type: mime_type.to_string(),
    })
}
