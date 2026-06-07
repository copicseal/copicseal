mod config;
mod exif;
mod font;
mod fs;
mod system;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fs::read_image_file,
            config::get_config,
            config::update_config,
            exif::read_exif,
            font::list_system_fonts,
            system::get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
