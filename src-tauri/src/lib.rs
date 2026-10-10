mod comark;
mod config;
mod db;
mod exif;
mod font;
mod fs;
mod system;
mod window;

use tauri::Manager;

struct StartupLogger;

impl log::Log for StartupLogger {
    fn enabled(&self, metadata: &log::Metadata<'_>) -> bool {
        metadata.level() <= log::Level::Warn
    }

    fn log(&self, record: &log::Record<'_>) {
        if self.enabled(record.metadata()) {
            eprintln!(
                "[{}] {}: {}",
                record.level(),
                record.target(),
                record.args()
            );
        }
    }

    fn flush(&self) {}
}

static STARTUP_LOGGER: StartupLogger = StartupLogger;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if log::set_logger(&STARTUP_LOGGER).is_ok() {
        log::set_max_level(log::LevelFilter::Warn);
    }
    println!("[startup] Initializing thumbnail scheduler");
    let thumbnail_scheduler = fs::create_thumbnail_scheduler();

    println!("[startup] Initializing Tauri and main webview");
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .manage(thumbnail_scheduler)
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DATABASE_URL, db::migrations())
                .build(),
        )
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| std::io::Error::other("主窗口不存在"))?;
            // Runtime 可能保留创建失败的逻辑句柄；查询原生窗口以避免无窗口进程空跑。
            let visible = window.is_visible()?;
            println!("[startup] Main window created; visible={visible}; loading configuration");
            let config = config::get_config(app.handle().clone()).unwrap_or_default();
            if config.cache.auto_cleanup_on_startup {
                let _ = fs::auto_cleanup_cache(&config.cache.directory, config.cache.max_age_days);
            }
            // 导出目录可能还没被创建过（默认目录是新建的，或者用户刚改过），
            // 先建出来，这样「打开」按钮和导出完成提示里的目录链接立刻可用
            let _ = std::fs::create_dir_all(&config.output.default_path);
            window::apply_main_window_frame_mode(app.handle(), &config.window_frame_mode)?;

            println!("[startup] Application setup complete");
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fs::read_image_file,
            fs::list_image_files_in_directory,
            fs::write_file,
            fs::convert_heic_to_jpeg,
            fs::import_image_to_cache,
            fs::import_image_bytes_to_cache,
            fs::get_cache_overview,
            fs::clear_cache,
            fs::cleanup_cache,
            fs::path_exists,
            fs::open_directory,
            config::get_config,
            config::update_config,
            config::get_device_id,
            window::apply_window_frame_mode,
            comark::list_comark_templates,
            comark::upsert_comark_template,
            comark::remove_comark_template,
            comark::set_comark_template_enabled,
            exif::read_exif,
            exif::extract_jpeg_exif,
            exif::insert_jpeg_exif,
            font::list_system_fonts,
            font::inline_system_font,
            font::import_font_file,
            font::import_font_bytes,
            font::remove_font_file,
            font::inline_imported_font,
            system::get_app_info,
            system::open_external,
        ])
        .run(context)
        .expect("error while running tauri application");
}
