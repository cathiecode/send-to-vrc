use crate::error::AppError;

pub struct AppData {
    config: Result<std::sync::Arc<std::sync::Mutex<crate::config::Config>>, AppError>,
}

impl AppData {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let config =
            crate::config::Config::new(crate::config::config_file_path(app_handle).unwrap())
                .map(std::sync::Mutex::new)
                .map(std::sync::Arc::new);

        Self { config }
    }

    pub fn config(&self) -> std::sync::Arc<std::sync::Mutex<crate::config::Config>> {
        self.config.as_ref().unwrap().clone()
    }

    pub fn lock_config(&self) -> std::sync::MutexGuard<'_, crate::config::Config> {
        self.config.as_ref().unwrap().lock().unwrap()
    }

    pub fn is_healthy(&self) -> bool {
        self.config.is_ok()
    }
}
