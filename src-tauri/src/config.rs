use base64::Engine as _;
use tauri::Manager as _;

use crate::prelude::*;

type ConfigMap = std::collections::HashMap<String, String>;

#[derive(Debug)]
pub struct Config {
    config_map: ConfigMap,
    path: std::path::PathBuf,
}

impl Config {
    pub fn new(path: std::path::PathBuf) -> Result<Self, AppError> {
        let config_map = load_config_file(&path);

        if let Err(AppError::ConfigExistance(_)) = config_map {
            return Ok(Self {
                config_map: ConfigMap::new(),
                path,
            });
        }

        let config_map = config_map?;

        Ok(Self { config_map, path })
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.config_map.get(key).map(|s| s.as_str())
    }

    pub fn set(&mut self, key: String, value: String) -> Result<(), AppError> {
        self.config_map.insert(key, value);
        save_config_file(&self.path, &self.config_map)
    }

    pub fn write_vrchat_api_key(&mut self, vrchat_api_key: &str) -> Result<(), AppError> {
        let encrypted = crate::crypt::crypt(vrchat_api_key.as_bytes())?;

        let encoded = base64::prelude::BASE64_STANDARD.encode(encrypted);

        self.set("vrchat_api_key_crypted".to_string(), encoded)?;

        Ok(())
    }

    pub fn read_vrchat_api_key(&self) -> Result<Option<String>, AppError> {
        let Some(vrchat_api_key) = self.get("vrchat_api_key_crypted").map(|v| v.to_string()) else {
            return Ok(None);
        };

        let encrypted = base64::prelude::BASE64_STANDARD
            .decode(vrchat_api_key.as_bytes())
            .map_err(AppError::from_error_with_message(
                "Failed to decode VRChat key",
            ))?;

        let decrypted = crate::crypt::decrypt(encrypted.as_slice())?;

        let may_api_key = std::str::from_utf8(decrypted.as_slice()).map_err(
            AppError::from_error_with_message("Failed to decrypt VRChat API key"),
        )?;

        Ok(Some(may_api_key.to_string()))
    }
}

fn load_config_file(config_path: &std::path::Path) -> Result<ConfigMap, AppError> {
    if !config_path.exists() {
        return Err(AppError::ConfigExistance(format!(
            "Config file does not exist: {:?}",
            config_path
        )));
    }

    let mut ini = ini::configparser::ini::Ini::new();

    let loaded_ini = ini
        .load(path_as_string(config_path)?)
        .map_err(|e| AppError::Unknown(format!("Failed to read configuration file: {}", e)))?;

    let config: ConfigMap = loaded_ini
        .get("config")
        .ok_or(AppError::Unknown(
            "Invalid config file(No [config] section)".to_string(),
        ))?
        .iter()
        .filter_map(|(key, value)| value.as_ref().map(|v| (key.clone(), v.clone())))
        .collect();

    Ok(config)
}

fn save_config_file(config_path: &std::path::Path, config: &ConfigMap) -> Result<(), AppError> {
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(AppError::from_error_with_message(
                "Failed to create config directory",
            ))?;
        }
    } else {
        return Err(AppError::ConfigDirectoryExistance(
            "Config file has no parent directory".to_string(),
        ));
    }

    let mut ini = ini::configparser::ini::Ini::new();

    for (key, value) in config.iter() {
        ini.set("config", key, Some(value.clone()));
    }

    ini.write(path_as_string(config_path)?)
        .map_err(|e| AppError::Unknown(format!("Failed to write configuration file: {}", e)))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn config_file_path(handle: tauri::AppHandle) -> Result<std::path::PathBuf, AppError> {
    let config_path = handle
        .path()
        .app_config_dir()
        .map_err(AppError::from_error_with_message(
            "Failed to get app config directory",
        ))?
        .join("config.ini");

    Ok(config_path)
}

#[tauri::command]
#[specta::specta]
pub fn reset_config(handle: tauri::AppHandle) -> Result<(), AppError> {
    let config_path = config_file_path(handle)?;

    if config_path.exists() {
        std::fs::remove_file(&config_path).map_err(AppError::from_error_with_message(
            "Failed to remove configuration file",
        ))?;
    }

    Ok(())
}

fn path_as_string(path: &std::path::Path) -> Result<&str, AppError> {
    let config_path_str = path
        .as_os_str()
        .to_str()
        .ok_or(AppError::Unknown("Failed to parse config path".to_string()))?;

    Ok(config_path_str)
}
