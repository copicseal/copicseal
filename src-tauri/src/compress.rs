//! 图片压缩：解码 → 方向纠正 → 重采样 → 重编码 → 元数据 → 安全写盘。
//!
//! 与「边框水印」「拼图」完全独立：这里只读源文件，只往输出目录写**新文件**，
//! 任何情况下都不会把结果写到某个源路径上（见 `resolve_target`）。
//!
//! 设计约束（对应需求里的硬性要求）：
//! - **真实编码**：报告的体积/尺寸都来自 `image` 的实际编码结果，不做估算；
//! - **有界**：并发 `min(3, 核心数/2)`、单张 ≤ 120 MP / ≤ 256 MB、目标体积模式最多
//!   8 次质量试探 + 4 轮缩放，必然终止；
//! - **失败隔离**：单张失败只记 `failed`，整批继续；
//! - **可取消**：每张开始前检查 `AtomicBool`，取消后不再产出任何新文件；
//! - **不静默降级**：不支持的格式（HEIC/AVIF/动图/CMYK）、16 位降 8 位等都显式报错或告警。
//!
//! 格式能力（`image` 0.25 以 `jpeg/png/webp` 特性编译）：
//! - 可解码：JPEG / PNG / WebP（动图拒绝，避免丢帧）
//! - 可编码：JPEG（质量可控）、PNG（无损优化）
//! - WebP 输出：只有无损编码（质量参数无效），因此不作为输出格式提供

use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use fast_image_resize as fr;
use fr::images::Image as FirImage;
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType as PngFilterType, PngEncoder};
use image::{DynamicImage, ExtendedColorType, ImageEncoder, ImageFormat, Rgb, RgbImage, RgbaImage};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use zune_core::bytestream::ZCursor;
use zune_core::colorspace::ColorSpace;
use zune_core::options::DecoderOptions;
use zune_jpeg::JpegDecoder as ZuneJpegDecoder;

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp"];
const MAX_INPUT_BYTES: u64 = 256 * 1024 * 1024;
/// 单张像素上限：24 MP 的单反图约 6000×4000，120 MP 足够覆盖中画幅，再大就拒绝以免内存爆掉
const MAX_INPUT_PIXELS: u64 = 120_000_000;
const MIN_TARGET_BYTES: u64 = 10 * 1024;
const MIN_SCALE_EDGE: u32 = 320;
const MAX_SCALE_ROUNDS: u32 = 4;
const MAX_QUALITY_PROBES: u32 = 6;
/// 目标体积搜索的最低质量（再低画质已经不可用，直接转去缩尺寸）
const MIN_QUALITY: u8 = 5;
/// 输出大于原图时自动降质量的下限：再低画质不可接受，直接保留原图
const AUTO_MIN_QUALITY: u8 = 40;
const MAX_CONFLICT_INDEX: u32 = 999;
const PREVIEW_JPEG_QUALITY: u8 = 82;
const PREVIEW_DIR_NAME: &str = "Compress";
const MAX_SCAN_DEPTH: usize = 12;
const PROGRESS_EVENT: &str = "compress://progress";

// ---------------------------------------------------------------------------
// 前后端数据结构
// ---------------------------------------------------------------------------

/// 相机文件探测结果（只读文件头，不解整图）。
#[derive(Debug, Clone, Serialize)]
pub struct ImageProbe {
    pub path: String,
    pub name: String,
    pub ext: String,
    /// 文件体积（字节）
    pub size: u64,
    pub width: u32,
    pub height: u32,
    /// `jpeg` / `png` / `webp`；识别不出时为空串
    pub format: String,
    /// 动图 WebP：本工具不处理（避免丢帧）
    pub animated: bool,
    /// 能处理、但需要提示用户的情况（如非常规色域）
    pub warning: Option<String>,
    /// 不能处理的原因；为空表示可压缩
    pub error: Option<String>,
}

/// 递归列图的结果：支持项 + 被跳过的文件及原因。
#[derive(Debug, Clone, Serialize)]
pub struct ImageScanResult {
    pub paths: Vec<String>,
    pub skipped: Vec<SkippedFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SkippedFile {
    pub path: String,
    pub reason: String,
}

/// 待压缩的一张图。`id` 由前端生成，结果按 id 回填。
#[derive(Debug, Clone, Deserialize)]
pub struct CompressItem {
    pub id: String,
    pub path: String,
}

/// 压缩参数。字段尽量扁平，前端与 Rust 逐字对应。
#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct CompressOptions {
    /// `custom`：统一输出到 `output_dir`；`source`：输出到各自的源目录
    pub output_mode: String,
    /// `keep` / `jpeg` / `png`（WebP 输出不提供：无损编码质量无效）
    pub output_format: String,
    /// 1..=100，仅 JPEG 输出生效
    pub quality: u8,
    /// `original` / `max_edge` / `box`
    pub resize_mode: String,
    /// `max_edge` 模式的最长边（像素）
    pub max_edge: u32,
    /// `box` 模式的宽高（等比装入，不放大）
    pub box_width: u32,
    pub box_height: u32,
    /// 目标体积模式：Some 时按体积反推质量/尺寸
    pub target_bytes: Option<u64>,
    /// `keep` / `essential` / `strip`
    pub metadata: String,
    /// 透明图转 JPEG 时的背景色（`#rrggbb`）
    pub background: String,
    /// 输出文件名后缀
    pub suffix: String,
    /// 重名策略：`rename`（默认，自动加序号）/ `skip` / `overwrite`
    pub on_conflict: String,
}

impl Default for CompressOptions {
    fn default() -> Self {
        Self {
            output_mode: "custom".to_string(),
            output_format: "keep".to_string(),
            quality: 80,
            resize_mode: "original".to_string(),
            max_edge: 0,
            box_width: 0,
            box_height: 0,
            target_bytes: None,
            metadata: "keep".to_string(),
            background: "#ffffff".to_string(),
            suffix: "-compressed".to_string(),
            on_conflict: "rename".to_string(),
        }
    }
}

/// 单张结果。`status`：`ok` / `failed` / `skipped` / `cancelled`。
#[derive(Debug, Clone, Serialize)]
pub struct CompressResult {
    pub id: String,
    pub name: String,
    pub source_path: String,
    pub status: String,
    pub output_path: Option<String>,
    pub output_name: Option<String>,
    pub original_bytes: u64,
    pub output_bytes: u64,
    pub original_width: u32,
    pub original_height: u32,
    pub output_width: u32,
    pub output_height: u32,
    /// `jpeg` / `png` / 空
    pub output_format: String,
    /// 实际使用的质量（PNG 输出或未重编码时为 None）
    pub quality_used: Option<u8>,
    /// 编码次数（目标体积模式用于说明"试了几次"）
    pub attempts: u32,
    /// 目标体积模式是否达标
    pub reached_target: bool,
    /// 这一张实际耗时（毫秒），界面上直接显示，方便判断慢在哪
    pub elapsed_ms: u64,
    pub warnings: Vec<String>,
    pub message: Option<String>,
}

/// 整批结果。
#[derive(Debug, Clone, Serialize)]
pub struct CompressOutcome {
    pub results: Vec<CompressResult>,
    pub cancelled: bool,
    pub total_original: u64,
    pub total_output: u64,
    pub succeeded: usize,
    pub failed: usize,
    pub skipped: usize,
    pub cancelled_count: usize,
}

/// 进度事件（`compress://progress`）。
#[derive(Debug, Clone, Serialize)]
pub struct CompressProgress {
    pub done: usize,
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub current_id: Option<String>,
    /// `decoding` / `resizing` / `encoding` / `measuring` / `writing`
    pub current_stage: String,
    pub cancelled: bool,
}

/// 批量压缩的取消开关。
#[derive(Default)]
pub struct CompressState {
    pub cancel: Arc<AtomicBool>,
}

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InputFormat {
    Jpeg,
    Png,
    Webp,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OutFormat {
    Jpeg,
    Png,
}

impl OutFormat {
    fn label(self) -> &'static str {
        match self {
            OutFormat::Jpeg => "jpeg",
            OutFormat::Png => "png",
        }
    }

    fn extension(self) -> &'static str {
        match self {
            OutFormat::Jpeg => "jpg",
            OutFormat::Png => "png",
        }
    }
}

fn lower_ext(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default()
}

fn file_name_of(path: &Path) -> String {
    path.file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn stem_of(path: &Path) -> String {
    path.file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "image".to_string())
}

fn is_supported_extension(ext: &str) -> bool {
    SUPPORTED_EXTENSIONS.contains(&ext)
}

/// 按文件内容（魔数）判断格式；扩展名只用来提前给出更友好的 HEIC/AVIF 提示。
fn detect_format(bytes: &[u8], path: &Path) -> Result<InputFormat, String> {
    match lower_ext(path).as_str() {
        "heic" | "heif" | "hif" => {
            return Err(
                "暂不支持 HEIC/HEIF（可先在边框水印页导入，或其它工具转成 JPEG）".to_string(),
            );
        }
        "avif" => return Err("暂不支持 AVIF".to_string()),
        _ => {}
    }

    let format = image::guess_format(bytes)
        .map_err(|_| "无法识别图片格式（文件可能已损坏或不是图片）".to_string())?;

    match format {
        ImageFormat::Jpeg => Ok(InputFormat::Jpeg),
        ImageFormat::Png => Ok(InputFormat::Png),
        ImageFormat::WebP => Ok(InputFormat::Webp),
        other => Err(format!(
            "暂不支持 {other:?} 格式（仅支持 JPEG / PNG / WebP）"
        )),
    }
}

/// 读文件头几百字节用于嗅探（魔数、动图标记），不整图读。
fn read_head(path: &Path, limit: usize) -> Result<Vec<u8>, String> {
    use std::io::Read;

    let mut file = fs::File::open(path).map_err(|e| format!("读取文件失败: {e}"))?;
    let mut head = vec![0u8; limit];
    let read = file
        .read(&mut head)
        .map_err(|e| format!("读取文件失败: {e}"))?;
    head.truncate(read);
    Ok(head)
}

fn unix_millis(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as u64)
        .unwrap_or_default()
}

fn now_millis() -> u64 {
    unix_millis(SystemTime::now())
}

// ---------------------------------------------------------------------------
// 探针 / 列图 / 预览
// ---------------------------------------------------------------------------

fn probe_one(path: &Path) -> ImageProbe {
    let mut probe = ImageProbe {
        path: path.to_string_lossy().to_string(),
        name: file_name_of(path),
        ext: lower_ext(path),
        size: 0,
        width: 0,
        height: 0,
        format: String::new(),
        animated: false,
        warning: None,
        error: None,
    };

    let metadata = match fs::metadata(path) {
        Ok(value) if value.is_file() => value,
        Ok(_) => {
            probe.error = Some("不是一个文件".to_string());
            return probe;
        }
        Err(error) => {
            probe.error = Some(format!("读取文件失败: {error}"));
            return probe;
        }
    };

    probe.size = metadata.len();

    if !is_supported_extension(&probe.ext) {
        probe.error = Some(format!(
            "不支持的格式 .{}（仅支持 JPEG / PNG / WebP）",
            if probe.ext.is_empty() {
                "(无扩展名)".to_string()
            } else {
                probe.ext.clone()
            }
        ));
        return probe;
    }

    if probe.size == 0 {
        probe.error = Some("文件是空的".to_string());
        return probe;
    }

    if probe.size > MAX_INPUT_BYTES {
        probe.error = Some(format!(
            "文件超过 {} MB，已跳过",
            MAX_INPUT_BYTES / 1024 / 1024
        ));
        return probe;
    }

    let head = match read_head(path, 512 * 1024) {
        Ok(value) => value,
        Err(error) => {
            probe.error = Some(error);
            return probe;
        }
    };

    match detect_format(&head, path) {
        Ok(format) => {
            probe.format = match format {
                InputFormat::Jpeg => "jpeg",
                InputFormat::Png => "png",
                InputFormat::Webp => "webp",
            }
            .to_string();
        }
        Err(error) => {
            probe.error = Some(error);
            return probe;
        }
    }

    // 尺寸与像素上限：只读文件头（`into_decoder` 不解整图）
    let reader = match image::ImageReader::open(path)
        .and_then(|reader| reader.with_guessed_format().map_err(std::io::Error::other))
    {
        Ok(value) => value,
        Err(error) => {
            probe.error = Some(format!("打开图片失败: {error}"));
            return probe;
        }
    };

    let decoder = match reader.into_decoder() {
        Ok(value) => value,
        Err(error) => {
            probe.error = Some(format!("图片头解析失败: {error}"));
            return probe;
        }
    };

    let dimensions = image::ImageDecoder::dimensions(&decoder);
    probe.width = dimensions.0;
    probe.height = dimensions.1;

    if probe.width == 0 || probe.height == 0 {
        probe.error = Some("图片尺寸为 0".to_string());
        return probe;
    }

    if u64::from(probe.width) * u64::from(probe.height) > MAX_INPUT_PIXELS {
        probe.error = Some(format!(
            "像素数超过 {} MP，已跳过",
            MAX_INPUT_PIXELS / 1_000_000
        ));
        return probe;
    }

    if probe.format == "webp" && looks_animated_webp(&head) {
        probe.animated = true;
        probe.error = Some("暂不支持动图 WebP（压缩会丢帧）".to_string());
        return probe;
    }

    if probe.format == "jpeg" {
        match jpeg_component_count(&head) {
            Some(4) => {
                probe.error = Some("暂不支持 CMYK 色彩空间的 JPEG（避免颜色错乱）".to_string());
                return probe;
            }
            Some(count) if count != 1 && count != 3 => {
                probe.error = Some(format!("不支持的 JPEG 色彩通道数: {count}"));
                return probe;
            }
            _ => {}
        }
    }

    probe
}

/// 是否动图 WebP：遍历 RIFF 块，出现 `ANIM`/`ANMF` 即视为动图。
fn looks_animated_webp(bytes: &[u8]) -> bool {
    if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
        return false;
    }

    let mut pos = 12;
    while pos + 8 <= bytes.len() {
        let chunk = &bytes[pos..pos + 4];
        if chunk == b"ANIM" || chunk == b"ANMF" {
            return true;
        }

        let size = u32::from_le_bytes([
            bytes[pos + 4],
            bytes[pos + 5],
            bytes[pos + 6],
            bytes[pos + 7],
        ]) as usize;
        pos += 8 + size + (size & 1);
    }

    false
}

/// JPEG SOF 段里的通道数（1 = 灰度，3 = RGB/YCbCr，4 = CMYK）。
fn jpeg_component_count(bytes: &[u8]) -> Option<u8> {
    if bytes.len() < 4 || bytes[0] != 0xFF || bytes[1] != 0xD8 {
        return None;
    }

    let mut pos = 2;
    while pos + 4 <= bytes.len() {
        if bytes[pos] != 0xFF {
            return None;
        }

        let marker = bytes[pos + 1];
        // 无长度的独立标记
        if (0xD0..=0xD7).contains(&marker) || marker == 0x01 || marker == 0xFF {
            pos += 2;
            continue;
        }
        if marker == 0xDA || marker == 0xD9 {
            return None;
        }

        let length = ((bytes[pos + 2] as usize) << 8) | bytes[pos + 3] as usize;
        // SOF0..SOF3 / SOF5..SOF7 / SOF9..SOF11 / SOF13..SOF15
        let is_sof = matches!(marker, 0xC0..=0xC3 | 0xC5..=0xC7 | 0xC9..=0xCB | 0xCD..=0xCF);
        if is_sof {
            let components_at = pos + 2 + 7;
            return bytes.get(components_at).copied();
        }

        if length < 2 {
            return None;
        }
        pos += 2 + length;
    }

    None
}

fn list_images_recursive(
    dir: &Path,
    recursive: bool,
    depth: usize,
    paths: &mut Vec<String>,
    skipped: &mut Vec<SkippedFile>,
) {
    if depth > MAX_SCAN_DEPTH {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(value) => value,
        Err(error) => {
            skipped.push(SkippedFile {
                path: dir.to_string_lossy().to_string(),
                reason: format!("读取目录失败: {error}"),
            });
            return;
        }
    };

    let mut children: Vec<PathBuf> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        // 符号链接一律跳过：既避免环，也避免顺着链接跑到用户没选的目录
        if entry
            .file_type()
            .map(|kind| kind.is_symlink())
            .unwrap_or(false)
        {
            continue;
        }

        if path.is_dir() {
            if recursive {
                children.push(path);
            }
            continue;
        }

        if !path.is_file() {
            continue;
        }

        let ext = lower_ext(&path);
        if is_supported_extension(&ext) {
            paths.push(path.to_string_lossy().to_string());
        } else if skipped.len() < 200 {
            skipped.push(SkippedFile {
                path: path.to_string_lossy().to_string(),
                reason: "不支持的格式（仅支持 JPEG / PNG / WebP）".to_string(),
            });
        }
    }

    children.sort();
    for child in children {
        list_images_recursive(&child, recursive, depth + 1, paths, skipped);
    }
}

fn preview_cache_path(cache_dir: &Path, source: &Path, max_edge: u32) -> Result<PathBuf, String> {
    let metadata = fs::metadata(source).map_err(|e| format!("读取文件失败: {e}"))?;
    let modified = metadata.modified().map(unix_millis).unwrap_or_default();

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source.to_string_lossy().hash(&mut hasher);
    modified.hash(&mut hasher);
    metadata.len().hash(&mut hasher);
    max_edge.hash(&mut hasher);

    Ok(cache_dir
        .join(PREVIEW_DIR_NAME)
        .join(format!("preview-{:016x}.jpg", hasher.finish())))
}

/// 生成一版预览图（真实解码 + 真实缩放），用于列表缩略图与前后对比。
///
/// 缓存键包含源路径、修改时间、体积与最长边：源文件变了或参数变了就是新缓存，
/// 不会把上一轮的旧预览用在新结果上。
fn create_preview(source: &Path, cache_dir: &Path, max_edge: u32) -> Result<String, String> {
    let edge = max_edge.clamp(64, 4096);
    let target = preview_cache_path(cache_dir, source, edge)?;

    if target.exists() {
        return Ok(target.to_string_lossy().to_string());
    }

    let bytes = fs::read(source).map_err(|e| format!("读取文件失败: {e}"))?;
    let format = detect_format(&bytes, source)?;

    // JPEG 预览走 zune 快速解码（这一步在切换任务时很频繁，快一点体感明显）
    let pixels = if format == InputFormat::Jpeg {
        apply_orientation_rgb(decode_jpeg_preview(&bytes)?, orientation_of(&bytes, format))
    } else {
        let decoded = image::load_from_memory_with_format(&bytes, image_format_of(format))
            .map_err(|e| format!("解码失败: {e}"))?;
        flatten_to_rgb(decoded, Rgb([255, 255, 255]))
    };

    let (width, height) = fit_into(pixels.width(), pixels.height(), edge, edge);
    let resized = resize_rgb(pixels, width, height)?;
    let encoded = encode_jpeg(&resized, PREVIEW_JPEG_QUALITY)?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建预览目录失败: {e}"))?;
    }
    write_atomically(&target, &encoded)?;

    Ok(target.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// JPEG 段处理（EXIF / ICC）
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
struct JpegSegments {
    /// APP1 里的 EXIF 段（含 `FF E1` + 段长 + `Exif\0\0`）
    exif: Option<Vec<u8>>,
    /// APP2 里的 ICC_PROFILE 段（可能有多段，按出现顺序保留）
    icc: Vec<Vec<u8>>,
}

/// 收集源 JPEG 的 EXIF / ICC 段，供「保留元数据」时注入到压缩结果里。
fn collect_jpeg_segments(bytes: &[u8]) -> JpegSegments {
    let mut segments = JpegSegments::default();

    if bytes.len() < 4 || bytes[0] != 0xFF || bytes[1] != 0xD8 {
        return segments;
    }

    let mut pos = 2;
    while pos + 4 <= bytes.len() {
        if bytes[pos] != 0xFF {
            break;
        }

        let marker = bytes[pos + 1];
        if marker == 0xDA || marker == 0xD9 {
            break;
        }
        if (0xD0..=0xD7).contains(&marker) || marker == 0x01 || marker == 0xFF {
            pos += 2;
            continue;
        }

        let length = ((bytes[pos + 2] as usize) << 8) | bytes[pos + 3] as usize;
        if length < 2 || pos + 2 + length > bytes.len() {
            break;
        }

        let payload_start = pos + 4;
        let payload = &bytes[payload_start..pos + 2 + length];

        if marker == 0xE1 && payload.starts_with(b"Exif\0\0") {
            segments
                .exif
                .get_or_insert_with(|| bytes[pos..pos + 2 + length].to_vec());
        } else if marker == 0xE2 && payload.starts_with(b"ICC_PROFILE\0") {
            segments.icc.push(bytes[pos..pos + 2 + length].to_vec());
        }

        pos += 2 + length;
    }

    segments
}

/// 从 EXIF 段里读朝向（1..=8），读不到就是 1。
fn orientation_from_exif(segment: &[u8]) -> Option<u32> {
    let start = segment.windows(6).position(|w| w == b"Exif\0\0")? + 6;
    let tiff = segment.get(start..)?;
    let parsed = exif::Reader::new().read_raw(tiff.to_vec()).ok()?;
    let field = parsed.get_field(exif::Tag::Orientation, exif::In::PRIMARY)?;

    field.value.get_uint(0)
}

/// 源图朝向：JPEG 从 EXIF 段读，其它格式按正立处理（`image` 不解 PNG/WebP 的 EXIF）。
fn orientation_of(bytes: &[u8], format: InputFormat) -> u32 {
    if format != InputFormat::Jpeg {
        return 1;
    }

    collect_jpeg_segments(bytes)
        .exif
        .as_deref()
        .and_then(orientation_from_exif)
        .filter(|value| (1..=8).contains(value))
        .unwrap_or(1)
}

/// 手搓一段最小 EXIF（只有宽高与朝向），供「仅保留必要元数据」使用。
///
/// 段结构：`FF E1` + 段长 + `Exif\0\0` + TIFF；进入 `insert_jpeg_exif` 后会由
/// `align_exif_segment` 按输出像素改写尺寸、把朝向归一为 1，并补上 `Software` 标签。
fn minimal_exif_segment(width: u32, height: u32) -> Vec<u8> {
    build_exif_segment(1, width, height)
}

fn build_exif_segment(orientation: u16, width: u32, height: u32) -> Vec<u8> {
    let entries: [(u16, u16, u32, [u8; 4]); 3] = [
        (0x0100, 4, 1, width.to_le_bytes()),  // ImageWidth (LONG)
        (0x0101, 4, 1, height.to_le_bytes()), // ImageLength (LONG)
        (0x0112, 3, 1, {
            // Orientation (SHORT)
            let mut value = [0u8; 4];
            value[..2].copy_from_slice(&orientation.to_le_bytes());
            value
        }),
    ];

    let mut tiff: Vec<u8> = Vec::new();
    tiff.extend_from_slice(b"II"); // 小端
    tiff.extend_from_slice(&42u16.to_le_bytes());
    tiff.extend_from_slice(&8u32.to_le_bytes()); // IFD0 偏移
    tiff.extend_from_slice(&(entries.len() as u16).to_le_bytes());

    for (tag, field_type, count, value) in entries {
        tiff.extend_from_slice(&tag.to_le_bytes());
        tiff.extend_from_slice(&field_type.to_le_bytes());
        tiff.extend_from_slice(&count.to_le_bytes());
        tiff.extend_from_slice(&value);
    }
    tiff.extend_from_slice(&0u32.to_le_bytes()); // 没有下一个 IFD

    let payload_len = 6 + tiff.len();
    let mut segment = Vec::with_capacity(payload_len + 2);
    segment.extend_from_slice(&[0xFF, 0xE1]);
    // 段长包含自身 2 字节
    segment.extend_from_slice(&((payload_len + 2) as u16).to_be_bytes());
    segment.extend_from_slice(b"Exif\0\0");
    segment.extend_from_slice(&tiff);
    segment
}

/// 把若干 JPEG 段插到 SOI 之后。
fn insert_after_soi(jpeg: Vec<u8>, segments: &[Vec<u8>]) -> Vec<u8> {
    if segments.is_empty() {
        return jpeg;
    }
    if jpeg.len() < 2 || jpeg[0] != 0xFF || jpeg[1] != 0xD8 {
        return jpeg;
    }

    let mut result = Vec::with_capacity(jpeg.len() + segments.iter().map(Vec::len).sum::<usize>());
    result.extend_from_slice(&jpeg[..2]);
    for segment in segments {
        result.extend_from_slice(segment);
    }
    result.extend_from_slice(&jpeg[2..]);
    result
}

/// 按元数据策略把 EXIF / ICC 写回压缩后的 JPEG。
///
/// - `keep`：沿用源 EXIF（尺寸/朝向由 `insert_jpeg_exif` 对齐）+ 源 ICC
/// - `essential`：只写宽高/朝向/软件标记 + 源 ICC（不含相机、GPS 等隐私信息）
/// - `strip`：都不写
fn inject_metadata(
    encoded: Vec<u8>,
    source: &JpegSegments,
    policy: &str,
    width: u32,
    height: u32,
) -> Result<Vec<u8>, String> {
    let with_exif = match policy {
        "strip" => encoded,
        "essential" => {
            let segment = minimal_exif_segment(width, height);
            crate::exif::insert_jpeg_exif(encoded, segment, true)?
        }
        _ => match &source.exif {
            Some(segment) => crate::exif::insert_jpeg_exif(encoded, segment.clone(), true)?,
            None => encoded,
        },
    };

    if policy == "strip" || source.icc.is_empty() {
        return Ok(with_exif);
    }

    Ok(insert_after_soi(with_exif, &source.icc))
}

// ---------------------------------------------------------------------------
// 像素处理
// ---------------------------------------------------------------------------

enum Pixels {
    Rgb(RgbImage),
    Rgba(RgbaImage),
}

impl Pixels {
    fn dimensions(&self) -> (u32, u32) {
        match self {
            Pixels::Rgb(image) => image.dimensions(),
            Pixels::Rgba(image) => image.dimensions(),
        }
    }
}

/// 按 EXIF 朝向把像素转正（输出统一为"正立"，EXIF 里的朝向随后归一为 1）。
fn apply_orientation(image: DynamicImage, orientation: u32) -> DynamicImage {
    match orientation {
        2 => image.fliph(),
        3 => image.rotate180(),
        4 => image.flipv(),
        // 5 / 7 是"转置"与"反转置"：旋转后水平翻转
        5 => image.rotate90().fliph(),
        6 => image.rotate90(),
        7 => image.rotate270().fliph(),
        8 => image.rotate270(),
        _ => image,
    }
}

/// 同上，但直接作用在 RGB 缓冲上（预览走 zune 快速解码，没有 `DynamicImage` 包装）。
fn apply_orientation_rgb(image: RgbImage, orientation: u32) -> RgbImage {
    use image::imageops;

    match orientation {
        2 => imageops::flip_horizontal(&image),
        3 => imageops::rotate180(&image),
        4 => imageops::flip_vertical(&image),
        5 => imageops::flip_horizontal(&imageops::rotate90(&image)),
        6 => imageops::rotate90(&image),
        7 => imageops::flip_horizontal(&imageops::rotate270(&image)),
        8 => imageops::rotate270(&image),
        _ => image,
    }
}

/// 预览 / 缩略图用的快速 JPEG 解码：zune-jpeg 直接输出 RGB。
///
/// `new_fast` 关掉了 fancy upsampling（色度上采样更省，预览完全够用），
/// 压缩主链路仍走默认参数，保证产物画质与源图一致。
fn decode_jpeg_preview(bytes: &[u8]) -> Result<RgbImage, String> {
    let options = DecoderOptions::new_fast().jpeg_set_out_colorspace(ColorSpace::RGB);
    let mut decoder = ZuneJpegDecoder::new_with_options(ZCursor::new(bytes), options);
    let decoded = decoder.decode().map_err(|e| format!("解码失败: {e}"))?;
    let (width, height) = decoder
        .dimensions()
        .ok_or_else(|| "图片尺寸解析失败".to_string())?;

    RgbImage::from_raw(width as u32, height as u32, decoded)
        .ok_or_else(|| "解码输出缓冲区异常".to_string())
}

/// 透明像素按背景色合成到 RGB（JPEG 没有 alpha）。
fn flatten_to_rgb(image: DynamicImage, background: Rgb<u8>) -> RgbImage {
    if !image.color().has_alpha() {
        // 已经是 RGB 时直接交出内部缓冲，避免再整图复制一份
        return image.into_rgb8();
    }

    let rgba = image.to_rgba8();
    let (width, height) = rgba.dimensions();
    let mut output = RgbImage::new(width, height);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let alpha = u32::from(pixel[3]);
        let inverse = 255 - alpha;
        let blend = |foreground: u8, backdrop: u8| -> u8 {
            ((u32::from(foreground) * alpha + u32::from(backdrop) * inverse + 127) / 255) as u8
        };

        output.put_pixel(
            x,
            y,
            Rgb([
                blend(pixel[0], background[0]),
                blend(pixel[1], background[1]),
                blend(pixel[2], background[2]),
            ]),
        );
    }

    output
}

/// 等比装入目标框，**不放大**。
fn fit_into(width: u32, height: u32, box_width: u32, box_height: u32) -> (u32, u32) {
    if width == 0 || height == 0 || box_width == 0 || box_height == 0 {
        return (width.max(1), height.max(1));
    }

    let scale =
        (f64::from(box_width) / f64::from(width)).min(f64::from(box_height) / f64::from(height));

    if scale >= 1.0 {
        return (width, height);
    }

    (
        ((f64::from(width) * scale).round() as u32).max(1),
        ((f64::from(height) * scale).round() as u32).max(1),
    )
}

fn resize_rgb(image: RgbImage, width: u32, height: u32) -> Result<RgbImage, String> {
    if image.width() == width && image.height() == height {
        return Ok(image);
    }

    let source = FirImage::from_vec_u8(
        image.width(),
        image.height(),
        image.into_raw(),
        fr::PixelType::U8x3,
    )
    .map_err(|e| format!("创建缩放源失败: {e}"))?;
    let mut destination = FirImage::new(width, height, fr::PixelType::U8x3);
    let options =
        fr::ResizeOptions::new().resize_alg(fr::ResizeAlg::Convolution(fr::FilterType::Lanczos3));

    fr::Resizer::new()
        .resize(&source, &mut destination, Some(&options))
        .map_err(|e| format!("缩放失败: {e}"))?;

    RgbImage::from_raw(width, height, destination.into_vec())
        .ok_or_else(|| "缩放输出缓冲区异常".to_string())
}

fn resize_rgba(image: RgbaImage, width: u32, height: u32) -> Result<RgbaImage, String> {
    if image.width() == width && image.height() == height {
        return Ok(image);
    }

    let source = FirImage::from_vec_u8(
        image.width(),
        image.height(),
        image.into_raw(),
        fr::PixelType::U8x4,
    )
    .map_err(|e| format!("创建缩放源失败: {e}"))?;
    let mut destination = FirImage::new(width, height, fr::PixelType::U8x4);
    let options =
        fr::ResizeOptions::new().resize_alg(fr::ResizeAlg::Convolution(fr::FilterType::Lanczos3));

    fr::Resizer::new()
        .resize(&source, &mut destination, Some(&options))
        .map_err(|e| format!("缩放失败: {e}"))?;

    RgbaImage::from_raw(width, height, destination.into_vec())
        .ok_or_else(|| "缩放输出缓冲区异常".to_string())
}

fn resize_pixels(pixels: Pixels, width: u32, height: u32) -> Result<Pixels, String> {
    match pixels {
        Pixels::Rgb(image) => Ok(Pixels::Rgb(resize_rgb(image, width, height)?)),
        Pixels::Rgba(image) => Ok(Pixels::Rgba(resize_rgba(image, width, height)?)),
    }
}

fn encode_jpeg(image: &RgbImage, quality: u8) -> Result<Vec<u8>, String> {
    let mut output: Vec<u8> = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut output, quality.clamp(1, 100));
    encoder
        .encode_image(image)
        .map_err(|e| format!("JPEG 编码失败: {e}"))?;
    Ok(output)
}

/// 在保持尺寸不变时，尽量用较低质量把 JPEG 压到不超过原图体积。
/// 返回 `None` 表示最低可接受质量仍然偏大，调用方应保留原文件。
fn fit_jpeg_under_limit(
    image: &RgbImage,
    requested_quality: u8,
    limit: u64,
    segments: &JpegSegments,
    metadata_policy: &str,
) -> Result<Option<(Vec<u8>, u8)>, String> {
    let mut candidate = requested_quality.saturating_sub(5);

    if candidate < AUTO_MIN_QUALITY {
        return Ok(None);
    }

    let mut probes = 0u32;

    while probes < 6 {
        probes += 1;
        let encoded = encode_jpeg(image, candidate)?;
        let with_metadata = inject_metadata(
            encoded,
            segments,
            metadata_policy,
            image.width(),
            image.height(),
        )?;

        if with_metadata.len() as u64 <= limit {
            return Ok(Some((with_metadata, candidate)));
        }

        if candidate <= AUTO_MIN_QUALITY {
            break;
        }

        let ratio = (limit as f64 / with_metadata.len() as f64).sqrt();
        let estimate = (f64::from(candidate) * ratio).floor() as u8;
        let next = estimate
            .min(candidate.saturating_sub(5))
            .max(AUTO_MIN_QUALITY);

        if next >= candidate {
            break;
        }

        candidate = next;
    }

    Ok(None)
}

fn encode_png(pixels: &Pixels) -> Result<Vec<u8>, String> {
    let mut output: Vec<u8> = Vec::new();
    let encoder = PngEncoder::new_with_quality(
        &mut output,
        CompressionType::Default,
        PngFilterType::Adaptive,
    );

    match pixels {
        Pixels::Rgb(image) => encoder
            .write_image(
                image.as_raw(),
                image.width(),
                image.height(),
                ExtendedColorType::Rgb8,
            )
            .map_err(|e| format!("PNG 编码失败: {e}"))?,
        Pixels::Rgba(image) => encoder
            .write_image(
                image.as_raw(),
                image.width(),
                image.height(),
                ExtendedColorType::Rgba8,
            )
            .map_err(|e| format!("PNG 编码失败: {e}"))?,
    }

    Ok(output)
}

fn encode_pixels(pixels: &Pixels, format: OutFormat, quality: u8) -> Result<Vec<u8>, String> {
    match format {
        OutFormat::Jpeg => match pixels {
            Pixels::Rgb(image) => encode_jpeg(image, quality),
            Pixels::Rgba(image) => {
                // 走不到：JPEG 输出在 prepare 阶段就已经合成到 RGB
                let flattened = flatten_to_rgb(
                    DynamicImage::ImageRgba8(image.clone()),
                    Rgb([255, 255, 255]),
                );
                encode_jpeg(&flattened, quality)
            }
        },
        OutFormat::Png => encode_png(pixels),
    }
}

fn image_format_of(format: InputFormat) -> ImageFormat {
    match format {
        InputFormat::Jpeg => ImageFormat::Jpeg,
        InputFormat::Png => ImageFormat::Png,
        InputFormat::Webp => ImageFormat::WebP,
    }
}

fn is_16_bit(image: &DynamicImage) -> bool {
    matches!(
        image,
        DynamicImage::ImageLuma16(_)
            | DynamicImage::ImageLumaA16(_)
            | DynamicImage::ImageRgb16(_)
            | DynamicImage::ImageRgba16(_)
            | DynamicImage::ImageRgb32F(_)
            | DynamicImage::ImageRgba32F(_)
    )
}

// ---------------------------------------------------------------------------
// 目标体积：有界的质量/尺寸搜索
// ---------------------------------------------------------------------------

struct Encoded {
    bytes: Vec<u8>,
    quality: Option<u8>,
    width: u32,
    height: u32,
    reached: bool,
    attempts: u32,
}

/// 在固定像素下二分质量，返回不超过目标体积的编码（找不到就返回最小质量的那份）。
/// 在固定像素下找「不超过目标体积」的质量。
///
/// 不用二分（大图一次编码就要几百毫秒，8~20 次太贵）：体积与质量近似满足
/// `size ∝ quality^k`（k≈2），先用 `q * sqrt(target / size)` 估算下一个质量再验证，
/// 通常 2~4 次就能命中；`MAX_QUALITY_PROBES` 兜住极端情况，保证有界。
fn search_quality(
    pixels: &Pixels,
    quality: u8,
    target: u64,
    attempts: &mut u32,
) -> Result<(Vec<u8>, Option<u8>), String> {
    // 先用用户给的质量试一次：够小就直接用，画质最好
    let mut current = encode_pixels(pixels, OutFormat::Jpeg, quality)?;
    *attempts += 1;

    if current.len() as u64 <= target {
        return Ok((current, Some(quality)));
    }

    let mut current_quality = quality;

    while *attempts < MAX_QUALITY_PROBES && current_quality > MIN_QUALITY {
        let ratio = (target as f64 / current.len() as f64).sqrt();
        let estimate = (f64::from(current_quality) * ratio).floor() as i32;
        let next = estimate.clamp(i32::from(MIN_QUALITY), i32::from(current_quality) - 1) as u8;

        if next >= current_quality {
            break;
        }

        current_quality = next;
        current = encode_pixels(pixels, OutFormat::Jpeg, current_quality)?;
        *attempts += 1;

        if current.len() as u64 <= target {
            return Ok((current, Some(current_quality)));
        }
    }

    // 估算没命中（比如这张图对质量特别敏感）：再保底试最低质量一次
    if current_quality > MIN_QUALITY {
        current = encode_pixels(pixels, OutFormat::Jpeg, MIN_QUALITY)?;
        *attempts += 1;
        current_quality = MIN_QUALITY;

        if current.len() as u64 <= target {
            return Ok((current, Some(MIN_QUALITY)));
        }
    }

    Ok((current, Some(current_quality)))
}

/// 目标体积模式：先调质量，仍超标再逐级缩小（最多 4 轮），长边不低于 320px。
fn encode_to_target(mut pixels: Pixels, quality: u8, target: u64) -> Result<Encoded, String> {
    let mut attempts = 0u32;
    let mut rounds = 0u32;

    loop {
        let (bytes, used_quality) = search_quality(&pixels, quality, target, &mut attempts)?;
        let (width, height) = pixels.dimensions();
        let reached = bytes.len() as u64 <= target;

        if reached || rounds >= MAX_SCALE_ROUNDS {
            return Ok(Encoded {
                bytes,
                quality: used_quality,
                width,
                height,
                reached,
                attempts,
            });
        }

        let long_edge = width.max(height);
        if long_edge <= MIN_SCALE_EDGE {
            return Ok(Encoded {
                bytes,
                quality: used_quality,
                width,
                height,
                reached,
                attempts,
            });
        }

        let next_edge = ((f64::from(long_edge) * 0.85).round() as u32).max(MIN_SCALE_EDGE);
        let (next_width, next_height) = fit_into(width, height, next_edge, next_edge);
        if next_width == width && next_height == height {
            return Ok(Encoded {
                bytes,
                quality: used_quality,
                width,
                height,
                reached,
                attempts,
            });
        }

        pixels = resize_pixels(pixels, next_width, next_height)?;
        rounds += 1;
    }
}

// ---------------------------------------------------------------------------
// 输出路径与写盘
// ---------------------------------------------------------------------------

fn parse_background(value: &str) -> Result<Rgb<u8>, String> {
    let text = value.trim().trim_start_matches('#');

    let parse = |hex: &str| u8::from_str_radix(hex, 16).map_err(|_| "背景色格式不正确".to_string());

    match text.len() {
        3 => {
            let mut bytes = [0u8; 3];
            for (index, byte) in bytes.iter_mut().enumerate() {
                let digit = &text[index..index + 1];
                *byte = parse(&format!("{digit}{digit}"))?;
            }
            Ok(Rgb(bytes))
        }
        6 => {
            let mut bytes = [0u8; 3];
            for (index, byte) in bytes.iter_mut().enumerate() {
                *byte = parse(&text[index * 2..index * 2 + 2])?;
            }
            Ok(Rgb(bytes))
        }
        _ => Err("背景色格式不正确（应为 #rrggbb）".to_string()),
    }
}

fn paths_equal(left: &Path, right: &Path) -> bool {
    match (fs::canonicalize(left), fs::canonicalize(right)) {
        (Ok(a), Ok(b)) => a == b,
        _ => left.to_string_lossy().to_lowercase() == right.to_string_lossy().to_lowercase(),
    }
}

fn target_directory(
    source: &Path,
    options: &CompressOptions,
    default_output_dir: Option<&Path>,
) -> Result<PathBuf, String> {
    match options.output_mode.as_str() {
        "source" => source
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "源文件没有所在目录".to_string()),
        _ => default_output_dir
            .map(Path::to_path_buf)
            .ok_or_else(|| "还没有选择输出目录".to_string()),
    }
}

/// 批内已占用的输出路径（小写）。
///
/// 并发写盘时两个 worker 可能同时给「同名不同源」的两个文件挑中同一个目标名，
/// 单看文件系统都还不存在 —— 这里用进程内的占位集合挡住这种撞车。
type ReservedPaths = Mutex<std::collections::HashSet<String>>;

fn reserved_key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

fn claim(reserved: &ReservedPaths, path: &Path) {
    reserved
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .insert(reserved_key(path));
}

fn is_claimed(reserved: &ReservedPaths, path: &Path) -> bool {
    reserved
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .contains(&reserved_key(path))
}

/// 决定最终输出路径：应用后缀 + 逐条校验「绝不落在源文件上」+ 冲突策略 + 批内占位。
///
/// 返回值第二项表示「按 skip 策略跳过」。
fn resolve_target(
    directory: &Path,
    source: &Path,
    options: &CompressOptions,
    extension: &str,
    reserved: &ReservedPaths,
) -> Result<(PathBuf, bool), String> {
    fs::create_dir_all(directory).map_err(|e| format!("创建输出目录失败: {e}"))?;

    let base_stem = format!("{}{}", stem_of(source), options.suffix.trim());
    let candidate = directory.join(format!("{base_stem}.{extension}"));
    let available = !candidate.exists()
        && !paths_equal(&candidate, source)
        && !is_claimed(reserved, &candidate);

    if available {
        claim(reserved, &candidate);
        return Ok((candidate, false));
    }

    // 同一批里已经有别的任务占了这个名字：任何策略都只能换名，否则两份结果会互相覆盖
    if is_claimed(reserved, &candidate) {
        let path = unique_name(directory, &base_stem, extension, source, reserved)?;
        claim(reserved, &path);
        return Ok((path, false));
    }

    match options.on_conflict.as_str() {
        "skip" => Ok((candidate, true)),
        "overwrite" => {
            if paths_equal(&candidate, source) {
                // 「覆盖」也不能覆盖源文件本身，只能改名
                let path = unique_name(directory, &base_stem, extension, source, reserved)?;
                claim(reserved, &path);
                return Ok((path, false));
            }
            claim(reserved, &candidate);
            Ok((candidate, false))
        }
        _ => {
            let path = unique_name(directory, &base_stem, extension, source, reserved)?;
            claim(reserved, &path);
            Ok((path, false))
        }
    }
}

fn unique_name(
    directory: &Path,
    base_stem: &str,
    extension: &str,
    source: &Path,
    reserved: &ReservedPaths,
) -> Result<PathBuf, String> {
    for index in 1..=MAX_CONFLICT_INDEX {
        let candidate = directory.join(format!("{base_stem}-{index}.{extension}"));
        if !candidate.exists()
            && !paths_equal(&candidate, source)
            && !is_claimed(reserved, &candidate)
        {
            return Ok(candidate);
        }
    }

    Err("同名文件太多，找不到可用文件名".to_string())
}

/// 先写临时文件再改名：中途失败不会留下半截目标文件。
fn write_atomically(target: &Path, bytes: &[u8]) -> Result<(), String> {
    let name = file_name_of(target);
    let temp = target.with_file_name(format!(".{name}.copicseal-tmp-{}", now_millis()));

    fs::write(&temp, bytes).map_err(|e| format!("写入临时文件失败: {e}"))?;

    // Windows 的 rename 不能覆盖已存在的文件：覆盖场景下先删旧文件
    if target.exists() {
        if let Err(error) = fs::remove_file(target) {
            let _ = fs::remove_file(&temp);
            return Err(format!("替换旧文件失败: {error}"));
        }
    }

    if let Err(error) = fs::rename(&temp, target) {
        let _ = fs::remove_file(&temp);
        return Err(format!("重命名输出文件失败: {error}"));
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// 单张压缩
// ---------------------------------------------------------------------------

fn failed_result(
    item: &CompressItem,
    message: String,
    original_bytes: u64,
    warnings: Vec<String>,
) -> CompressResult {
    CompressResult {
        id: item.id.clone(),
        name: Path::new(&item.path)
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_default(),
        source_path: item.path.clone(),
        status: "failed".to_string(),
        output_path: None,
        output_name: None,
        original_bytes,
        output_bytes: 0,
        original_width: 0,
        original_height: 0,
        output_width: 0,
        output_height: 0,
        output_format: String::new(),
        quality_used: None,
        attempts: 0,
        reached_target: false,
        elapsed_ms: 0,
        warnings,
        message: Some(message),
    }
}

/// 压缩一张图。失败只返回 `status = failed` 的结果，不 panic、不中断整批。
fn compress_one(
    item: &CompressItem,
    options: &CompressOptions,
    default_output_dir: Option<&Path>,
    reserved: &ReservedPaths,
    on_stage: &mut dyn FnMut(&str),
) -> CompressResult {
    let source = Path::new(&item.path);

    if !source.is_file() {
        return failed_result(item, "源文件不存在".to_string(), 0, Vec::new());
    }

    let mut result = failed_result(item, String::new(), 0, Vec::new());
    result.status = "ok".to_string();
    result.message = None;

    let mut warnings: Vec<String> = Vec::new();

    let metadata = match fs::metadata(source) {
        Ok(value) => value,
        Err(error) => return failed_result(item, format!("读取文件失败: {error}"), 0, warnings),
    };

    result.original_bytes = metadata.len();

    if metadata.len() > MAX_INPUT_BYTES {
        return failed_result(
            item,
            format!("文件超过 {} MB", MAX_INPUT_BYTES / 1024 / 1024),
            metadata.len(),
            warnings,
        );
    }

    let bytes = match fs::read(source) {
        Ok(value) => value,
        Err(error) => {
            return failed_result(
                item,
                format!("读取文件失败: {error}"),
                metadata.len(),
                warnings,
            );
        }
    };

    let input_format = match detect_format(&bytes, source) {
        Ok(value) => value,
        Err(error) => return failed_result(item, error, metadata.len(), warnings),
    };

    if input_format == InputFormat::Webp && looks_animated_webp(&bytes) {
        return failed_result(
            item,
            "暂不支持动图 WebP（压缩会丢帧）".to_string(),
            metadata.len(),
            warnings,
        );
    }

    let background = match parse_background(&options.background) {
        Ok(value) => value,
        Err(error) => return failed_result(item, error, metadata.len(), warnings),
    };

    let output_format = match options.output_format.as_str() {
        "jpeg" => OutFormat::Jpeg,
        "png" => OutFormat::Png,
        _ => match input_format {
            InputFormat::Jpeg => OutFormat::Jpeg,
            InputFormat::Png => OutFormat::Png,
            InputFormat::Webp => {
                warnings.push("WebP 源不支持保持原格式，已输出 JPEG".to_string());
                OutFormat::Jpeg
            }
        },
    };

    on_stage("decoding");
    let decoded = match image::load_from_memory_with_format(&bytes, image_format_of(input_format)) {
        Ok(value) => value,
        Err(error) => {
            return failed_result(item, format!("解码失败: {error}"), metadata.len(), warnings);
        }
    };

    if u64::from(decoded.width()) * u64::from(decoded.height()) > MAX_INPUT_PIXELS {
        return failed_result(
            item,
            format!("像素数超过 {} MP", MAX_INPUT_PIXELS / 1_000_000),
            metadata.len(),
            warnings,
        );
    }

    if is_16_bit(&decoded) {
        warnings.push("原图是 16 位/浮点像素，输出为 8 位".to_string());
    }

    // EXIF 朝向：先把像素转正，输出统一成"正立"；界面上的"原始分辨率"也按转正后的显示口径
    let oriented = apply_orientation(decoded, orientation_of(&bytes, input_format));
    result.original_width = oriented.width();
    result.original_height = oriented.height();

    // 目标尺寸
    let (source_width, source_height) = (oriented.width(), oriented.height());
    let (target_width, target_height) = match options.resize_mode.as_str() {
        "max_edge" => {
            if options.max_edge == 0 {
                return failed_result(
                    item,
                    "长边上限必须大于 0".to_string(),
                    metadata.len(),
                    warnings,
                );
            }
            fit_into(
                source_width,
                source_height,
                options.max_edge,
                options.max_edge,
            )
        }
        "box" => {
            if options.box_width == 0 || options.box_height == 0 {
                return failed_result(
                    item,
                    "自定义宽高必须大于 0".to_string(),
                    metadata.len(),
                    warnings,
                );
            }
            fit_into(
                source_width,
                source_height,
                options.box_width,
                options.box_height,
            )
        }
        _ => (source_width, source_height),
    };

    let needs_resize = target_width != source_width || target_height != source_height;

    // 目标体积模式下的捷径：原图已经足够小，且不需要缩放、不改格式 → 直接复制字节
    let segments = if input_format == InputFormat::Jpeg {
        collect_jpeg_segments(&bytes)
    } else {
        JpegSegments::default()
    };

    if let Some(target) = options.target_bytes {
        let keep_format = options.output_format == "keep" && input_format != InputFormat::Webp;
        if !needs_resize && keep_format && metadata.len() <= target {
            on_stage("writing");
            let directory = match target_directory(source, options, default_output_dir) {
                Ok(value) => value,
                Err(error) => return failed_result(item, error, metadata.len(), warnings),
            };
            let (target_path, skip) = match resolve_target(
                &directory,
                source,
                options,
                out_extension(input_format, output_format),
                reserved,
            ) {
                Ok(value) => value,
                Err(error) => return failed_result(item, error, metadata.len(), warnings),
            };

            if skip {
                result.status = "skipped".to_string();
                result.message = Some("目标文件已存在".to_string());
                result.warnings = warnings;
                return result;
            }

            if let Err(error) = write_atomically(&target_path, &bytes) {
                return failed_result(item, error, metadata.len(), warnings);
            }

            result.output_path = Some(target_path.to_string_lossy().to_string());
            result.output_name = Some(file_name_of(&target_path));
            result.output_bytes = bytes.len() as u64;
            result.output_width = source_width;
            result.output_height = source_height;
            result.output_format = out_label(input_format).to_string();
            result.reached_target = true;
            result.warnings = warnings;
            result
                .warnings
                .push("原图已小于目标体积，未重新编码".to_string());
            return result;
        }
    }

    on_stage("resizing");
    let prepared = match output_format {
        OutFormat::Jpeg => Pixels::Rgb(flatten_to_rgb(oriented, background)),
        OutFormat::Png => {
            if oriented.color().has_alpha() {
                Pixels::Rgba(oriented.into_rgba8())
            } else {
                Pixels::Rgb(oriented.into_rgb8())
            }
        }
    };

    let prepared = if needs_resize {
        match resize_pixels(prepared, target_width, target_height) {
            Ok(value) => value,
            Err(error) => return failed_result(item, error, metadata.len(), warnings),
        }
    } else {
        prepared
    };

    on_stage("encoding");
    let mut prepared = Some(prepared);
    let encoded = match options.target_bytes {
        Some(target) => {
            match encode_to_target(prepared.take().expect("prepared"), options.quality, target) {
                Ok(value) => value,
                Err(error) => return failed_result(item, error, metadata.len(), warnings),
            }
        }
        None => {
            let pixels = prepared.as_ref().expect("prepared");
            let (width, height) = pixels.dimensions();
            match encode_pixels(pixels, output_format, options.quality) {
                Ok(bytes) => Encoded {
                    bytes,
                    quality: if output_format == OutFormat::Jpeg {
                        Some(options.quality.clamp(1, 100))
                    } else {
                        None
                    },
                    width,
                    height,
                    reached: true,
                    attempts: 1,
                },
                Err(error) => return failed_result(item, error, metadata.len(), warnings),
            }
        }
    };

    result.attempts = encoded.attempts;
    result.quality_used = encoded.quality;
    result.reached_target = encoded.reached;
    result.output_width = encoded.width;
    result.output_height = encoded.height;

    if options.target_bytes.is_some() && !encoded.reached {
        warnings.push(format!(
            "已降到最低质量与 {}px，仍未能压到目标体积（这是最小结果）",
            MIN_SCALE_EDGE
        ));
    }

    on_stage("writing");
    let directory = match target_directory(source, options, default_output_dir) {
        Ok(value) => value,
        Err(error) => return failed_result(item, error, metadata.len(), warnings),
    };

    let extension = out_extension(input_format, output_format);
    let (target_path, skip) = match resolve_target(&directory, source, options, extension, reserved)
    {
        Ok(value) => value,
        Err(error) => return failed_result(item, error, metadata.len(), warnings),
    };

    if skip {
        result.status = "skipped".to_string();
        result.message = Some("目标文件已存在".to_string());
        result.warnings = warnings;
        return result;
    }

    // 元数据只对 JPEG 输出有意义；PNG 输出显式告警，而不是假装保留
    let mut bytes = if output_format == OutFormat::Jpeg {
        match inject_metadata(
            encoded.bytes,
            &segments,
            &options.metadata,
            encoded.width,
            encoded.height,
        ) {
            Ok(value) => value,
            Err(error) => return failed_result(item, error, metadata.len(), warnings),
        }
    } else {
        if options.metadata != "strip" {
            warnings.push("PNG 输出暂不保留元数据".to_string());
        }
        encoded.bytes
    };

    let same_format = matches!(
        (input_format, output_format),
        (InputFormat::Jpeg, OutFormat::Jpeg) | (InputFormat::Png, OutFormat::Png)
    );

    let mut final_format = output_format.label().to_string();
    let mut final_quality = encoded.quality;
    let mut final_width = encoded.width;
    let mut final_height = encoded.height;

    // 纯重编码（不缩放、不变格式）不应该让文件变大：
    // JPEG 先自动降质量，PNG 或已到质量下限则保留原图。
    if !needs_resize && same_format && bytes.len() as u64 > metadata.len() {
        let mut replaced = false;

        if options.target_bytes.is_none() && output_format == OutFormat::Jpeg {
            if let Some(Pixels::Rgb(image)) = prepared.as_ref() {
                match fit_jpeg_under_limit(
                    image,
                    options.quality,
                    metadata.len(),
                    &segments,
                    &options.metadata,
                ) {
                    Ok(Some((fitted, quality))) => {
                        bytes = fitted;
                        final_quality = Some(quality);
                        warnings.push(format!(
                            "为避免体积变大，质量已从 {} 调整为 {}",
                            options.quality.clamp(1, 100),
                            quality
                        ));
                        replaced = true;
                    }
                    Ok(None) => {}
                    Err(error) => return failed_result(item, error, metadata.len(), warnings),
                }
            }
        }

        if !replaced {
            match fs::read(source) {
                Ok(original) => {
                    bytes = original;
                    final_quality = None;
                    final_width = source_width;
                    final_height = source_height;
                    final_format = out_label(input_format).to_string();
                    warnings.push("重新编码无法小于原图，已保留原文件".to_string());
                }
                Err(error) => {
                    return failed_result(
                        item,
                        format!("读取原文件失败: {error}"),
                        metadata.len(),
                        warnings,
                    );
                }
            }
        }
    }

    if bytes.len() as u64 > metadata.len() {
        warnings.push(format!(
            "输出比原图更大（{} → {} 字节），可降低质量或限制尺寸后重试",
            metadata.len(),
            bytes.len()
        ));
    }

    if let Some(target) = options.target_bytes {
        result.reached_target = bytes.len() as u64 <= target;
    }

    if let Err(error) = write_atomically(&target_path, &bytes) {
        return failed_result(item, error, metadata.len(), warnings);
    }

    result.status = "ok".to_string();
    result.message = None;
    result.output_path = Some(target_path.to_string_lossy().to_string());
    result.output_name = Some(file_name_of(&target_path));
    result.output_bytes = bytes.len() as u64;
    result.output_format = final_format;
    result.quality_used = final_quality;
    result.output_width = final_width;
    result.output_height = final_height;
    result.warnings = warnings;
    result
}

fn out_label(format: InputFormat) -> &'static str {
    match format {
        InputFormat::Jpeg => "jpeg",
        InputFormat::Png => "png",
        InputFormat::Webp => "webp",
    }
}

fn out_extension(_input: InputFormat, output: OutFormat) -> &'static str {
    output.extension()
}

// ---------------------------------------------------------------------------
// 批量调度
// ---------------------------------------------------------------------------

fn cancelled_result(item: &CompressItem, message: &str) -> CompressResult {
    CompressResult {
        id: item.id.clone(),
        name: Path::new(&item.path)
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_default(),
        source_path: item.path.clone(),
        status: "cancelled".to_string(),
        output_path: None,
        output_name: None,
        original_bytes: 0,
        output_bytes: 0,
        original_width: 0,
        original_height: 0,
        output_width: 0,
        output_height: 0,
        output_format: String::new(),
        quality_used: None,
        attempts: 0,
        reached_target: false,
        elapsed_ms: 0,
        warnings: Vec::new(),
        message: Some(message.to_string()),
    }
}

fn push_result(results: &Mutex<Vec<CompressResult>>, result: CompressResult) {
    let mut guard = results.lock().unwrap_or_else(|error| error.into_inner());
    guard.push(result);
}

/// 并发路数：按核心数留一个给 UI，再按「最大单文件体积」保守收敛。
///
/// 一张 24 MP 的图解码后约 72 MB（RGB 8 位），再叠加编码缓冲，峰值内存随路数线性涨；
/// 遇到几十 MB 的大图就压到 2 路，避免低内存机器被打爆。
fn worker_count(items: &[CompressItem], cores: usize) -> usize {
    let max_bytes = items
        .iter()
        .filter_map(|item| fs::metadata(&item.path).ok().map(|metadata| metadata.len()))
        .max()
        .unwrap_or(0);

    let base = cores.saturating_sub(1).clamp(1, 6);
    let workers = if max_bytes > 40 * 1024 * 1024 {
        base.min(2)
    } else {
        base
    };

    workers.min(items.len().max(1))
}

/// 批量压缩主体。
///
/// 抽成不依赖 `AppHandle` 的形式（进度通过回调传出），单测才跑得起来；
/// 命令层只负责把回调接到 Tauri 事件上。
fn run_batch_with<F>(
    items: &[CompressItem],
    options: &CompressOptions,
    output_dir: Option<&Path>,
    cancel: &AtomicBool,
    emit: F,
) -> CompressOutcome
where
    F: Fn(CompressProgress) + Sync,
{
    let total = items.len();
    let parallelism = std::thread::available_parallelism()
        .map(|value| value.get())
        .unwrap_or(2);
    let workers = worker_count(items, parallelism);

    let next = AtomicUsize::new(0);
    let finished = AtomicUsize::new(0);
    let succeeded = AtomicUsize::new(0);
    let failed = AtomicUsize::new(0);
    let results: Mutex<Vec<CompressResult>> = Mutex::new(Vec::with_capacity(total));
    let reserved = ReservedPaths::default();

    std::thread::scope(|scope| {
        for _ in 0..workers {
            let next = &next;
            let finished = &finished;
            let succeeded = &succeeded;
            let failed = &failed;
            let results = &results;
            let reserved = &reserved;
            let emit = &emit;

            scope.spawn(move || loop {
                let index = next.fetch_add(1, Ordering::SeqCst);
                if index >= total {
                    break;
                }

                let item = &items[index];

                if cancel.load(Ordering::SeqCst) {
                    push_result(results, cancelled_result(item, "已取消"));
                    let done = finished.fetch_add(1, Ordering::SeqCst) + 1;
                    emit(CompressProgress {
                        done,
                        total,
                        succeeded: succeeded.load(Ordering::SeqCst),
                        failed: failed.load(Ordering::SeqCst),
                        current_id: Some(item.id.clone()),
                        current_stage: "cancelled".to_string(),
                        cancelled: true,
                    });
                    continue;
                }

                emit(CompressProgress {
                    done: finished.load(Ordering::SeqCst),
                    total,
                    succeeded: succeeded.load(Ordering::SeqCst),
                    failed: failed.load(Ordering::SeqCst),
                    current_id: Some(item.id.clone()),
                    current_stage: "decoding".to_string(),
                    cancelled: false,
                });

                let mut on_stage = |stage: &str| {
                    emit(CompressProgress {
                        done: finished.load(Ordering::SeqCst),
                        total,
                        succeeded: succeeded.load(Ordering::SeqCst),
                        failed: failed.load(Ordering::SeqCst),
                        current_id: Some(item.id.clone()),
                        current_stage: stage.to_string(),
                        cancelled: false,
                    });
                };

                let started_at = std::time::Instant::now();
                let mut result = compress_one(item, options, output_dir, reserved, &mut on_stage);
                result.elapsed_ms = started_at.elapsed().as_millis() as u64;

                match result.status.as_str() {
                    "ok" => {
                        succeeded.fetch_add(1, Ordering::SeqCst);
                    }
                    "failed" => {
                        failed.fetch_add(1, Ordering::SeqCst);
                    }
                    _ => {}
                }

                let done = finished.fetch_add(1, Ordering::SeqCst) + 1;
                emit(CompressProgress {
                    done,
                    total,
                    succeeded: succeeded.load(Ordering::SeqCst),
                    failed: failed.load(Ordering::SeqCst),
                    current_id: Some(item.id.clone()),
                    current_stage: String::new(),
                    cancelled: cancel.load(Ordering::SeqCst),
                });

                push_result(results, result);
            });
        }
    });

    let results = results
        .into_inner()
        .unwrap_or_else(|error| error.into_inner());
    let mut total_original = 0u64;
    let mut total_output = 0u64;
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut skipped = 0usize;
    let mut cancelled_count = 0usize;

    for result in &results {
        match result.status.as_str() {
            "ok" => {
                succeeded += 1;
                total_original += result.original_bytes;
                total_output += result.output_bytes;
            }
            "failed" => failed += 1,
            "skipped" => skipped += 1,
            _ => cancelled_count += 1,
        }
    }

    CompressOutcome {
        results,
        cancelled: cancelled_count > 0,
        total_original,
        total_output,
        succeeded,
        failed,
        skipped,
        cancelled_count,
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// 校验参数：所有取值都必须是白名单内的，越界一律报错（不猜测用户意图）。
fn validate_options(options: &CompressOptions) -> Result<(), String> {
    if !(1..=100).contains(&options.quality) {
        return Err("质量必须在 1-100 之间".to_string());
    }

    match options.output_format.as_str() {
        "keep" | "jpeg" | "png" => {}
        other => return Err(format!("未知的输出格式: {other}")),
    }

    match options.output_mode.as_str() {
        "custom" | "source" => {}
        other => return Err(format!("未知的输出位置: {other}")),
    }

    match options.resize_mode.as_str() {
        "original" => {}
        "max_edge" => {
            if options.max_edge == 0 {
                return Err("长边上限必须大于 0".to_string());
            }
        }
        "box" => {
            if options.box_width == 0 || options.box_height == 0 {
                return Err("自定义宽高必须大于 0".to_string());
            }
        }
        other => return Err(format!("未知的尺寸模式: {other}")),
    }

    match options.metadata.as_str() {
        "keep" | "essential" | "strip" => {}
        other => return Err(format!("未知的元数据策略: {other}")),
    }

    match options.on_conflict.as_str() {
        "rename" | "skip" | "overwrite" => {}
        other => return Err(format!("未知的重名策略: {other}")),
    }

    if let Some(target) = options.target_bytes {
        if target < MIN_TARGET_BYTES {
            return Err(format!("目标体积不能小于 {} KB", MIN_TARGET_BYTES / 1024));
        }
    }

    parse_background(&options.background)?;

    let illegal = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if options.suffix.contains(illegal) {
        return Err("文件名后缀不能包含路径分隔符或非法字符".to_string());
    }

    Ok(())
}

/// 递归列出目录里的图片（仅 JPEG / PNG / WebP），跳过项连同原因一起返回。
#[tauri::command]
pub async fn list_images(dir: String, recursive: bool) -> Result<ImageScanResult, String> {
    let directory = PathBuf::from(dir);
    if !directory.is_dir() {
        return Err(format!("不是一个目录: {}", directory.display()));
    }

    tauri::async_runtime::spawn_blocking(move || {
        let mut paths = Vec::new();
        let mut skipped = Vec::new();
        list_images_recursive(&directory, recursive, 0, &mut paths, &mut skipped);
        paths.sort();
        ImageScanResult { paths, skipped }
    })
    .await
    .map_err(|error| format!("列图失败: {error}"))
}

/// 读文件头，返回尺寸/格式/是否动图/是否可压缩（不整图解码，几百张也很快）。
#[tauri::command]
pub async fn probe_images(paths: Vec<String>) -> Vec<ImageProbe> {
    tauri::async_runtime::spawn_blocking(move || {
        paths
            .iter()
            .map(|path| probe_one(Path::new(path)))
            .collect()
    })
    .await
    .unwrap_or_default()
}

/// 生成预览图（列表缩略图与前后对比共用），返回缓存文件路径。
#[tauri::command]
pub async fn create_image_preview(
    path: String,
    cache_dir: String,
    max_edge: u32,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_preview(Path::new(&path), Path::new(&cache_dir), max_edge)
    })
    .await
    .map_err(|error| format!("生成预览失败: {error}"))?
}

/// 请求取消当前批次：正在处理的文件会做完（不留半成品），排队中的直接标记为取消。
#[tauri::command]
pub fn cancel_compress(state: tauri::State<'_, CompressState>) {
    state.cancel.store(true, Ordering::SeqCst);
}

/// 批量压缩。返回逐张结果与整批统计；取消时 `cancelled = true`。
#[tauri::command]
pub async fn compress_images(
    app: tauri::AppHandle,
    state: tauri::State<'_, CompressState>,
    items: Vec<CompressItem>,
    options: CompressOptions,
    output_dir: String,
) -> Result<CompressOutcome, String> {
    if items.is_empty() {
        return Err("没有待压缩的图片".to_string());
    }

    validate_options(&options)?;

    let directory = if options.output_mode == "custom" {
        let trimmed = output_dir.trim().to_string();
        if trimmed.is_empty() {
            return Err("请先选择输出目录".to_string());
        }
        let path = PathBuf::from(trimmed);
        if !path.is_dir() {
            fs::create_dir_all(&path).map_err(|error| format!("创建输出目录失败: {error}"))?;
        }
        Some(path)
    } else {
        None
    };

    // State 不能跨 await：先把取消开关克隆出来
    state.cancel.store(false, Ordering::SeqCst);
    let cancel = Arc::clone(&state.cancel);
    let emit_app = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        run_batch_with(
            &items,
            &options,
            directory.as_deref(),
            &cancel,
            |progress| {
                let _ = emit_app.emit(PROGRESS_EVENT, progress);
            },
        )
    })
    .await
    .map_err(|error| format!("压缩任务失败: {error}"))
}

// ---------------------------------------------------------------------------
// 单测
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    fn probe_dir(name: &str) -> PathBuf {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("compress-probe")
            .join(name);
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// 带噪点的渐变图：噪点足够多，降质量才会真的变小。
    fn noisy_rgb(width: u32, height: u32) -> RgbImage {
        let mut image = RgbImage::new(width, height);
        for (x, y, pixel) in image.enumerate_pixels_mut() {
            *pixel = Rgb([
                ((x * 37 + y * 11) % 256) as u8,
                ((x * 17 + y * 53) % 256) as u8,
                ((x * 7 + y * 29) % 256) as u8,
            ]);
        }
        image
    }

    fn write_jpeg(path: &Path, image: &RgbImage, quality: u8) {
        let mut file = fs::File::create(path).unwrap();
        JpegEncoder::new_with_quality(&mut file, quality)
            .encode_image(image)
            .unwrap();
    }

    fn write_png_rgba(path: &Path, image: &RgbaImage) {
        let file = fs::File::create(path).unwrap();
        PngEncoder::new(file)
            .write_image(
                image.as_raw(),
                image.width(),
                image.height(),
                ExtendedColorType::Rgba8,
            )
            .unwrap();
    }

    fn options() -> CompressOptions {
        CompressOptions {
            quality: 60,
            ..CompressOptions::default()
        }
    }

    fn item(path: &Path, id: &str) -> CompressItem {
        CompressItem {
            id: id.to_string(),
            path: path.to_string_lossy().to_string(),
        }
    }

    fn compress(path: &Path, options: &CompressOptions, output_dir: &Path) -> CompressResult {
        let compress_item = item(path, "t");
        let reserved = ReservedPaths::default();
        let mut stage = |_: &str| {};
        compress_one(
            &compress_item,
            options,
            Some(output_dir),
            &reserved,
            &mut stage,
        )
    }

    fn output_size(path: &str) -> (u32, u32) {
        image::ImageReader::open(path)
            .unwrap()
            .with_guessed_format()
            .unwrap()
            .into_dimensions()
            .unwrap()
    }

    #[test]
    fn compresses_jpeg_into_a_readable_smaller_file() {
        let dir = probe_dir("compress");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(160, 120), 98);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let result = compress(&input, &options(), &output_dir);

        assert_eq!(result.status, "ok", "{:?}", result.message);
        assert!(result.output_bytes > 0);
        assert!(
            result.output_bytes < result.original_bytes,
            "压缩后应该更小: {} -> {}",
            result.original_bytes,
            result.output_bytes
        );
        assert_eq!(
            output_size(result.output_path.as_deref().unwrap()),
            (160, 120)
        );
        assert!(output_dir.join("photo-compressed.jpg").exists());
    }

    #[test]
    fn never_outputs_larger_than_original_for_pure_reencode() {
        let dir = probe_dir("no-grow");
        let input = dir.join("already-compressed.jpg");
        // 原图用低质量写，再用较高质量重压时很容易变大，用来覆盖防膨胀逻辑
        write_jpeg(&input, &noisy_rgb(240, 180), 50);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.quality = 95;

        let result = compress(&input, &settings, &output_dir);

        assert_eq!(result.status, "ok", "{:?}", result.message);
        assert!(
            result.output_bytes <= result.original_bytes,
            "纯重编码不应变大: {} -> {}",
            result.original_bytes,
            result.output_bytes
        );
    }

    #[test]
    fn limits_long_edge_without_upscaling() {
        let dir = probe_dir("max-edge");
        let input = dir.join("wide.jpg");
        write_jpeg(&input, &noisy_rgb(400, 200), 90);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.resize_mode = "max_edge".to_string();
        settings.max_edge = 200;

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");
        assert_eq!((result.output_width, result.output_height), (200, 100));
        assert_eq!(
            output_size(result.output_path.as_deref().unwrap()),
            (200, 100)
        );

        // 小图不放大
        let small = dir.join("small.jpg");
        write_jpeg(&small, &noisy_rgb(120, 80), 90);
        let result = compress(&small, &settings, &output_dir);
        assert_eq!((result.output_width, result.output_height), (120, 80));
    }

    #[test]
    fn fits_inside_a_custom_box() {
        let dir = probe_dir("box");
        let input = dir.join("tall.jpg");
        write_jpeg(&input, &noisy_rgb(300, 600), 90);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.resize_mode = "box".to_string();
        settings.box_width = 200;
        settings.box_height = 200;

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");
        assert_eq!((result.output_width, result.output_height), (100, 200));
    }

    #[test]
    fn flattens_transparency_onto_the_background_colour() {
        let dir = probe_dir("alpha");
        let input = dir.join("badge.png");
        let mut image = RgbaImage::new(32, 32);
        for pixel in image.pixels_mut() {
            *pixel = Rgba([255, 0, 0, 0]);
        }
        write_png_rgba(&input, &image);

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.background = "#00ff00".to_string();
        // 透明合成只在"输出 JPEG"时发生；PNG→PNG 会保留透明通道
        settings.output_format = "jpeg".to_string();

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");

        let decoded = image::ImageReader::open(result.output_path.unwrap())
            .unwrap()
            .with_guessed_format()
            .unwrap()
            .decode()
            .unwrap()
            .to_rgb8();
        let corner = decoded.get_pixel(0, 0);
        assert!(corner[1] > 240, "透明像素应填成背景绿: {corner:?}");
        assert!(corner[0] < 16 && corner[2] < 16, "{corner:?}");
    }

    #[test]
    fn applies_exif_orientation_to_pixels() {
        let dir = probe_dir("orientation");
        let input = dir.join("rotated.jpg");
        let image = noisy_rgb(40, 20);

        let mut encoded: Vec<u8> = Vec::new();
        JpegEncoder::new_with_quality(&mut encoded, 90)
            .encode_image(&image)
            .unwrap();
        // 朝向 6 = 顺时针 90°：像素转正后应该是 20×40
        let with_exif =
            crate::exif::insert_jpeg_exif(encoded, build_exif_segment(6, 40, 20), false).unwrap();
        fs::write(&input, with_exif).unwrap();

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();
        let result = compress(&input, &options(), &output_dir);

        assert_eq!(result.status, "ok");
        assert_eq!((result.original_width, result.original_height), (20, 40));
        assert_eq!(
            output_size(result.output_path.as_deref().unwrap()),
            (20, 40)
        );
    }

    #[test]
    fn target_size_search_terminates_within_budget() {
        let dir = probe_dir("target");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(300, 300), 98);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.target_bytes = Some(20 * 1024);

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");
        assert!(
            result.attempts > 0 && result.attempts <= MAX_QUALITY_PROBES + MAX_SCALE_ROUNDS * 8
        );
        assert!(
            result.output_bytes <= 20 * 1024 || !result.reached_target,
            "达标就必须真的 ≤ 目标，否则 reached_target 为 false"
        );
    }

    #[test]
    fn keeps_exif_and_writes_the_software_tag() {
        let dir = probe_dir("metadata-keep");
        let input = dir.join("photo.jpg");
        write_with_exif(&input, &noisy_rgb(80, 60), 90, 1, Some("CopicsealTest"));

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let result = compress(&input, &options(), &output_dir);
        assert_eq!(result.status, "ok");

        let output_path = result.output_path.unwrap();
        let segment = crate::exif::extract_jpeg_exif(output_path.clone()).unwrap();
        let text = String::from_utf8_lossy(&segment).to_string();
        assert!(text.contains("Copicseal v"), "应写入 Software 标签");
        assert!(text.contains("CopicsealTest"), "应保留相机 Make");

        let exif = crate::exif::read_exif(output_path).unwrap();
        assert_eq!(exif.orientation, Some(1), "朝向归一为 1");
    }

    #[test]
    fn strips_metadata_when_requested() {
        let dir = probe_dir("metadata-strip");
        let input = dir.join("photo.jpg");
        write_with_exif(&input, &noisy_rgb(64, 48), 90, 1, Some("CopicsealTest"));

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.metadata = "strip".to_string();

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");
        assert!(
            crate::exif::extract_jpeg_exif(result.output_path.unwrap()).is_err(),
            "移除策略下不应有 EXIF"
        );
    }

    #[test]
    fn essential_metadata_drops_camera_details() {
        let dir = probe_dir("metadata-essential");
        let input = dir.join("photo.jpg");
        write_with_exif(&input, &noisy_rgb(64, 48), 90, 1, Some("CopicsealTest"));

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.metadata = "essential".to_string();

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");

        let output_path = result.output_path.unwrap();
        let exif = crate::exif::read_exif(output_path.clone()).unwrap();
        assert_eq!(exif.make, None, "必要元数据不应包含相机型号");
        assert_eq!(exif.orientation, Some(1));

        // 对照：源图本身确实带着 Make，说明上面不是因为源图没有才为 None
        let source_exif = crate::exif::read_exif(input.to_string_lossy().to_string()).unwrap();
        assert_eq!(source_exif.make, Some("CopicsealTest".to_string()));

        // 必要元数据仍然带着 Software 标记
        let segment = crate::exif::extract_jpeg_exif(output_path).unwrap();
        assert!(String::from_utf8_lossy(&segment).contains("Copicseal v"));
    }

    /// 写一张带 EXIF（可选 Make）的测试 JPEG。
    fn write_with_exif(
        path: &Path,
        image: &RgbImage,
        quality: u8,
        orientation: u16,
        make: Option<&str>,
    ) {
        let mut encoded: Vec<u8> = Vec::new();
        JpegEncoder::new_with_quality(&mut encoded, quality)
            .encode_image(image)
            .unwrap();
        let segment = test_exif_segment(orientation, image.width(), image.height(), make);
        let with_exif = crate::exif::insert_jpeg_exif(encoded, segment, false).unwrap();
        fs::write(path, with_exif).unwrap();
    }

    /// 测试用 EXIF：宽高 + 朝向 + 可选 Make（ASCII 写在数据区）。
    fn test_exif_segment(orientation: u16, width: u32, height: u32, make: Option<&str>) -> Vec<u8> {
        let mut entries: Vec<(u16, u16, u32, [u8; 4])> = vec![
            (0x0100, 4, 1, width.to_le_bytes()),
            (0x0101, 4, 1, height.to_le_bytes()),
        ];

        let make_bytes = make.map(|value| {
            let mut bytes = value.as_bytes().to_vec();
            bytes.push(0);
            bytes
        });

        let mut data: Vec<u8> = Vec::new();

        if let Some(ref bytes) = make_bytes {
            entries.push((0x010F, 2, bytes.len() as u32, [0u8; 4]));
        }

        let orientation_entry = (0x0112, 3, 1, {
            let mut value = [0u8; 4];
            value[..2].copy_from_slice(&orientation.to_le_bytes());
            value
        });
        entries.push(orientation_entry);
        entries.sort_by_key(|entry| entry.0);

        let data_offset = 8 + 2 + entries.len() * 12 + 4;

        // Make 是变长 ASCII，值存在数据区
        if let Some(ref bytes) = make_bytes {
            for entry in entries.iter_mut() {
                if entry.0 == 0x010F {
                    entry.3 = (data_offset as u32).to_le_bytes();
                }
            }
            data.extend_from_slice(bytes);
        }

        let mut tiff: Vec<u8> = Vec::new();
        tiff.extend_from_slice(b"II");
        tiff.extend_from_slice(&42u16.to_le_bytes());
        tiff.extend_from_slice(&8u32.to_le_bytes());
        tiff.extend_from_slice(&(entries.len() as u16).to_le_bytes());
        for (tag, field_type, count, value) in entries {
            tiff.extend_from_slice(&tag.to_le_bytes());
            tiff.extend_from_slice(&field_type.to_le_bytes());
            tiff.extend_from_slice(&count.to_le_bytes());
            tiff.extend_from_slice(&value);
        }
        tiff.extend_from_slice(&0u32.to_le_bytes());
        tiff.extend_from_slice(&data);

        let payload_len = 6 + tiff.len();
        let mut segment = Vec::with_capacity(payload_len + 2);
        segment.extend_from_slice(&[0xFF, 0xE1]);
        segment.extend_from_slice(&((payload_len + 2) as u16).to_be_bytes());
        segment.extend_from_slice(b"Exif\0\0");
        segment.extend_from_slice(&tiff);
        segment
    }

    #[test]
    fn renames_on_conflict_instead_of_overwriting() {
        let dir = probe_dir("conflict-rename");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(64, 48), 90);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let first = compress(&input, &options(), &output_dir);
        assert_eq!(first.status, "ok");
        let second = compress(&input, &options(), &output_dir);

        assert_eq!(second.status, "ok");
        assert_ne!(first.output_path, second.output_path);
        assert!(output_dir.join("photo-compressed.jpg").exists());
        assert!(output_dir.join("photo-compressed-1.jpg").exists());
    }

    #[test]
    fn skips_when_target_exists_and_policy_is_skip() {
        let dir = probe_dir("conflict-skip");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(64, 48), 90);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let first = compress(&input, &options(), &output_dir);
        assert_eq!(first.status, "ok");

        let mut settings = options();
        settings.on_conflict = "skip".to_string();
        let second = compress(&input, &settings, &output_dir);

        assert_eq!(second.status, "skipped");
        assert!(second.output_path.is_none());
    }

    #[test]
    fn never_writes_to_the_source_path() {
        let dir = probe_dir("source-safety");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(64, 48), 90);
        let before = fs::read(&input).unwrap();

        // 输出目录 = 源目录、后缀为空：候选名与源文件同名，必须自动改名而不是覆盖
        let mut settings = options();
        settings.suffix = String::new();
        let result = compress(&input, &settings, &dir);

        assert_eq!(result.status, "ok");
        let output = PathBuf::from(result.output_path.unwrap());
        assert_ne!(output, input);
        assert_eq!(fs::read(&input).unwrap(), before, "源文件必须原样保留");
        assert!(output.exists());
    }

    #[test]
    fn cancelled_batch_writes_nothing() {
        let dir = probe_dir("cancel");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(64, 48), 90);
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let cancel = AtomicBool::new(true);
        let items = vec![item(&input, "a"), item(&input, "b")];
        let outcome = run_batch_with(
            &items,
            &options(),
            Some(&output_dir),
            &cancel,
            |_progress| {},
        );

        assert!(outcome.cancelled);
        assert_eq!(outcome.cancelled_count, 2);
        assert_eq!(outcome.succeeded, 0);
        assert!(
            fs::read_dir(&output_dir).unwrap().next().is_none(),
            "取消后不应产生文件"
        );
    }

    #[test]
    fn batch_reports_counts_and_totals() {
        let dir = probe_dir("batch");
        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let first = dir.join("a.jpg");
        let second = dir.join("b.jpg");
        write_jpeg(&first, &noisy_rgb(64, 48), 92);
        write_jpeg(&second, &noisy_rgb(80, 60), 92);

        let cancel = AtomicBool::new(false);
        let items = vec![item(&first, "a"), item(&second, "b")];
        let outcome = run_batch_with(
            &items,
            &options(),
            Some(&output_dir),
            &cancel,
            |_progress| {},
        );

        assert_eq!(outcome.succeeded, 2);
        assert_eq!(outcome.failed, 0);
        assert!(!outcome.cancelled);
        assert_eq!(outcome.results.len(), 2);
        assert!(outcome.total_output <= outcome.total_original);
    }

    #[test]
    fn probes_report_corrupt_and_unsupported_files() {
        let dir = probe_dir("probe");
        let corrupt = dir.join("broken.jpg");
        fs::write(&corrupt, b"not really a jpeg").unwrap();

        let heic = dir.join("photo.heic");
        fs::write(&heic, b"whatever").unwrap();

        let good = dir.join("good.png");
        let mut image = RgbaImage::new(10, 10);
        for pixel in image.pixels_mut() {
            *pixel = Rgba([1, 2, 3, 255]);
        }
        write_png_rgba(&good, &image);

        assert!(probe_one(&corrupt).error.is_some());
        assert!(probe_one(&heic).error.is_some());
        let probe = probe_one(&good);
        assert_eq!(probe.format, "png");
        assert_eq!((probe.width, probe.height), (10, 10));
        assert!(probe.error.is_none());
    }

    #[test]
    fn lists_images_recursively_and_skips_the_rest() {
        let dir = probe_dir("list");
        let nested = dir.join("nested");
        fs::create_dir_all(&nested).unwrap();

        let mut image = RgbaImage::new(4, 4);
        for pixel in image.pixels_mut() {
            *pixel = Rgba([9, 9, 9, 255]);
        }
        write_png_rgba(&dir.join("a.png"), &image);
        write_png_rgba(&nested.join("b.png"), &image);
        fs::write(dir.join("note.txt"), b"hello").unwrap();

        let mut paths = Vec::new();
        let mut skipped = Vec::new();
        list_images_recursive(&dir, true, 0, &mut paths, &mut skipped);

        assert_eq!(paths.len(), 2);
        assert_eq!(skipped.len(), 1);
        assert!(skipped[0].path.ends_with("note.txt"));

        let mut flat = Vec::new();
        let mut flat_skipped = Vec::new();
        list_images_recursive(&dir, false, 0, &mut flat, &mut flat_skipped);
        assert_eq!(flat.len(), 1, "非递归时不进入子目录");
    }

    #[test]
    fn preview_is_cached_by_source_and_size() {
        let dir = probe_dir("preview");
        let input = dir.join("photo.jpg");
        write_jpeg(&input, &noisy_rgb(400, 300), 90);
        let cache = dir.join("cache");

        let first = create_preview(&input, &cache, 160).unwrap();
        let second = create_preview(&input, &cache, 160).unwrap();

        assert_eq!(first, second, "同一源同一尺寸应命中缓存");
        let size = output_size(&first);
        assert!(size.0.max(size.1) <= 160);
        assert!(first.ends_with(".jpg"));
    }

    /// 12 MP 基准（默认不跑）：
    /// `cargo test --manifest-path src-tauri/Cargo.toml compress::tests::bench_12mp -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn bench_12mp() {
        let dir = probe_dir("bench");
        let input = dir.join("big.jpg");
        write_jpeg(&input, &noisy_rgb(3024, 4032), 95);

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let started = std::time::Instant::now();
        let result = compress(&input, &options(), &output_dir);
        let elapsed = started.elapsed();

        assert_eq!(result.status, "ok", "{:?}", result.message);
        println!(
            "12MP quality-mode: {} -> {} bytes, {} ms",
            result.original_bytes,
            result.output_bytes,
            elapsed.as_millis()
        );
    }

    #[test]
    fn validates_options_strictly() {
        assert!(validate_options(&options()).is_ok());

        let mut bad = options();
        bad.quality = 0;
        assert!(validate_options(&bad).is_err());

        let mut bad = options();
        bad.output_format = "webp".to_string();
        assert!(validate_options(&bad).is_err());

        let mut bad = options();
        bad.background = "red".to_string();
        assert!(validate_options(&bad).is_err());

        let mut bad = options();
        bad.suffix = "a/b".to_string();
        assert!(validate_options(&bad).is_err());

        let mut bad = options();
        bad.target_bytes = Some(1024);
        assert!(validate_options(&bad).is_err());
    }

    fn write_webp(path: &Path, image: &RgbaImage) {
        use image::codecs::webp::WebPEncoder;

        let mut encoded: Vec<u8> = Vec::new();
        WebPEncoder::new_lossless(&mut encoded)
            .write_image(
                image.as_raw(),
                image.width(),
                image.height(),
                ExtendedColorType::Rgba8,
            )
            .unwrap();
        fs::write(path, encoded).unwrap();
    }

    #[test]
    fn webp_source_falls_back_to_jpeg_with_a_warning() {
        let dir = probe_dir("webp-source");
        let input = dir.join("graphic.webp");
        let mut image = RgbaImage::new(64, 48);
        for (x, y, pixel) in image.enumerate_pixels_mut() {
            *pixel = Rgba([(x * 4) as u8, (y * 5) as u8, 128, 255]);
        }
        write_webp(&input, &image);

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let result = compress(&input, &options(), &output_dir);

        assert_eq!(result.status, "ok", "{:?}", result.message);
        assert_eq!(result.output_format, "jpeg", "WebP 源只能输出 JPEG / PNG");
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("WebP")));
    }

    #[test]
    fn png_output_keeps_the_alpha_channel() {
        let dir = probe_dir("png-alpha");
        let input = dir.join("badge.png");
        let mut image = RgbaImage::new(32, 32);
        for pixel in image.pixels_mut() {
            *pixel = Rgba([10, 20, 30, 0]);
        }
        write_png_rgba(&input, &image);

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.output_format = "png".to_string();

        let result = compress(&input, &settings, &output_dir);
        assert_eq!(result.status, "ok");
        assert_eq!(result.output_format, "png");

        let decoded = image::ImageReader::open(result.output_path.unwrap())
            .unwrap()
            .with_guessed_format()
            .unwrap()
            .decode()
            .unwrap()
            .to_rgba8();
        assert_eq!(decoded.get_pixel(0, 0)[3], 0, "透明通道要保留");
    }

    #[test]
    fn same_name_sources_get_distinct_outputs_in_one_batch() {
        let dir = probe_dir("same-name");
        let first_dir = dir.join("a");
        let second_dir = dir.join("b");
        fs::create_dir_all(&first_dir).unwrap();
        fs::create_dir_all(&second_dir).unwrap();

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let first = first_dir.join("photo.jpg");
        let second = second_dir.join("photo.jpg");
        write_jpeg(&first, &noisy_rgb(64, 48), 90);
        write_jpeg(&second, &noisy_rgb(80, 60), 90);

        let cancel = AtomicBool::new(false);
        let items = vec![item(&first, "a"), item(&second, "b")];
        let outcome = run_batch_with(&items, &options(), Some(&output_dir), &cancel, |_| {});

        assert_eq!(outcome.succeeded, 2);
        let outputs: Vec<String> = outcome
            .results
            .iter()
            .filter_map(|result| result.output_path.clone())
            .collect();
        assert_eq!(outputs.len(), 2);
        assert_ne!(outputs[0], outputs[1], "同名不同源不能写到同一个目标");
        assert_eq!(fs::read_dir(&output_dir).unwrap().count(), 2);
    }

    #[test]
    fn target_mode_downscales_and_stays_bounded() {
        let dir = probe_dir("target-scale");
        let input = dir.join("big.jpg");
        write_jpeg(&input, &noisy_rgb(600, 400), 96);

        let output_dir = dir.join("out");
        fs::create_dir_all(&output_dir).unwrap();

        let mut settings = options();
        settings.target_bytes = Some(8 * 1024);

        let result = compress(&input, &settings, &output_dir);

        assert_eq!(result.status, "ok");
        assert!(result.output_bytes <= result.original_bytes);
        if !result.reached_target {
            assert!(
                result.output_width < 600 || result.output_height < 400,
                "达不到目标体积时必须已经缩过尺寸，而不是原地放弃"
            );
        }
    }
}
