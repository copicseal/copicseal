mod comark;
mod config;
mod db;
mod exif;
mod font;
mod fs;
mod system;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DATABASE_URL, db::migrations())
                .build(),
        )
        .setup(|app| {
            let config = config::get_config(app.handle().clone()).unwrap_or_default();
            if config.cache.auto_cleanup_on_startup {
                let _ = fs::auto_cleanup_cache(&config.cache.directory, config.cache.max_age_days);
            }
            window::apply_main_window_frame_mode(app.handle(), &config.window_frame_mode)?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fs::read_image_file,
            fs::list_image_files_in_directory,
            fs::write_file,
            fs::convert_heic_to_png,
            fs::import_image_to_cache,
            fs::import_image_bytes_to_cache,
            fs::get_cache_overview,
            fs::clear_cache,
            fs::cleanup_cache,
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
            system::get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
