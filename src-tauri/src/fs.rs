use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::ImageReader;
use serde::Serialize;
use std::fs;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};
use tauri::State;

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "heic", "heif", "webp"];
const IMAGE_DIR_NAME: &str = "images";
const PREVIEW_DIR_NAME: &str = "previews";
const THUMBNAIL_DIR_NAME: &str = "thumbnails";
const THUMBNAIL_SIZE: u32 = 320;
const THUMBNAIL_JPEG_QUALITY: u8 = 82;
const THUMBNAIL_WORKER_COUNT: usize = 2;

#[derive(Debug, Serialize)]
pub struct ImageMeta {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub ext: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize)]
pub struct CachedImageMeta {
    pub name: String,
    pub original_path: Option<String>,
    pub path: String,
    pub preview_path: String,
    pub thumbnail_path: String,
    pub thumbnail_ready: bool,
    pub size: u64,
    pub ext: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize)]
pub struct CacheOverview {
    pub directory: String,
    pub image_count: u64,
    pub preview_count: u64,
    pub thumbnail_count: u64,
    pub image_bytes: u64,
    pub preview_bytes: u64,
    pub thumbnail_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Serialize)]
pub struct CacheCleanupResult {
    pub removed_files: u64,
    pub removed_bytes: u64,
}

#[derive(Debug)]
struct ThumbnailTask {
    source_path: PathBuf,
    thumbnail_path: PathBuf,
}

pub struct ThumbnailTaskScheduler {
    sender: Sender<ThumbnailTask>,
}

impl ThumbnailTaskScheduler {
    pub fn new(worker_count: usize) -> Self {
        let (sender, receiver) = mpsc::channel::<ThumbnailTask>();
        let shared_receiver = Arc::new(Mutex::new(receiver));

        for index in 0..worker_count.max(1) {
            spawn_thumbnail_worker(index, Arc::clone(&shared_receiver));
        }

        Self { sender }
    }

    fn schedule(&self, source_path: PathBuf, thumbnail_path: PathBuf) -> Result<(), String> {
        self.sender
            .send(ThumbnailTask {
                source_path,
                thumbnail_path,
            })
            .map_err(|error| format!("failed to enqueue thumbnail task: {error}"))
    }
}

#[tauri::command]
pub async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("写入文件失败: {e}"))
}

#[tauri::command]
pub async fn convert_heic_to_png(input: String) -> Result<String, String> {
    convert_heic_to_png_path(Path::new(&input))
}

#[tauri::command]
pub async fn import_image_to_cache(
    path: String,
    cache_dir: String,
    scheduler: State<'_, ThumbnailTaskScheduler>,
) -> Result<CachedImageMeta, String> {
    let original_path = path.clone();
    let source_path = Path::new(&path);
    if !source_path.exists() {
        return Err(format!("文件不存在: {}", source_path.display()));
    }

    if !is_supported_image(source_path) {
        return Err(format!("不支持的图片格式: {}", source_path.display()));
    }

    let file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "无法解析文件名".to_string())?;
    let bytes = fs::read(source_path).map_err(|e| format!("读取图片失败: {e}"))?;

    import_bytes_to_cache_impl(
        file_name,
        bytes,
        &cache_dir,
        Some(original_path),
        &scheduler,
    )
}

#[tauri::command]
pub async fn import_image_bytes_to_cache(
    name: String,
    contents: Vec<u8>,
    cache_dir: String,
    scheduler: State<'_, ThumbnailTaskScheduler>,
) -> Result<CachedImageMeta, String> {
    import_bytes_to_cache_impl(&name, contents, &cache_dir, None, &scheduler)
}

#[tauri::command]
pub async fn get_cache_overview(cache_dir: String) -> Result<CacheOverview, String> {
    get_cache_overview_impl(&cache_dir)
}

#[tauri::command]
pub async fn clear_cache(
    cache_dir: String,
    scope: Option<String>,
) -> Result<CacheOverview, String> {
    clear_cache_impl(&cache_dir, scope.as_deref())?;
    get_cache_overview_impl(&cache_dir)
}

#[tauri::command]
pub async fn cleanup_cache(
    cache_dir: String,
    max_age_days: u32,
) -> Result<CacheCleanupResult, String> {
    cleanup_cache_impl(&cache_dir, max_age_days)
}

#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub async fn open_directory(path: String) -> Result<(), String> {
    let directory = Path::new(&path);
    if !directory.exists() {
        return Err(format!("目录不存在: {}", directory.display()));
    }

    if !directory.is_dir() {
        return Err(format!("不是目录: {}", directory.display()));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(directory)
            .spawn()
            .map_err(|e| format!("打开目录失败: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(directory)
            .spawn()
            .map_err(|e| format!("打开目录失败: {e}"))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(directory)
            .spawn()
            .map_err(|e| format!("打开目录失败: {e}"))?;
    }

    Ok(())
}

pub fn auto_cleanup_cache(
    cache_dir: &str,
    max_age_days: u32,
) -> Result<CacheCleanupResult, String> {
    cleanup_cache_impl(cache_dir, max_age_days)
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

    let metadata = fs::metadata(path).map_err(|e| format!("读取文件失败: {e}"))?;

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    Ok(ImageMeta {
        name: path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        ext: ext.clone(),
        mime_type: mime_type_for_ext(&ext).to_string(),
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

    let entries = fs::read_dir(dir).map_err(|e| format!("读取目录失败: {e}"))?;
    let mut paths = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {e}"))?;
        let entry_path = entry.path();

        if entry_path.is_file() && is_supported_image(&entry_path) {
            paths.push(entry_path.to_string_lossy().to_string());
        }
    }

    paths.sort();
    Ok(paths)
}

fn import_bytes_to_cache_impl(
    original_name: &str,
    contents: Vec<u8>,
    cache_dir: &str,
    original_path: Option<String>,
    scheduler: &ThumbnailTaskScheduler,
) -> Result<CachedImageMeta, String> {
    let ext = extension_from_name(original_name)?;
    let cache_paths = create_cache_paths(cache_dir, original_name, &ext)?;

    fs::write(&cache_paths.image_path, &contents).map_err(|e| format!("写入缓存文件失败: {e}"))?;

    let preview_path =
        create_preview_asset(&cache_paths.image_path, &cache_paths.preview_path, &ext)?;
    let thumbnail_source = if preview_path.extension().and_then(|value| value.to_str())
        == Some("png")
        && matches!(ext.as_str(), "heic" | "heif")
    {
        preview_path.as_path()
    } else {
        cache_paths.image_path.as_path()
    };

    scheduler.schedule(
        thumbnail_source.to_path_buf(),
        cache_paths.thumbnail_path.clone(),
    )?;

    Ok(CachedImageMeta {
        name: original_name.to_string(),
        original_path,
        path: cache_paths.image_path.to_string_lossy().to_string(),
        preview_path: preview_path.to_string_lossy().to_string(),
        thumbnail_path: cache_paths.thumbnail_path.to_string_lossy().to_string(),
        thumbnail_ready: false,
        size: contents.len() as u64,
        ext: ext.clone(),
        mime_type: mime_type_for_ext(&ext).to_string(),
    })
}

fn get_cache_overview_impl(cache_dir: &str) -> Result<CacheOverview, String> {
    let root = Path::new(cache_dir);
    ensure_cache_layout(root)?;

    let (image_count, image_bytes) = collect_dir_stats(&root.join(IMAGE_DIR_NAME))?;
    let (preview_count, preview_bytes) = collect_dir_stats(&root.join(PREVIEW_DIR_NAME))?;
    let (thumbnail_count, thumbnail_bytes) = collect_dir_stats(&root.join(THUMBNAIL_DIR_NAME))?;

    Ok(CacheOverview {
        directory: root.to_string_lossy().to_string(),
        image_count,
        preview_count,
        thumbnail_count,
        image_bytes,
        preview_bytes,
        thumbnail_bytes,
        total_bytes: image_bytes + preview_bytes + thumbnail_bytes,
    })
}

fn clear_cache_impl(cache_dir: &str, scope: Option<&str>) -> Result<(), String> {
    let root = Path::new(cache_dir);
    ensure_cache_layout(root)?;

    match scope.unwrap_or("all") {
        "thumbnails" => reset_dir(&root.join(THUMBNAIL_DIR_NAME)),
        "previews" => reset_dir(&root.join(PREVIEW_DIR_NAME)),
        "all" => {
            reset_dir(&root.join(IMAGE_DIR_NAME))?;
            reset_dir(&root.join(PREVIEW_DIR_NAME))?;
            reset_dir(&root.join(THUMBNAIL_DIR_NAME))
        }
        value => Err(format!("不支持的缓存清理范围: {value}")),
    }
}

fn cleanup_cache_impl(cache_dir: &str, max_age_days: u32) -> Result<CacheCleanupResult, String> {
    let root = Path::new(cache_dir);
    ensure_cache_layout(root)?;

    let max_age_days = max_age_days.max(1);
    let threshold = SystemTime::now()
        .checked_sub(Duration::from_secs(max_age_days as u64 * 24 * 60 * 60))
        .ok_or_else(|| "计算缓存清理时间失败".to_string())?;

    let mut removed_files = 0;
    let mut removed_bytes = 0;

    for dir_name in [IMAGE_DIR_NAME, PREVIEW_DIR_NAME, THUMBNAIL_DIR_NAME] {
        let dir_path = root.join(dir_name);
        for entry in fs::read_dir(&dir_path).map_err(|e| format!("读取缓存目录失败: {e}"))?
        {
            let entry = entry.map_err(|e| format!("读取缓存目录项失败: {e}"))?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let metadata = entry
                .metadata()
                .map_err(|e| format!("读取缓存文件元数据失败: {e}"))?;
            let modified_at = metadata
                .modified()
                .or_else(|_| metadata.created())
                .unwrap_or(SystemTime::UNIX_EPOCH);

            if modified_at > threshold {
                continue;
            }

            removed_bytes += metadata.len();
            removed_files += 1;
            fs::remove_file(&path).map_err(|e| format!("删除缓存文件失败: {e}"))?;
        }
    }

    Ok(CacheCleanupResult {
        removed_files,
        removed_bytes,
    })
}

fn create_preview_asset(
    image_path: &Path,
    preview_path: &Path,
    ext: &str,
) -> Result<PathBuf, String> {
    if !matches!(ext, "heic" | "heif") {
        return Ok(image_path.to_path_buf());
    }

    #[cfg(target_os = "macos")]
    {
        let preview = convert_heic_to_png_path(image_path)?;
        if preview != preview_path.to_string_lossy().to_string() {
            fs::copy(&preview, preview_path).map_err(|e| format!("复制 HEIC 预览失败: {e}"))?;
        }
        return Ok(preview_path.to_path_buf());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = preview_path;
        Ok(image_path.to_path_buf())
    }
}

fn create_thumbnail_asset(source_path: &Path, thumbnail_path: &Path) -> Result<(), String> {
    let image = ImageReader::open(source_path)
        .map_err(|e| format!("打开缩略图源文件失败: {e}"))?
        .with_guessed_format()
        .map_err(|e| format!("识别缩略图源文件格式失败: {e}"))?
        .decode();

    let thumbnail = image
        .map_err(|e| format!("解码缩略图源文件失败: {e}"))?
        .resize_to_fill(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Triangle)
        .to_rgb8();

    let file = File::create(thumbnail_path).map_err(|e| format!("创建缩略图文件失败: {e}"))?;
    let mut encoder = JpegEncoder::new_with_quality(file, THUMBNAIL_JPEG_QUALITY);
    encoder
        .encode_image(&thumbnail)
        .map_err(|e| format!("写入 JPEG 缩略图失败: {e}"))
}

fn create_thumbnail_asset_atomically(
    source_path: &Path,
    thumbnail_path: &Path,
) -> Result<(), String> {
    let temp_thumbnail_path = thumbnail_path.with_extension("jpg.part");

    if temp_thumbnail_path.exists() {
        fs::remove_file(&temp_thumbnail_path)
            .map_err(|e| format!("failed to remove temporary thumbnail file: {e}"))?;
    }

    create_thumbnail_asset(source_path, &temp_thumbnail_path)?;

    fs::rename(&temp_thumbnail_path, thumbnail_path).map_err(|e| {
        format!(
            "failed to replace thumbnail file {} -> {}: {e}",
            temp_thumbnail_path.display(),
            thumbnail_path.display()
        )
    })?;

    Ok(())
}

fn spawn_thumbnail_worker(index: usize, receiver: Arc<Mutex<Receiver<ThumbnailTask>>>) {
    thread::Builder::new()
        .name(format!("thumbnail-worker-{index}"))
        .spawn(move || loop {
            let task = match receiver.lock() {
                Ok(guard) => guard.recv(),
                Err(_) => return,
            };

            let task = match task {
                Ok(task) => task,
                Err(_) => return,
            };

            if let Err(error) =
                create_thumbnail_asset_atomically(&task.source_path, &task.thumbnail_path)
            {
                eprintln!(
                    "generate thumbnail failed for {} -> {}: {}",
                    task.source_path.display(),
                    task.thumbnail_path.display(),
                    error
                );
            }
        })
        .expect("failed to spawn thumbnail worker");
}

pub fn create_thumbnail_scheduler() -> ThumbnailTaskScheduler {
    ThumbnailTaskScheduler::new(THUMBNAIL_WORKER_COUNT)
}

fn convert_heic_to_png_path(input_path: &Path) -> Result<String, String> {
    if !input_path.exists() {
        return Err(format!("文件不存在: {}", input_path.display()));
    }

    let output = input_path.with_extension("png");
    let output_str = output.to_string_lossy().to_string();

    if output.exists() {
        return Ok(output_str);
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("sips")
            .args([
                "-s",
                "format",
                "png",
                input_path.to_string_lossy().as_ref(),
                "--out",
                &output_str,
            ])
            .status()
            .map_err(|e| format!("sips 执行失败: {e}"))?;

        if !status.success() {
            return Err("sips 转换 HEIC 失败".to_string());
        }

        Ok(output_str)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("HEIC 转 PNG 仅在 macOS 上支持".to_string())
    }
}

fn ensure_cache_layout(root: &Path) -> Result<(), String> {
    fs::create_dir_all(root.join(IMAGE_DIR_NAME))
        .map_err(|e| format!("创建图片缓存目录失败: {e}"))?;
    fs::create_dir_all(root.join(PREVIEW_DIR_NAME))
        .map_err(|e| format!("创建预览缓存目录失败: {e}"))?;
    fs::create_dir_all(root.join(THUMBNAIL_DIR_NAME))
        .map_err(|e| format!("创建缩略图缓存目录失败: {e}"))?;
    Ok(())
}

fn create_cache_paths(
    cache_dir: &str,
    original_name: &str,
    ext: &str,
) -> Result<CachePaths, String> {
    let root = Path::new(cache_dir);
    ensure_cache_layout(root)?;

    let id = uuid::Uuid::new_v4().to_string();
    let stem = sanitize_stem(
        Path::new(original_name)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("image"),
    );
    let file_name = format!("{id}-{stem}.{ext}");

    Ok(CachePaths {
        image_path: root.join(IMAGE_DIR_NAME).join(&file_name),
        preview_path: root.join(PREVIEW_DIR_NAME).join(format!("{id}-{stem}.png")),
        thumbnail_path: root
            .join(THUMBNAIL_DIR_NAME)
            .join(format!("{id}-{stem}.jpg")),
    })
}

fn collect_dir_stats(dir: &Path) -> Result<(u64, u64), String> {
    let mut count = 0;
    let mut bytes = 0;

    for entry in fs::read_dir(dir).map_err(|e| format!("读取缓存目录失败: {e}"))? {
        let entry = entry.map_err(|e| format!("读取缓存目录项失败: {e}"))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("读取缓存文件元数据失败: {e}"))?;
        if metadata.is_file() {
            count += 1;
            bytes += metadata.len();
        }
    }

    Ok((count, bytes))
}

fn reset_dir(dir: &Path) -> Result<(), String> {
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| format!("清理缓存目录失败: {e}"))?;
    }
    fs::create_dir_all(dir).map_err(|e| format!("重建缓存目录失败: {e}"))
}

fn extension_from_name(name: &str) -> Result<String, String> {
    let ext = Path::new(name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();

    if SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
        Ok(ext)
    } else {
        Err(format!("不支持的图片格式: {name}"))
    }
}

fn mime_type_for_ext(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "heic" => "image/heic",
        "heif" => "image/heif",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn sanitize_stem(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() || char == '-' || char == '_' {
                char
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();

    if sanitized.is_empty() {
        "image".to_string()
    } else {
        sanitized
    }
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

struct CachePaths {
    image_path: PathBuf,
    preview_path: PathBuf,
    thumbnail_path: PathBuf,
}
