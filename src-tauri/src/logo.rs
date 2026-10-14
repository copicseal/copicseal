use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// 允许的 Logo 扩展名（与前端「选择 Logo 文件」对话框的筛选一致）。
const ALLOWED_EXTENSIONS: &[&str] = &["svg", "png", "jpg", "jpeg", "webp"];
/// SVG 是文本：正常几 KB 到几十 KB，512 KB 已经很宽松。
const MAX_SVG_BYTES: u64 = 512 * 1024;
/// 位图上限：Logo 是展示用小图，4 MB 足够，避免用户误选几十 MB 的原片。
const MAX_RASTER_BYTES: u64 = 4 * 1024 * 1024;

/// 导入一条自定义 Logo 之后的落盘结果。
///
/// 配置条目（id / 名称 / 匹配关键字）由前端补全，这里只回文件名与体积。
#[derive(Debug, Serialize, Clone)]
pub struct ImportedLogo {
    pub file_name: String,
    pub size: u64,
}

/// 工作区里的自定义 Logo 目录：`<工作区>/Logos`（与 `Fonts/` 同级）。
fn logos_dir(workspace: &str) -> PathBuf {
    Path::new(workspace).join("Logos")
}

/// 文件名白名单：只允许普通文件名，挡掉路径穿越（与 `font.rs` 同一口径）。
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

fn extension_of(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
}

/// 校验待导入的 Logo 文件，返回小写扩展名。
///
/// 只信内容不信扩展名：位图必须能被 `image` 认出来，SVG 必须真的含 `<svg>`，
/// 这样「把 txt 改名成 png」会在导入阶段就被挡住，而不是等到画布上显示空白。
fn validate_logo(path: &Path) -> Result<String, String> {
    let ext = extension_of(path).ok_or_else(|| "Logo 文件缺少扩展名".to_string())?;
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!(
            "不支持的 Logo 格式 .{ext}（支持 svg / png / jpg / jpeg / webp）"
        ));
    }

    let size = fs::metadata(path)
        .map_err(|e| format!("读取 Logo 文件失败: {e}"))?
        .len();
    if size == 0 {
        return Err("Logo 文件是空的".to_string());
    }

    let limit = if ext == "svg" {
        MAX_SVG_BYTES
    } else {
        MAX_RASTER_BYTES
    };
    if size > limit {
        return Err(format!(
            "Logo 文件过大（约 {} KB），上限 {} KB",
            size / 1024,
            limit / 1024
        ));
    }

    let data = fs::read(path).map_err(|e| format!("读取 Logo 文件失败: {e}"))?;
    if ext == "svg" {
        if !String::from_utf8_lossy(&data).contains("<svg") {
            return Err("这不是有效的 SVG 文件（缺少 <svg>）".to_string());
        }
    } else if image::guess_format(&data).is_err() {
        return Err("这不是有效的图片文件".to_string());
    }

    Ok(ext)
}

/// 把用户选中的 Logo 文件收进工作区 `Logos/`。
///
/// 同名文件已存在时补一个时间戳后缀，不覆盖已有 Logo：
/// 多条自定义条目指向同一张图是允许的，覆盖会让旧条目的图悄悄变样。
#[tauri::command]
pub fn import_logo_file(workspace: String, source_path: String) -> Result<ImportedLogo, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_file() {
        return Err("选择的 Logo 文件不存在".to_string());
    }

    let ext = validate_logo(&source)?;
    let dir = logos_dir(&workspace);
    fs::create_dir_all(&dir).map_err(|e| format!("创建 Logo 目录失败: {e}"))?;

    let original = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("logo");
    let name = safe_file_name(original).ok_or_else(|| "Logo 文件名不合法".to_string())?;

    let mut target = dir.join(&name);
    if target.exists() {
        let stem = Path::new(&name)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("logo");
        target = dir.join(format!("{stem}-{}.{ext}", now_seconds()));
    }

    fs::copy(&source, &target).map_err(|e| format!("复制 Logo 文件失败: {e}"))?;

    let file_name = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(&name)
        .to_string();
    let size = fs::metadata(&target)
        .map(|meta| meta.len())
        .unwrap_or_default();

    Ok(ImportedLogo { file_name, size })
}

/// 读取一个 SVG Logo 的文本内容（前端内联渲染用，这样 `currentColor` 能跟随文字颜色）。
///
/// 走 Rust 而不是前端 `fetch(assetUrl)`：不依赖资源协议的 CORS 行为，
/// 也沿用「工作区文件由 Rust 读」的既有口径（字体内联同样如此）。
#[tauri::command]
pub fn read_logo_svg(workspace: String, file_name: String) -> Result<String, String> {
    let name = safe_file_name(&file_name).ok_or_else(|| "Logo 文件名不合法".to_string())?;
    if extension_of(Path::new(&name)).as_deref() != Some("svg") {
        return Err("只能读取 SVG 格式的 Logo".to_string());
    }

    let path = logos_dir(&workspace).join(&name);
    if !path.is_file() {
        return Err("Logo 文件不存在".to_string());
    }

    let size = fs::metadata(&path)
        .map_err(|e| format!("读取 Logo 文件失败: {e}"))?
        .len();
    if size > MAX_SVG_BYTES {
        return Err(format!(
            "Logo 文件过大（约 {} KB），上限 {} KB",
            size / 1024,
            MAX_SVG_BYTES / 1024
        ));
    }

    fs::read_to_string(&path).map_err(|e| format!("读取 Logo 文件失败: {e}"))
}

/// 从工作区 Logo 目录里移除一个文件（删条目时前端一起调用）。
#[tauri::command]
pub fn remove_logo_file(workspace: String, file_name: String) -> Result<(), String> {
    let name = safe_file_name(&file_name).ok_or_else(|| "Logo 文件名不合法".to_string())?;
    let path = logos_dir(&workspace).join(name);

    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("删除 Logo 文件失败: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 在 target 下开一个干净的探测目录（不放 %TEMP%：某些受限环境会拒绝在那儿建目录）。
    fn probe_dir(tag: &str) -> PathBuf {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!("logo-probe-{tag}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn safe_file_name_keeps_only_the_last_segment() {
        // 语义是「净化」而不是「拒绝」：目录部分被丢掉，结果永远落在 Logos/ 里逃不出去
        assert_eq!(safe_file_name("../evil.svg").unwrap(), "evil.svg");
        assert_eq!(safe_file_name("a/b.svg").unwrap(), "b.svg");
        // Windows 路径两种平台语义不同，不能写死一个期望：
        // Windows 上反斜杠是分隔符，目录部分被剥掉；Unix 上它是普通字符，
        // 函数按安全策略（名字里不允许出现路径分隔符）直接拒绝。
        #[cfg(windows)]
        assert_eq!(safe_file_name("C:\\tmp\\logo.svg").unwrap(), "logo.svg");
        #[cfg(not(windows))]
        assert!(safe_file_name("C:\\tmp\\logo.svg").is_none());
        // 隐藏文件与空名直接拒绝（`.incoming-*` 这类临时文件不该被当成 Logo）
        assert!(safe_file_name(".hidden.svg").is_none());
        assert!(safe_file_name("").is_none());
        assert_eq!(safe_file_name("mylogo.svg").unwrap(), "mylogo.svg");
    }

    #[test]
    fn rejects_unsupported_extension() {
        let dir = probe_dir("ext");
        let file = dir.join("logo.txt");
        fs::write(&file, b"nope").unwrap();

        let error = validate_logo(&file).unwrap_err();
        let _ = fs::remove_dir_all(&dir);

        assert!(error.contains("不支持的 Logo 格式"), "实际: {error}");
    }

    #[test]
    fn rejects_svg_without_svg_root() {
        let dir = probe_dir("fakesvg");
        let file = dir.join("logo.svg");
        fs::write(&file, b"<html>not an svg</html>").unwrap();

        let error = validate_logo(&file).unwrap_err();
        let _ = fs::remove_dir_all(&dir);

        assert!(error.contains("缺少 <svg>"), "实际: {error}");
    }

    #[test]
    fn rejects_renamed_binary() {
        let dir = probe_dir("fakepng");
        let file = dir.join("logo.png");
        fs::write(&file, b"definitely not a png").unwrap();

        let error = validate_logo(&file).unwrap_err();
        let _ = fs::remove_dir_all(&dir);

        assert!(error.contains("不是有效的图片文件"), "实际: {error}");
    }

    #[test]
    fn accepts_a_real_svg() {
        let dir = probe_dir("ok");
        let file = dir.join("logo.svg");
        fs::write(
            &file,
            br#"<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>"#,
        )
        .unwrap();

        let result = validate_logo(&file);
        let _ = fs::remove_dir_all(&dir);

        assert_eq!(result.unwrap(), "svg");
    }

    #[test]
    fn import_copies_into_the_workspace_and_keeps_names_unique() {
        let dir = probe_dir("import");
        let workspace = dir.join("workspace");
        let source = dir.join("mylogo.svg");
        fs::write(
            &source,
            br#"<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>"#,
        )
        .unwrap();

        let first = import_logo_file(
            workspace.to_string_lossy().to_string(),
            source.to_string_lossy().to_string(),
        )
        .unwrap();
        let second = import_logo_file(
            workspace.to_string_lossy().to_string(),
            source.to_string_lossy().to_string(),
        )
        .unwrap();

        let stored = fs::read_dir(workspace.join("Logos")).unwrap().count();
        let first_exists = workspace.join("Logos").join(&first.file_name).is_file();
        let second_exists = workspace.join("Logos").join(&second.file_name).is_file();
        let _ = fs::remove_dir_all(&dir);

        assert_eq!(first.file_name, "mylogo.svg");
        assert_ne!(second.file_name, first.file_name, "同名应补时间戳后缀");
        assert_eq!(stored, 2);
        assert!(first_exists && second_exists);
    }

    #[test]
    fn remove_deletes_only_the_named_file() {
        let dir = probe_dir("remove");
        let workspace = dir.join("workspace");
        let logo_dir = workspace.join("Logos");
        fs::create_dir_all(&logo_dir).unwrap();
        fs::write(logo_dir.join("a.svg"), b"<svg/>").unwrap();

        remove_logo_file(workspace.to_string_lossy().to_string(), "a.svg".to_string()).unwrap();
        let gone = !logo_dir.join("a.svg").exists();

        // 路径穿越不会逃出 Logos/：`../escape.svg` 会被归成 `Logos/escape.svg`，
        // 工作区根目录下的同名文件必须原封不动
        let outside = dir.join("escape.svg");
        fs::write(&outside, b"<svg/>").unwrap();
        let _ = remove_logo_file(
            workspace.to_string_lossy().to_string(),
            "../escape.svg".to_string(),
        );
        let outside_kept = outside.is_file();
        let _ = fs::remove_dir_all(&dir);

        assert!(gone);
        assert!(outside_kept, "工作区根目录的文件不应被删除");
    }
}
