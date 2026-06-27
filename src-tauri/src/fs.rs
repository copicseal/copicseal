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

#[tauri::command]
pub async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
pub async fn convert_heic_to_png(input: String) -> Result<String, String> {
    let input_path = Path::new(&input);
    if !input_path.exists() {
        return Err(format!("文件不存在: {}", input));
    }

    let output = input_path.with_extension("png");
    let output_str = output.to_string_lossy().to_string();

    if output.exists() {
        return Ok(output_str);
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("sips")
            .args(["-s", "format", "png", &input, "--out", &output_str])
            .status()
            .map_err(|e| format!("sips 执行失败: {}", e))?;

        if !status.success() {
            return Err("sips 转换 HEIC 失败".into());
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Err("HEIC 转 PNG 仅在 macOS 上支持".into());
    }

    Ok(output_str)
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

/// 列出目录中的受支持图片文件
#[tauri::command]
pub async fn list_image_files_in_directory(path: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path);

    if !dir.exists() {
        return Err(format!("目录不存在: {}", dir.display()));
    }

    if !dir.is_dir() {
        return Err(format!("不是目录: {}", dir.display()));
    }

    let entries = std::fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))?;
    let mut paths = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let entry_path = entry.path();

        if entry_path.is_file() && is_supported_image(&entry_path) {
            paths.push(entry_path.to_string_lossy().to_string());
        }
    }

    paths.sort();
    Ok(paths)
}
