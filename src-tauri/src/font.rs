use std::borrow::Cow;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use allsorts::binary::read::{ReadBinary, ReadScope};
use allsorts::font_data::FontData;
use allsorts::get_name::fontcode_get_name;
use allsorts::subset::{subset as subset_font, CmapTarget, SubsetProfile};
use allsorts::tables::FontTableProvider;
use base64::prelude::{Engine as _, BASE64_STANDARD};
use font_kit::font::Font;
use font_kit::handle::Handle;
use font_kit::source::SystemSource;
use serde::Serialize;

use crate::config::ImportedFont;

#[derive(Debug, Serialize, Clone)]
pub struct FontInfo {
    pub family: String,
    pub postscript_name: Option<String>,
}

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<FontInfo>, String> {
    let source = SystemSource::new();
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

/// 内联到快照里的字体：已按画布上用到的字符做过子集化。
#[derive(Debug, Serialize, Clone)]
pub struct InlineFont {
    pub family: String,
    /// `data:font/ttf;base64,...`，可直接写进 `@font-face` 的 `src`
    pub data_url: String,
}

/// 取字型字节与它在集合里的下标。
///
/// 两种来源都要处理：磁盘上的字体文件，以及**内存字型**——macOS 按需下载的字体
/// （「行楷-简」这类）交给 CoreText 的就是内存数据，没有文件路径可用。
fn face_bytes(handle: &Handle) -> Option<(Cow<'_, [u8]>, u32)> {
    match handle {
        Handle::Path { path, font_index } => std::fs::read(path)
            .ok()
            .map(|data| (Cow::Owned(data), *font_index)),
        // 内存字型直接借用：中文集合动辄几十兆，每次导出克隆一份代价太大
        Handle::Memory { bytes, font_index } => {
            Some((Cow::Borrowed(bytes.as_slice()), *font_index))
        }
    }
}

/// 在家族里挑一个最接近「常规正体」的字型。
///
/// CoreText 报上来的字重并不总可信（按需下载的字体常常一律报 `Oblique` 加一个非标准
/// 字重），所以这里不追求精确匹配，只按两个可用信号打分：族名末尾的语言标记
/// （`SC` / `TC` / `HK` / `JP` / `KR`）是否出现在字型名里，以及字重离 400 有多远。
fn choose_face<'a>(family: &str, handles: &'a [Handle]) -> Option<&'a Handle> {
    let token = family
        .split_whitespace()
        .next_back()
        .map(str::to_ascii_uppercase)
        .filter(|token| matches!(token.as_str(), "SC" | "TC" | "HK" | "JP" | "KR"));

    let mut best: Option<(&Handle, f32)> = None;
    for handle in handles {
        let Ok(font) = handle.load() else {
            continue;
        };

        let names = format!(
            "{} {}",
            font.postscript_name().unwrap_or_default(),
            font.full_name()
        )
        .to_ascii_uppercase();
        let script_penalty = match &token {
            Some(token) if !names.contains(token) => 1000.0,
            _ => 0.0,
        };
        let score = script_penalty + (font.properties().weight.0 - 400.0).abs();

        if best.is_none_or(|(_, current)| score < current) {
            best = Some((handle, score));
        }
    }

    best.map(|(handle, _)| handle)
}

/// 把一份字体数据按用到的字符子集化，产出可直接内联的 data URL。
///
/// 导出快照走的是「序列化成 SVG 图片再栅格化」，图片文档拿不到系统字体表，必须把
/// 字体本身内联进去。而中文字体动辄几十兆（行楷 85 MB、宋体 64 MB），整体内联既慢
/// 又会被 WebKit 丢帧，所以只保留画布上真正出现的字形——通常几十 KB。
///
/// `index` 是字体集合（`.ttc` / `.otc`）里的字型下标，单字型文件传 0；顺带解决了
/// 「浏览器给集合的 `@font-face` 只会用第一个字型」的问题。
fn subset_to_data_url(
    data: &[u8],
    index: u32,
    font: &Font,
    text: &str,
) -> Result<Option<String>, String> {
    // allsorts 要的是原始字形下标，0 号 .notdef 必须带上
    let mut glyphs: Vec<u16> = vec![0];
    for ch in text.chars() {
        if let Ok(glyph) = u16::try_from(font.glyph_for_char(ch).unwrap_or(0)) {
            glyphs.push(glyph);
        }
    }
    glyphs.sort_unstable();
    glyphs.dedup();

    let scope = ReadScope::new(data);
    let font_data = FontData::read(&mut scope.ctxt()).map_err(|e| e.to_string())?;
    let provider = font_data
        .table_provider(index as usize)
        .map_err(|e| e.to_string())?;

    // CmapTarget::Unicode：浏览器拒绝只有 Mac Roman 码表的字体
    match subset_font(
        &provider,
        &glyphs,
        &SubsetProfile::Minimal,
        CmapTarget::Unicode,
    ) {
        Ok(subset) => Ok(Some(format!(
            "data:font/ttf;base64,{}",
            BASE64_STANDARD.encode(subset)
        ))),
        Err(error) => {
            println!("字体子集化失败: {error}");
            Ok(None)
        }
    }
}

/// 把系统字体家族按用到的字符子集化，返回可直接内联的 data URL。
///
/// 返回 `None` 表示不内联（家族不存在、字型取不到、子集化失败），由前端退回通用字体。
#[tauri::command]
pub fn inline_system_font(family: String, text: String) -> Result<Option<InlineFont>, String> {
    let source = SystemSource::new();
    let Ok(handle) = source.select_family_by_name(&family) else {
        return Ok(None);
    };
    let Some(face) = choose_face(&family, handle.fonts()) else {
        return Ok(None);
    };
    let Some((data, index)) = face_bytes(face) else {
        return Ok(None);
    };
    let Ok(font) = face.load() else {
        return Ok(None);
    };

    match subset_to_data_url(&data, index, &font, &text)? {
        Some(data_url) => Ok(Some(InlineFont { family, data_url })),
        None => Ok(None),
    }
}

/// 工作区里的字体目录：`<工作区>/Fonts`。
fn fonts_dir(workspace: &str) -> PathBuf {
    Path::new(workspace).join("Fonts")
}

/// 文件名白名单：只允许落在 `Fonts/` 下的普通文件名，挡掉路径穿越。
fn safe_file_name(file_name: &str) -> Option<String> {
    let name = Path::new(file_name).file_name()?.to_str()?.to_string();
    if name.is_empty() || name.starts_with('.') || name.contains(['/', '\\']) {
        return None;
    }
    Some(name)
}

fn now_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or_default()
}

/// 从字体字节里读族名。
///
/// 走 allsorts 而不是 font-kit：在线字体源（Google Fonts）给的是 woff2，font-kit 读不了；
/// 名字取「排版族名」（name id 16），没有再退回「族名」（id 1）。
fn family_of_bytes(data: &[u8]) -> Result<String, String> {
    let scope = ReadScope::new(data);
    let font_data =
        FontData::read(&mut scope.ctxt()).map_err(|e| format!("无法解析字体文件: {e}"))?;
    let provider = font_data.table_provider(0).map_err(|e| e.to_string())?;
    let name_table = provider
        .table_data(allsorts::tag::NAME)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "字体文件里没有 name 表".to_string())?;

    for name_id in [16u16, 1u16] {
        if let Ok(Some(name)) = fontcode_get_name(&name_table, name_id) {
            let family = name.to_string_lossy().trim().to_string();
            if !family.is_empty() {
                return Ok(family);
            }
        }
    }

    Err("字体文件里没有族名".to_string())
}

/// 网页字体（woff / woff2）对应的 MIME；其它格式返回 None（走子集化）。
fn webfont_mime(data: &[u8]) -> Option<&'static str> {
    match data.get(..4) {
        Some(b"wOF2") => Some("font/woff2"),
        Some(b"wOFF") => Some("font/woff"),
        _ => None,
    }
}

/// 把一个已有文件收进工作区字体目录，返回登记信息。
fn store_font_file(
    workspace: &str,
    source_path: &Path,
    file_name: Option<String>,
    origin: &str,
    source_kind: &str,
) -> Result<ImportedFont, String> {
    let data = std::fs::read(source_path).map_err(|e| format!("读取字体失败: {e}"))?;
    let family = family_of_bytes(&data)?;
    let dir = fonts_dir(workspace);
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建字体目录失败: {e}"))?;

    let fallback_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("font.ttf")
        .to_string();
    let name = safe_file_name(&file_name.unwrap_or(fallback_name))
        .ok_or_else(|| "字体文件名不合法".to_string())?;

    // 同名文件已存在时补一个时间戳后缀，不覆盖已有字体
    let mut target = dir.join(&name);
    if target.exists() {
        let stem = Path::new(&name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("font");
        let ext = Path::new(&name)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("ttf");
        target = dir.join(format!("{stem}-{}.{ext}", now_seconds()));
    }

    if Path::new(source_path) != target {
        std::fs::copy(source_path, &target).map_err(|e| format!("复制字体失败: {e}"))?;
    }

    let size = std::fs::metadata(&target)
        .map(|m| m.len())
        .unwrap_or_default();
    let stored_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&name)
        .to_string();

    Ok(ImportedFont {
        id: uuid::Uuid::new_v4().to_string(),
        file_name: stored_name,
        family,
        source: source_kind.to_string(),
        origin: origin.to_string(),
        size,
        added_at: now_seconds(),
    })
}

/// 导入用户选中的字体文件（自定义导入）。
#[tauri::command]
pub fn import_font_file(workspace: String, source_path: String) -> Result<ImportedFont, String> {
    let path = PathBuf::from(&source_path);
    if !path.is_file() {
        return Err("选择的字体文件不存在".to_string());
    }
    store_font_file(&workspace, &path, None, &source_path, "file")
}

/// 把前端下载好的字体字节收进工作区字体目录（在线字体源走这条）。
///
/// 网络请求放在前端：CORS 由字体源自己决定，Rust 侧因此不需要再引入一套 TLS 依赖。
#[tauri::command]
pub fn import_font_bytes(
    workspace: String,
    file_name: Option<String>,
    contents: Vec<u8>,
) -> Result<ImportedFont, String> {
    if contents.is_empty() {
        return Err("字体内容为空".to_string());
    }

    let dir = fonts_dir(&workspace);
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建字体目录失败: {e}"))?;
    let safe = safe_file_name(file_name.as_deref().unwrap_or("font.ttf"))
        .ok_or_else(|| "字体文件名不合法".to_string())?;
    let temp = dir.join(format!(".incoming-{}-{}", now_seconds(), safe));
    std::fs::write(&temp, &contents).map_err(|e| format!("写入字体失败: {e}"))?;

    let stored = store_font_file(&workspace, &temp, Some(safe), "在线字体", "online");
    let _ = std::fs::remove_file(&temp);
    stored
}

/// 从工作区字体目录里移除一个字体文件。
#[tauri::command]
pub fn remove_font_file(workspace: String, file_name: String) -> Result<(), String> {
    let name = safe_file_name(&file_name).ok_or_else(|| "字体文件名不合法".to_string())?;
    let path = fonts_dir(&workspace).join(name);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("删除字体失败: {e}"))?;
    }
    Ok(())
}

/// 把导入字体按用到的字符子集化，返回可直接内联的 data URL。
#[tauri::command]
pub fn inline_imported_font(
    workspace: String,
    file_name: String,
    text: String,
) -> Result<Option<InlineFont>, String> {
    let name = safe_file_name(&file_name).ok_or_else(|| "字体文件名不合法".to_string())?;
    let path = fonts_dir(&workspace).join(&name);
    let Ok(data) = std::fs::read(&path) else {
        return Ok(None);
    };
    let Ok(family) = family_of_bytes(&data) else {
        return Ok(None);
    };

    // 网页字体（Google Fonts 给的 woff2）：font-kit 解不开，而且本身体积很小，
    // 直接整份内联；ttf / otf / ttc 才走按字形子集化
    if let Some(mime) = webfont_mime(&data) {
        return Ok(Some(InlineFont {
            family,
            data_url: format!("data:{mime};base64,{}", BASE64_STANDARD.encode(&data)),
        }));
    }

    let Ok(font) = Font::from_path(&path, 0) else {
        return Ok(None);
    };

    match subset_to_data_url(&data, 0, &font, &text)? {
        Some(data_url) => Ok(Some(InlineFont { family, data_url })),
        None => Ok(None),
    }
}
