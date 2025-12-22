//! Placeholder module for custom Tauri commands.
//!
//! Possible future commands:
//! - Start/stop native audio streaming
//! - Configure audio devices
//! - Perform offline transcription, etc.

/// Shared application state placeholder.
#[derive(Default)]
pub struct AppState;

#[tauri::command]
pub async fn ping_backend() -> String {
    "pong".to_string()
}

/// Helper to create the application state for Tauri.
pub fn build_state() -> AppState {
    AppState::default()
}

