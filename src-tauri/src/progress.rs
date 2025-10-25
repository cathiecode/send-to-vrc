use crate::prelude::*;
use tauri::Emitter as _;

#[derive(Clone, serde::Serialize)]
pub enum Progress {
    Starting,
    Compressing,
    Uploading,
}

pub type ProgressCallback = Box<dyn Fn(Progress) + Send + Sync + 'static>;

pub fn create_progress_callback(handle: &tauri::AppHandle) -> ProgressCallback {
    let handle = handle.clone();
    Box::new(move |progress| {
        handle
            .emit("progress", progress)
            .unwrap_or_else(|e| debug!("Failed to emit progress event: {:?}", e));
    })
}
