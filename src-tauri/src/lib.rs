use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

use crate::prelude::*;

mod build_config;
mod capture;
mod error;
mod file;
mod image;
mod image_to_image;
mod image_to_video;
mod prelude;
mod progress;
mod uploader;
mod vrchat_print;

fn generate_binding_file(builder: &tauri_specta::Builder<tauri::Wry>) {
    let binding_str = builder
        .export_str(specta_typescript::Typescript::default())
        .expect("Failed to export typescript bindings");

    let header_str = "// @ts-nocheck";

    std::fs::write(
        "../src/bindings.gen.ts",
        format!("{}\n{}", header_str, binding_str),
    )
    .expect("Failed to write typescript bindings");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        // Then register them (separated by a comma)
        .commands(tauri_specta::collect_commands![
            get_args,
            open_resource_dir,
            load_config_file,
            save_config_file,
            get_system_locale,
            image::is_able_to_read_image_file,
            image_to_video::upload_image_to_video_server,
            image_to_image::upload_image_to_image_server,
            vrchat_print::upload_image_to_vrchat_print,
            uploader::register_anonymously,
            uploader::get_tos_and_version,
            capture::start_capture,
            capture::stop_capture,
            capture::finish_capture_with_cropped_rect,
            capture::get_capture_url_command
        ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
    generate_binding_file(&builder);

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
#[specta::specta]
fn get_args() -> Vec<String> {
    std::env::args().collect()
}

#[tauri::command]
#[specta::specta]
fn open_resource_dir(handle: tauri::AppHandle) -> Result<(), AppError> {
    let resource_dir = handle
        .path()
        .resource_dir()
        .map_err(AppError::from_error_with_message(
            "Failed to get resource directory",
        ))?;

    handle
        .opener()
        .open_path(resource_dir.as_os_str().to_string_lossy(), None::<&str>)
        .map_err(AppError::from_error_with_message(
            "Failed to open resource directory",
        ))?;

    Ok(())
}

#[cfg(test)]
mod test {
    use crate::{
        build_config::{get_test_api_key, get_test_uploader_url_base_url},
        image::resize_image_letterboxed,
        image_to_image::upload_image_to_image_server_internal,
        image_to_video::{encode_image_to_video, upload_image_to_video_server_internal},
        uploader::{get_tos_and_version, register_anonymously},
    };

    #[test]
    fn test_resize_image() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let output_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/result/output_image.png";

        let result = resize_image_letterboxed(&input_file, &output_file, 1280, 720);

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[test]
    fn test_image_to_video() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let output_video_path =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/result/output.mp4";

        let ffmpeg_path = std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/resources/ffmpeg.exe";

        let rt = tokio::runtime::Runtime::new().unwrap();

        let result = rt.block_on(encode_image_to_video(
            &ffmpeg_path,
            &input_file,
            &output_video_path,
        ));

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upload_video() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let ffmpeg_path = std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/resources/ffmpeg.exe";

        let result = upload_image_to_video_server_internal(
            &ffmpeg_path,
            &input_file,
            get_test_api_key(),
            get_test_uploader_url_base_url(),
            None,
        )
        .await;

        eprintln!("Result: {:?}", result);

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upload_image() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let result = upload_image_to_image_server_internal(
            &input_file,
            get_test_api_key(),
            get_test_uploader_url_base_url(),
            None,
        )
        .await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_load_tos() {
        let result = get_tos_and_version(get_test_uploader_url_base_url()).await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously() {
        let result = register_anonymously(1, get_test_uploader_url_base_url()).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously_fail() {
        let result = register_anonymously(9999, get_test_uploader_url_base_url()).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_err());
    }
}

#[tauri::command]
#[specta::specta]
fn load_config_file(handle: tauri::AppHandle) -> Result<String, AppError> {
    let config_path = config_file_path(handle)?;

    if !config_path.exists() {
        return Err(AppError::ConfigExistance(format!(
            "Config file does not exist: {:?}",
            config_path
        )));
    }

    let contents = std::fs::read_to_string(&config_path).map_err(
        AppError::from_error_with_message("Failed to read configuration file"),
    )?;

    Ok(contents)
}

#[tauri::command]
#[specta::specta]
fn save_config_file(handle: tauri::AppHandle, contents: &str) -> Result<(), AppError> {
    let config_path = config_file_path(handle)?;

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

    std::fs::write(&config_path, contents).map_err(AppError::from_error_with_message(
        "Failed to write configuration file",
    ))?;

    Ok(())
}

fn config_file_path(handle: tauri::AppHandle) -> Result<PathBuf, AppError> {
    let config_path = handle
        .path()
        .app_config_dir()
        .map_err(AppError::from_error_with_message(
            "Failed to get app config directory",
        ))?
        .join("config.json");

    Ok(config_path)
}

#[tauri::command]
#[specta::specta]
fn get_system_locale() -> String {
    tauri_plugin_os::locale().unwrap_or("en".to_string())
}
