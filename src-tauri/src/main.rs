mod commands;

fn main() {
    tauri::Builder::default()
        .manage(commands::build_state())
        .invoke_handler(tauri::generate_handler![commands::ping_backend])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}