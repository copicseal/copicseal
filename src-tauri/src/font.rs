use std::borrow::Cow;

use allsorts::binary::read::{ReadBinary, ReadScope};
use allsorts::font_data::FontData;
use allsorts::subset::{subset as subset_font, CmapTarget, SubsetProfile};
use base64::prelude::{Engine as _, BASE64_STANDARD};
use font_kit::handle::Handle;
use font_kit::source::SystemSource;
use serde::Serialize;

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

/// 把某个字体家族按用到的字符做子集化，返回可直接内联的 data URL。
///
/// 导出快照走的是「序列化成 SVG 图片再栅格化」，图片文档拿不到系统字体表，必须把
/// 字体本身内联进去。而中文字体动辄几十兆（行楷 85 MB、宋体 64 MB），整体内联既慢
/// 又会让 WebKit 丢帧，所以这里只保留画布上真正出现的字形——通常几十 KB。
///
/// 集合字体顺带解决了另一个问题：浏览器给集合的 `@font-face` 只会用第一个字型，
/// 而子集化是按我们挑中的那个字型（下标）导出的。
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

    // 收集用到的字形：allsorts 要的是原始字形下标，0 号 .notdef 必须带上
    let mut glyphs: Vec<u16> = vec![0];
    for ch in text.chars() {
        if let Ok(glyph) = u16::try_from(font.glyph_for_char(ch).unwrap_or(0)) {
            glyphs.push(glyph);
        }
    }
    glyphs.sort_unstable();
    glyphs.dedup();

    let scope = ReadScope::new(&data);
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
        Ok(subset) => Ok(Some(InlineFont {
            family,
            data_url: format!("data:font/ttf;base64,{}", BASE64_STANDARD.encode(subset)),
        })),
        Err(error) => {
            println!("字体子集化失败（{family}）: {error}");
            Ok(None)
        }
    }
}
