use fast_image_resize as fr;
use fr::images::Image as FirImage;
use image::codecs::jpeg::JpegEncoder;
use image::ImageReader;
use serde::Serialize;
use std::fs;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime};
use tauri::State;
use zune_core::bytestream::ZCursor;
use zune_core::colorspace::ColorSpace;
use zune_core::options::DecoderOptions;
use zune_jpeg::JpegDecoder as ZuneJpegDecoder;

#[cfg(target_os = "windows")]
use windows::core::PCWSTR;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::GENERIC_READ;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Imaging::{
    CLSID_WICImagingFactory, GUID_WICPixelFormat24bppRGB, IWICBitmapFrameDecode, IWICBitmapSource,
    IWICBitmapSourceTransform, IWICImagingFactory, WICBitmapDitherTypeNone,
    WICBitmapInterpolationModeFant, WICBitmapPaletteTypeCustom, WICBitmapTransformRotate0,
    WICDecodeMetadataCacheOnDemand,
};
#[cfg(target_os = "windows")]
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
};

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "heic", "heif", "hif", "webp"];
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
pub async fn convert_heic_to_jpeg(input: String) -> Result<String, String> {
    let input_path = Path::new(&input);
    let output_path = input_path.with_extension("jpg");
    convert_heic_to_jpeg_path(input_path, &output_path)?;
    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_image_to_cache(
    path: String,
    cache_dir: String,
    scheduler: State<'_, ThumbnailTaskScheduler>,
) -> Result<CachedImageMeta, String> {
    let started_at = Instant::now();
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
    let read_started_at = Instant::now();
    let bytes = fs::read(source_path).map_err(|e| format!("读取图片失败: {e}"))?;
    println!(
        "[thumbnail][import] read source file={} bytes={} elapsed_ms={}",
        source_path.display(),
        bytes.len(),
        read_started_at.elapsed().as_millis()
    );

    let meta = import_bytes_to_cache_impl(
        file_name,
        bytes,
        &cache_dir,
        Some(original_path),
        &scheduler,
    )?;
    println!(
        "[thumbnail][import] import complete file={} ext={} total_elapsed_ms={}",
        source_path.display(),
        meta.ext,
        started_at.elapsed().as_millis()
    );
    Ok(meta)
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
    let started_at = Instant::now();
    let ext = extension_from_name(original_name)?;
    let cache_paths = create_cache_paths(cache_dir, original_name, &ext)?;

    let write_started_at = Instant::now();
    fs::write(&cache_paths.image_path, &contents).map_err(|e| format!("写入缓存文件失败: {e}"))?;
    println!(
        "[thumbnail][import] write cache image file={} ext={} bytes={} elapsed_ms={}",
        cache_paths.image_path.display(),
        ext,
        contents.len(),
        write_started_at.elapsed().as_millis()
    );

    let preview_started_at = Instant::now();
    let preview_path =
        create_preview_asset(&cache_paths.image_path, &cache_paths.preview_path, &ext)?;
    println!(
        "[thumbnail][import] create preview file={} ext={} preview={} elapsed_ms={}",
        cache_paths.image_path.display(),
        ext,
        preview_path.display(),
        preview_started_at.elapsed().as_millis()
    );
    let thumbnail_source = if matches!(ext.as_str(), "heic" | "heif" | "hif") {
        preview_path.as_path()
    } else {
        cache_paths.image_path.as_path()
    };

    scheduler.schedule(
        thumbnail_source.to_path_buf(),
        cache_paths.thumbnail_path.clone(),
    )?;
    println!(
        "[thumbnail][import] schedule thumbnail source={} target={} elapsed_ms={} total_elapsed_ms={}",
        thumbnail_source.display(),
        cache_paths.thumbnail_path.display(),
        0,
        started_at.elapsed().as_millis()
    );

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
    if !matches!(ext, "heic" | "heif" | "hif") {
        return Ok(image_path.to_path_buf());
    }

    #[cfg(target_os = "macos")]
    {
        convert_heic_to_jpeg_path(image_path, preview_path)?;
        Ok(preview_path.to_path_buf())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = preview_path;
        Ok(image_path.to_path_buf())
    }
}

fn create_thumbnail_asset(source_path: &Path, thumbnail_path: &Path) -> Result<(), String> {
    let started_at = Instant::now();
    #[cfg(target_os = "macos")]
    if try_create_thumbnail_with_sips(source_path, thumbnail_path).is_ok() {
        println!(
            "[thumbnail][worker] native macos sips source={} target={} elapsed_ms={}",
            source_path.display(),
            thumbnail_path.display(),
            started_at.elapsed().as_millis()
        );
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    if let Ok(thumbnail) = try_create_thumbnail_with_wic(source_path) {
        let write_started_at = Instant::now();
        let result = write_thumbnail_jpeg(&thumbnail, thumbnail_path);
        println!(
            "[thumbnail][worker] native windows wic source={} target={} write_elapsed_ms={} total_elapsed_ms={}",
            source_path.display(),
            thumbnail_path.display(),
            write_started_at.elapsed().as_millis(),
            started_at.elapsed().as_millis()
        );
        return result;
    }

    let decode_resize_started_at = Instant::now();
    let thumbnail = if is_jpeg_image(source_path) {
        create_thumbnail_from_jpeg(source_path)?
    } else {
        create_thumbnail_from_dynamic_image(source_path)?
    };
    println!(
        "[thumbnail][worker] fallback decode+resize source={} elapsed_ms={}",
        source_path.display(),
        decode_resize_started_at.elapsed().as_millis()
    );

    let write_started_at = Instant::now();
    let result = write_thumbnail_jpeg(&thumbnail, thumbnail_path);
    println!(
        "[thumbnail][worker] fallback write source={} target={} write_elapsed_ms={} total_elapsed_ms={}",
        source_path.display(),
        thumbnail_path.display(),
        write_started_at.elapsed().as_millis(),
        started_at.elapsed().as_millis()
    );
    result
}

fn write_thumbnail_jpeg(thumbnail: &image::RgbImage, thumbnail_path: &Path) -> Result<(), String> {
    let file = File::create(thumbnail_path).map_err(|e| format!("创建缩略图文件失败: {e}"))?;
    let mut encoder = JpegEncoder::new_with_quality(file, THUMBNAIL_JPEG_QUALITY);
    encoder
        .encode_image(thumbnail)
        .map_err(|e| format!("写入 JPEG 缩略图失败: {e}"))
}

fn create_thumbnail_from_jpeg(source_path: &Path) -> Result<image::RgbImage, String> {
    let input = fs::read(source_path).map_err(|e| format!("读取 JPEG 缩略图源文件失败: {e}"))?;
    let options = DecoderOptions::new_fast().jpeg_set_out_colorspace(ColorSpace::RGB);
    let mut decoder = ZuneJpegDecoder::new_with_options(ZCursor::new(input.as_slice()), options);
    let decoded = decoder
        .decode()
        .map_err(|e| format!("JPEG 缩略图解码失败: {e}"))?;
    let (width, height) = decoder
        .dimensions()
        .ok_or_else(|| "JPEG 缩略图尺寸解析失败".to_string())?;

    resize_rgb8_thumbnail(width as u32, height as u32, decoded)
}

fn create_thumbnail_from_dynamic_image(source_path: &Path) -> Result<image::RgbImage, String> {
    let image = ImageReader::open(source_path)
        .map_err(|e| format!("打开缩略图源文件失败: {e}"))?
        .with_guessed_format()
        .map_err(|e| format!("识别缩略图源文件格式失败: {e}"))?
        .decode()
        .map_err(|e| format!("解码缩略图源文件失败: {e}"))?;
    let rgb = image.to_rgb8();
    let (width, height) = rgb.dimensions();

    resize_rgb8_thumbnail(width, height, rgb.into_raw())
}

fn resize_rgb8_thumbnail(
    width: u32,
    height: u32,
    pixels: Vec<u8>,
) -> Result<image::RgbImage, String> {
    let src_image = FirImage::from_vec_u8(width, height, pixels, fr::PixelType::U8x3)
        .map_err(|e| format!("创建缩略图源缓冲区失败: {e}"))?;
    let mut dst_image = FirImage::new(THUMBNAIL_SIZE, THUMBNAIL_SIZE, fr::PixelType::U8x3);
    let resize_options = fr::ResizeOptions::new()
        .resize_alg(fr::ResizeAlg::Convolution(fr::FilterType::Hamming))
        .fit_into_destination(Some((0.5, 0.5)));
    let mut resizer = fr::Resizer::new();

    resizer
        .resize(&src_image, &mut dst_image, Some(&resize_options))
        .map_err(|e| format!("缩略图缩放失败: {e}"))?;

    image::RgbImage::from_raw(THUMBNAIL_SIZE, THUMBNAIL_SIZE, dst_image.into_vec())
        .ok_or_else(|| "创建缩略图输出缓冲区失败".to_string())
}

fn create_thumbnail_asset_atomically(
    source_path: &Path,
    thumbnail_path: &Path,
) -> Result<(), String> {
    let started_at = Instant::now();
    let temp_thumbnail_path = thumbnail_path.with_extension("part.jpg");

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

    println!(
        "[thumbnail][worker] atomic replace source={} target={} elapsed_ms={}",
        source_path.display(),
        thumbnail_path.display(),
        started_at.elapsed().as_millis()
    );

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

fn convert_heic_to_jpeg_path(input_path: &Path, output_path: &Path) -> Result<(), String> {
    if !input_path.exists() {
        return Err(format!("文件不存在: {}", input_path.display()));
    }

    if output_path.exists() {
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let started_at = Instant::now();
        let status = std::process::Command::new("sips")
            .args([
                "-s",
                "format",
                "jpeg",
                input_path.to_string_lossy().as_ref(),
                "--out",
                output_path.to_string_lossy().as_ref(),
            ])
            .status()
            .map_err(|e| format!("sips 执行失败: {e}"))?;

        if !status.success() {
            return Err("sips 转换 HEIC 为 JPEG 失败".to_string());
        }

        println!(
            "[thumbnail][heic] sips jpeg preview source={} output={} elapsed_ms={}",
            input_path.display(),
            output_path.display(),
            started_at.elapsed().as_millis()
        );

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = output_path;
        Err("HEIC 转 JPEG 仅在 macOS 上支持".to_string())
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
        preview_path: root.join(PREVIEW_DIR_NAME).join(format!("{id}-{stem}.jpg")),
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
        "heif" | "hif" => "image/heif",
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

fn is_jpeg_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_lowercase().as_str(), "jpg" | "jpeg"))
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn try_create_thumbnail_with_sips(source_path: &Path, thumbnail_path: &Path) -> Result<(), String> {
    let (source_width, source_height) = get_image_dimensions_with_sips(source_path)?;
    let (target_width, target_height, crop_offset_y, crop_offset_x) =
        calculate_cover_resize(source_width, source_height, THUMBNAIL_SIZE);

    let status = std::process::Command::new("sips")
        .args([
            "-s",
            "format",
            "jpeg",
            "-z",
            &target_height.to_string(),
            &target_width.to_string(),
            "-c",
            &THUMBNAIL_SIZE.to_string(),
            &THUMBNAIL_SIZE.to_string(),
            "--cropOffset",
            &crop_offset_y.to_string(),
            &crop_offset_x.to_string(),
            source_path.to_string_lossy().as_ref(),
            "--out",
            thumbnail_path.to_string_lossy().as_ref(),
        ])
        .status()
        .map_err(|e| format!("sips 生成缩略图失败: {e}"))?;

    if !status.success() {
        return Err("sips 生成缩略图失败".to_string());
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn get_image_dimensions_with_sips(source_path: &Path) -> Result<(u32, u32), String> {
    let output = std::process::Command::new("sips")
        .args([
            "-g",
            "pixelWidth",
            "-g",
            "pixelHeight",
            "-1",
            source_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|e| format!("sips 读取图片尺寸失败: {e}"))?;

    if !output.status.success() {
        return Err("sips 读取图片尺寸失败".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut width = None;
    let mut height = None;

    for segment in stdout.split('|') {
        let segment = segment.trim();
        if let Some(value) = segment.strip_prefix("pixelWidth:") {
            width = value.trim().parse::<u32>().ok();
        } else if let Some(value) = segment.strip_prefix("pixelHeight:") {
            height = value.trim().parse::<u32>().ok();
        }
    }

    match (width, height) {
        (Some(width), Some(height)) if width > 0 && height > 0 => Ok((width, height)),
        _ => Err("无法解析 sips 返回的图片尺寸".to_string()),
    }
}

#[cfg(target_os = "macos")]
fn calculate_cover_resize(
    source_width: u32,
    source_height: u32,
    target_size: u32,
) -> (u32, u32, u32, u32) {
    let width_scale = target_size as f64 / source_width.max(1) as f64;
    let height_scale = target_size as f64 / source_height.max(1) as f64;
    let scale = width_scale.max(height_scale);
    let target_width = ((source_width as f64 * scale).ceil() as u32).max(target_size);
    let target_height = ((source_height as f64 * scale).ceil() as u32).max(target_size);
    let crop_offset_x = (target_width.saturating_sub(target_size)) / 2;
    let crop_offset_y = (target_height.saturating_sub(target_size)) / 2;

    (target_width, target_height, crop_offset_y, crop_offset_x)
}

#[cfg(target_os = "windows")]
fn try_create_thumbnail_with_wic(source_path: &Path) -> Result<image::RgbImage, String> {
    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED)
            .ok()
            .map_err(|e| format!("初始化 WIC 失败: {e}"))?;

        struct ComGuard;
        impl Drop for ComGuard {
            fn drop(&mut self) {
                unsafe {
                    CoUninitialize();
                }
            }
        }

        let _guard = ComGuard;
        let factory: IWICImagingFactory =
            CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER)
                .map_err(|e| format!("创建 WIC 工厂失败: {e}"))?;
        let wide_path = source_path
            .as_os_str()
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>();
        let decoder = factory
            .CreateDecoderFromFilename(
                PCWSTR(wide_path.as_ptr()),
                None,
                GENERIC_READ,
                WICDecodeMetadataCacheOnDemand,
            )
            .map_err(|e| format!("WIC 打开图片失败: {e}"))?;
        let frame = decoder
            .GetFrame(0)
            .map_err(|e| format!("WIC 读取图像帧失败: {e}"))?;

        create_thumbnail_from_wic_frame(&factory, &frame)
            .or_else(|_| create_thumbnail_from_wic_scaler(&factory, &frame))
    }
}

#[cfg(target_os = "windows")]
fn create_thumbnail_from_wic_frame(
    factory: &IWICImagingFactory,
    frame: &IWICBitmapFrameDecode,
) -> Result<image::RgbImage, String> {
    let transform = frame
        .cast::<IWICBitmapSourceTransform>()
        .map_err(|e| format!("WIC 源变换接口不可用: {e}"))?;

    let (src_width, src_height) = get_wic_source_size(frame)?;
    let crop = build_cover_crop_rect(src_width, src_height);
    let mut target_width = THUMBNAIL_SIZE;
    let mut target_height = THUMBNAIL_SIZE;

    unsafe {
        transform
            .GetClosestSize(&mut target_width, &mut target_height)
            .map_err(|e| format!("WIC 获取最接近缩略图尺寸失败: {e}"))?;
    }

    if target_width == 0 || target_height == 0 {
        return Err("WIC 返回了无效缩略图尺寸".to_string());
    }

    let stride = target_width * 3;
    let mut buffer = vec![0; (stride * target_height) as usize];

    unsafe {
        transform
            .CopyPixels(
                &crop,
                target_width,
                target_height,
                &GUID_WICPixelFormat24bppRGB,
                WICBitmapTransformRotate0,
                stride,
                &mut buffer,
            )
            .map_err(|e| format!("WIC 直接缩放解码失败: {e}"))?;
    }

    image::RgbImage::from_raw(target_width, target_height, buffer)
        .ok_or_else(|| "创建 WIC 缩略图缓冲区失败".to_string())
        .and_then(|image| ensure_thumbnail_canvas(&image))
        .or_else(|_| create_thumbnail_from_wic_scaler(factory, frame))
}

#[cfg(target_os = "windows")]
fn create_thumbnail_from_wic_scaler(
    factory: &IWICImagingFactory,
    frame: &IWICBitmapFrameDecode,
) -> Result<image::RgbImage, String> {
    let source: IWICBitmapSource = frame
        .cast()
        .map_err(|e| format!("WIC 图像源转换失败: {e}"))?;
    let (src_width, src_height) = get_wic_source_size(frame)?;
    let crop = build_cover_crop_rect(src_width, src_height);
    let clipper = unsafe { factory.CreateBitmapClipper() }
        .map_err(|e| format!("创建 WIC 裁切器失败: {e}"))?;

    unsafe {
        clipper
            .Initialize(&source, &crop)
            .map_err(|e| format!("初始化 WIC 裁切器失败: {e}"))?;
    }

    let clipped_source: IWICBitmapSource = clipper
        .cast()
        .map_err(|e| format!("WIC 裁切器图像源转换失败: {e}"))?;
    let scaler =
        unsafe { factory.CreateBitmapScaler() }.map_err(|e| format!("创建 WIC 缩放器失败: {e}"))?;

    unsafe {
        scaler
            .Initialize(
                &clipped_source,
                THUMBNAIL_SIZE,
                THUMBNAIL_SIZE,
                WICBitmapInterpolationModeFant,
            )
            .map_err(|e| format!("初始化 WIC 缩放器失败: {e}"))?;
    }

    let stride = THUMBNAIL_SIZE * 3;
    let mut buffer = vec![0; (stride * THUMBNAIL_SIZE) as usize];

    unsafe {
        let scaler_source: IWICBitmapSource = scaler
            .cast()
            .map_err(|e| format!("WIC 缩放器图像源转换失败: {e}"))?;
        let converter = factory
            .CreateFormatConverter()
            .map_err(|e| format!("创建 WIC 格式转换器失败: {e}"))?;
        converter
            .Initialize(
                &scaler_source,
                &GUID_WICPixelFormat24bppRGB,
                WICBitmapDitherTypeNone,
                None,
                0.0,
                WICBitmapPaletteTypeCustom,
            )
            .map_err(|e| format!("初始化 WIC 格式转换器失败: {e}"))?;
        let converter_source: IWICBitmapSource = converter
            .cast()
            .map_err(|e| format!("WIC 格式转换器图像源转换失败: {e}"))?;
        converter_source
            .CopyPixels(std::ptr::null(), stride, &mut buffer)
            .map_err(|e| format!("WIC 缩放复制像素失败: {e}"))?;
    }

    image::RgbImage::from_raw(THUMBNAIL_SIZE, THUMBNAIL_SIZE, buffer)
        .ok_or_else(|| "创建 WIC 缩略图缓冲区失败".to_string())
}

#[cfg(target_os = "windows")]
fn get_wic_source_size(source: &IWICBitmapFrameDecode) -> Result<(u32, u32), String> {
    let source: IWICBitmapSource = source
        .cast()
        .map_err(|e| format!("WIC 图像源转换失败: {e}"))?;
    let mut width = 0;
    let mut height = 0;

    unsafe {
        source
            .GetSize(&mut width, &mut height)
            .map_err(|e| format!("读取 WIC 图片尺寸失败: {e}"))?;
    }

    Ok((width, height))
}

#[cfg(target_os = "windows")]
fn build_cover_crop_rect(
    src_width: u32,
    src_height: u32,
) -> windows::Win32::Graphics::Imaging::WICRect {
    if src_width == 0 || src_height == 0 {
        return windows::Win32::Graphics::Imaging::WICRect {
            X: 0,
            Y: 0,
            Width: THUMBNAIL_SIZE as i32,
            Height: THUMBNAIL_SIZE as i32,
        };
    }

    let src_ratio = src_width as f64 / src_height as f64;
    let dst_ratio = 1.0_f64;

    if src_ratio > dst_ratio {
        let crop_width = (src_height as f64 * dst_ratio).round() as u32;
        let x = ((src_width - crop_width) / 2) as i32;
        windows::Win32::Graphics::Imaging::WICRect {
            X: x,
            Y: 0,
            Width: crop_width as i32,
            Height: src_height as i32,
        }
    } else {
        let crop_height = (src_width as f64 / dst_ratio).round() as u32;
        let y = ((src_height - crop_height) / 2) as i32;
        windows::Win32::Graphics::Imaging::WICRect {
            X: 0,
            Y: y,
            Width: src_width as i32,
            Height: crop_height as i32,
        }
    }
}

#[cfg(target_os = "windows")]
fn ensure_thumbnail_canvas(image: &image::RgbImage) -> Result<image::RgbImage, String> {
    if image.width() == THUMBNAIL_SIZE && image.height() == THUMBNAIL_SIZE {
        return Ok(image.clone());
    }

    let resized = resize_rgb8_thumbnail(image.width(), image.height(), image.clone().into_raw())?;
    Ok(resized)
}

struct CachePaths {
    image_path: PathBuf,
    preview_path: PathBuf,
    thumbnail_path: PathBuf,
}
