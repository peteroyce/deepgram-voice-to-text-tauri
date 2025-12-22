mod audio;
mod commands;

use commands::ping_backend;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Ensure our placeholder audio module is referenced so it's kept in the build.
    audio::init_audio();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // TODO: Add additional commands here as they are implemented.
        .invoke_handler(tauri::generate_handler![ping_backend])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
