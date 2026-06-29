use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct FontInfo {
    pub family: String,
    pub postscript_name: Option<String>,
}

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<FontInfo>, String> {
    let source = font_kit::source::SystemSource::new();
    let families = source
        .all_families()
        .map_err(|e| format!("字体枚举失败: {}", e))?;

    let mut fonts: Vec<FontInfo> = families
        .into_iter()
        .map(|name| FontInfo {
            family: name,
            postscript_name: None,
        })
        .collect();

    fonts.sort_by_key(|a| a.family.to_lowercase());
    fonts.dedup_by(|a, b| a.family == b.family);

    Ok(fonts)
}
