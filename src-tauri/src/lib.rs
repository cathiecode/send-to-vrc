use std::path::PathBuf;

use image::GenericImageView;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::error::AppError;

mod build_config;
mod error;

#[derive(Clone, Serialize)]
enum Progress {
    Starting,
    Compressing,
    Uploading,
}

type ProgressCallback = Box<dyn Fn(Progress) + Send + Sync + 'static>;

fn create_progress_callback(handle: &tauri::AppHandle) -> ProgressCallback {
    let handle = handle.clone();
    Box::new(move |progress| {
        handle
            .emit("progress", progress)
            .unwrap_or_else(|e| debug!("Failed to emit progress event: {:?}", e));
    })
}

fn generate_binding_file(builder: &tauri_specta::Builder<tauri::Wry>) {
    #[cfg(debug_assertions)] // <- Only export on non-release builds
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
            is_able_to_read_image_file,
            upload_image_to_video_server,
            upload_image_to_image_server,
            upload_image_to_vrchat_print,
            load_config_file,
            save_config_file,
            register_anonymously,
            get_tos_and_version,
        ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
    generate_binding_file(&builder);

    tauri::Builder::default()
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

#[tauri::command]
#[specta::specta]
async fn upload_image_to_video_server(
    handle: tauri::AppHandle,
    file_path: &str,
    api_key: &str,
) -> Result<String, AppError> {
    let ffmpeg_path = handle
        .path()
        .resolve("resources/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
        .map_err(AppError::from_error_with_message(
            "Failed to resolve ffmpeg path",
        ))?
        .to_string_lossy()
        .into_owned();

    let progress_callback = Some(create_progress_callback(&handle));

    upload_image_to_video_server_internal(
        &ffmpeg_path,
        file_path,
        api_key,
        progress_callback.as_ref(),
    )
    .await
}

async fn upload_image_to_video_server_internal(
    ffmpeg_path: &str,
    file_path: &str,
    api_key: &str,
    progress_callback: Option<&ProgressCallback>,
) -> Result<String, AppError> {
    if let Some(cb) = progress_callback {
        cb(Progress::Starting)
    }
    let letterboxed_image_path = temp_file_path("letterboxed_image.png")
        .to_string_lossy()
        .into_owned();

    let output_video_path = temp_file_path("output.mp4").to_string_lossy().into_owned();

    info!("FFmpeg path: {}", ffmpeg_path);
    debug!("Input image path: {}", file_path);
    debug!("Letterboxed image path: {}", letterboxed_image_path);
    debug!("Output video path: {}", output_video_path);

    let (width, height) = (1280, 720);

    if let Some(cb) = progress_callback {
        cb(Progress::Compressing)
    }
    resize_image_letterboxed(file_path, &letterboxed_image_path, width, height)?;
    encode_image_to_video(ffmpeg_path, &letterboxed_image_path, &output_video_path).await?;

    if let Some(cb) = progress_callback {
        cb(Progress::Uploading)
    }
    let url = upload_video_to_video_server(&output_video_path, api_key).await?;

    Ok(url)
}

#[tauri::command]
#[specta::specta]
async fn upload_image_to_image_server(
    handle: tauri::AppHandle,
    file_path: &str,
    api_key: &str,
) -> Result<String, AppError> {
    let progress_callback = Some(create_progress_callback(&handle));

    upload_image_to_image_server_internal(file_path, api_key, progress_callback.as_ref()).await
}

async fn upload_image_to_image_server_internal(
    file_path: &str,
    api_key: &str,
    progress_callback: Option<&ProgressCallback>,
) -> Result<String, AppError> {
    if let Some(cb) = progress_callback {
        cb(Progress::Starting)
    }
    let resized_image_path = temp_file_path("resized_image.png")
        .to_string_lossy()
        .into_owned();

    let (width, height) = (1920, 1920);

    if let Some(cb) = progress_callback {
        cb(Progress::Compressing)
    }

    resize_image(file_path, &resized_image_path, width, height)
        .map_err(AppError::from_error_with_message("Failed to resize image"))?;

    if let Some(cb) = progress_callback {
        cb(Progress::Uploading)
    }
    let url = upload_image_file_to_image_server(&resized_image_path, api_key).await?;

    Ok(url)
}

#[tauri::command]
#[specta::specta]
async fn upload_image_to_vrchat_print(
    file_path: &str,
    vrchat_api_key: String,
) -> Result<(), AppError> {
    let path = std::path::Path::new(file_path);

    if !path.exists() {
        return Err(AppError::Unknown("File does not exist".to_string()));
    }

    send_file_to_print(path, vrchat_api_key).await
}

#[tauri::command]
#[specta::specta]
async fn is_able_to_read_image_file(file_path: &str) -> Result<bool, ()> {
    Ok(image::open(file_path).is_ok())
}

async fn send_file_to_print(
    file_path: &std::path::Path,
    vrchat_api_key: String,
) -> Result<(), AppError> {
    let bytes = std::fs::read(file_path).map_err(AppError::from_error_with_message(
        "failed to get file bytes",
    ))?;

    debug!("Read {} bytes from file {:?}", bytes.len(), file_path);

    let client = reqwest::Client::new();

    let form = reqwest::multipart::Form::new()
        .part(
            "image",
            reqwest::multipart::Part::bytes(bytes)
                .file_name("image")
                .mime_str("image/png")
                .map_err(AppError::from_error_with_message(
                    "Failed to create file part",
                ))?,
        )
        .text(
            "timestamp",
            format!("{}", chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ")),
        )
        .text("note", "Uploaded via Send to VRC");

    debug!("Form: {:?}", form);

    let response = client
        .post("https://api.vrchat.cloud/api/1/prints")
        .header("Cookie", format!("auth={}", vrchat_api_key))
        .header("User-Agent", "SendToVRC/1.0 cathiecode@gmail.com")
        .multipart(form)
        .send()
        .await
        .map_err(AppError::from_error_with_message("Failed to upload file"))?;

    debug!("Response: {:?}", response);

    if !response.status().is_success() {
        let text = response.text().await;
        // log::debug!("Response text: {:?}", text);
        return Err(AppError::Unknown(format!(
            "Failed to upload file: {:?}",
            text
        )));
    }

    info!("File uploaded successfully.");

    Ok(())
}

fn resize_image_letterboxed(
    image_path: &str,
    output_path: &str,
    width: u32,
    height: u32,
) -> Result<(), AppError> {
    // read the image with "image" crate
    let img = image::open(image_path)
        .map_err(AppError::from_error_with_message("Failed to open image"))?;

    // resize the image
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    // render letterboxed image with "tiny-skia" crate
    let mut canvas = tiny_skia::Pixmap::new(width, height)
        .ok_or(AppError::Unknown("Failed to create canvas".to_string()))?;
    canvas.fill(tiny_skia::Color::WHITE); // fill with white background
    let (resized_width, resized_height) = resized.dimensions();
    let x_offset = (width - resized_width) / 2;
    let y_offset = (height - resized_height) / 2;
    let resized_rgba = resized.to_rgba8();

    let size = tiny_skia::IntSize::from_wh(resized_width, resized_height).ok_or(
        AppError::Unknown("Failed to create pixmap with input dimensions".to_string()),
    )?;

    let resized_pixmap = tiny_skia::Pixmap::from_vec(resized_rgba.into_raw(), size).ok_or(
        AppError::Unknown("Failed to create pixmap from resized image".to_string()),
    )?;

    canvas.draw_pixmap(
        x_offset as i32,
        y_offset as i32,
        resized_pixmap.as_ref(),
        &tiny_skia::PixmapPaint::default(),
        tiny_skia::Transform::identity(),
        None,
    );

    canvas
        .save_png(output_path)
        .map_err(AppError::from_error_with_message(
            "Failed to save resized image",
        ))?;

    Ok(())
}

fn resize_image(
    image_path: &str,
    output_path: &str,
    width: u32,
    height: u32,
) -> Result<(), AppError> {
    // read the image with "image" crate
    let img = image::open(image_path)
        .map_err(AppError::from_error_with_message("Failed to open image"))?;

    // resize the image
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    // save the resized image
    resized
        .save(output_path)
        .map_err(AppError::from_error_with_message(
            "Failed to save resized image",
        ))?;

    Ok(())
}

#[cfg(test)]
mod test {
    use crate::{build_config::get_test_api_key, upload_image_to_video_server_internal};

    #[test]
    fn test_resize_image() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let output_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/result/output_image.png";

        let result = super::resize_image_letterboxed(&input_file, &output_file, 1280, 720);

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

        let result = rt.block_on(super::encode_image_to_video(
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

        let result =
            super::upload_image_to_image_server_internal(&input_file, get_test_api_key(), None)
                .await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_load_tos() {
        let result = super::get_tos_and_version().await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously() {
        let result = super::register_anonymously(1).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously_fail() {
        let result = super::register_anonymously(9999).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_err());
    }
}

async fn encode_image_to_video(
    ffmpeg_path: &str,
    image_file_path: &str,
    output_video_path: &str,
) -> Result<(), AppError> {
    // Use ffmpeg to encode the image into a video

    let status = tokio::process::Command::new(ffmpeg_path)
        .args([
            "-y",
            "-loop",
            "1",
            "-r",
            "1",
            "-i",
            image_file_path,
            "-c:v",
            "libx264",
            "-t",
            "60",
            "-pix_fmt",
            "yuv420p",
            output_video_path,
        ])
        .status()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to execute ffmpeg",
        ))?;

    if !status.success() {
        return Err(AppError::Unknown(format!(
            "ffmpeg exited with status {}",
            status
        )));
    }

    Ok(())
}

#[derive(serde::Deserialize)]
struct UploaderResponse {
    pub url: String,
}

async fn upload_file_to_uploader(
    file_path: &str,
    api_key: &str,
    ext: &str,
) -> Result<String, AppError> {
    info!("Uploading file: {}", file_path);

    let length = std::fs::metadata(file_path)
        .map_err(AppError::from_error_with_message(
            "Failed to get file metadata",
        ))?
        .len();

    let reader = tokio::fs::File::open(file_path)
        .await
        .map_err(AppError::from_error_with_message("Failed to open file"))?;

    let client = reqwest::Client::new();

    let result = client
        .post(format!(
            "{}/upload?ext={}",
            build_config::get_uploader_url_base_url(),
            ext
        ))
        .body(reader)
        .header("Content-Length", length)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    if let Err(e) = result {
        return Err(AppError::from_error_with_message("Failed to file")(e));
    }

    let response = result.unwrap();

    if !response.status().is_success() {
        if response.status() == reqwest::StatusCode::FORBIDDEN {
            return Err(AppError::UploaderAuthRequired(
                "Authentication required for uploader".to_string(),
            ));
        }

        return Err(AppError::Unknown(format!(
            "File upload failed with status: {}, {}",
            response.status(),
            response
                .text()
                .await
                .unwrap_or("(Failed to read response text)".into())
        )));
    }

    let text = response
        .text()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to read response text",
        ))?;

    let upload_response: UploaderResponse = serde_json::from_str(&text).map_err(
        AppError::from_error_with_message("Failed to parse response JSON"),
    )?;

    info!("File uploaded successfully: {}", upload_response.url);

    Ok(upload_response.url)
}

async fn upload_video_to_video_server(
    video_file_path: &str,
    api_key: &str,
) -> Result<String, AppError> {
    upload_file_to_uploader(video_file_path, api_key, "mp4").await
}

async fn upload_image_file_to_image_server(
    image_file_path: &str,
    api_key: &str,
) -> Result<String, AppError> {
    upload_file_to_uploader(image_file_path, api_key, "png").await
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
struct Tos {
    version: i32,
    content: String,
}

#[tauri::command]
#[specta::specta]
async fn get_tos_and_version() -> Result<Tos, AppError> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!(
            "{}/registration/tos",
            build_config::get_uploader_url_base_url()
        ))
        .send()
        .await
        .map_err(AppError::from_error_with_message("Failed to get ToS"))?;

    if !response.status().is_success() {
        return Err(AppError::Unknown(format!(
            "Failed to get ToS: {}",
            response.status()
        )));
    }

    let text = response
        .text()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to read ToS response text",
        ))?;

    let tos: Tos = serde_json::from_str(&text).map_err(AppError::from_error_with_message(
        "Failed to parse ToS JSON",
    ))?;

    Ok(tos)
}

#[derive(Serialize)]
struct AnonymousRegisterRequestTos {
    accept: bool,
    version: i32,
}

#[derive(Serialize)]
struct AnonymousRegisterRequest {
    tos: AnonymousRegisterRequestTos,
    date: String,
}

#[derive(Deserialize)]
struct AnonymousRegisterResponse {
    token: String,
}

#[tauri::command]
#[specta::specta]
async fn register_anonymously(accepted_tos_version: i32) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let body = serde_json::to_string(&AnonymousRegisterRequest {
        tos: AnonymousRegisterRequestTos {
            accept: true,
            version: accepted_tos_version,
        },
        // 20250924T015117+0900
        date: chrono::Utc::now().format("%Y%m%dT%H%M%S%z").to_string(),
    })
    .map_err(AppError::from_error_with_message(
        "Failed to serialize anonymous registration request",
    ))?;

    let result = client
        .post(format!(
            "{}/registration/anonymous",
            build_config::get_uploader_url_base_url()
        ))
        .body(body)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send anonymous registration request",
        ))?;

    if !result.status().is_success() {
        return Err(AppError::Unknown(format!(
            "Anonymous registration failed: {}",
            result.status()
        )));
    }

    let text = result
        .text()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to read anonymous registration response text",
        ))?;

    let response: AnonymousRegisterResponse = serde_json::from_str(&text).map_err(
        AppError::from_error_with_message("Failed to parse anonymous registration response JSON"),
    )?;

    info!(
        "Anonymous registration successful. Token: {}",
        response.token
    );

    Ok(response.token)
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

fn temp_file_path(name: &str) -> PathBuf {
    std::env::temp_dir().join(name)
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
