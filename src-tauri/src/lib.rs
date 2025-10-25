use std::{
    cmp,
    path::{Path, PathBuf},
    thread::sleep,
    time::Duration,
};

use image::GenericImageView;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{window::Color, AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use tokio::sync::broadcast::{Receiver, Sender};
use windows_capture::{
    dxgi_duplication_api::DxgiDuplicationApi, encoder::ImageFormat, monitor::Monitor,
};

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
            get_system_locale,
            start_capture,
            stop_capture,
            finish_capture_with_cropped_rect,
            get_capture_url_command
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

#[tauri::command]
#[specta::specta]
async fn upload_image_to_video_server(
    handle: tauri::AppHandle,
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
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
        uploader_base_url,
        progress_callback.as_ref(),
    )
    .await
}

async fn upload_image_to_video_server_internal(
    ffmpeg_path: &str,
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
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
    let url = upload_video_to_video_server(&output_video_path, api_key, uploader_base_url).await?;

    Ok(url)
}

#[tauri::command]
#[specta::specta]
async fn upload_image_to_image_server(
    handle: tauri::AppHandle,
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
) -> Result<String, AppError> {
    let progress_callback = Some(create_progress_callback(&handle));

    upload_image_to_image_server_internal(
        file_path,
        api_key,
        uploader_base_url,
        progress_callback.as_ref(),
    )
    .await
}

async fn upload_image_to_image_server_internal(
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
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
    let url =
        upload_image_file_to_image_server(&resized_image_path, api_key, uploader_base_url).await?;

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

    let letterboxed_image_path = temp_file_path("letterboxed_image.png");

    resize_image_vrchat_print(file_path, &letterboxed_image_path.to_string_lossy())?;

    send_file_to_print(&letterboxed_image_path, vrchat_api_key).await
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

// NOTE: VRChat print uploading requires a png image that sized 2048x1440, and its main image scaled to be 1920x1080 and placed at (64,96).
fn resize_image_vrchat_print(image_path: &str, output_path: &str) -> Result<(), AppError> {
    let whole_width = 2048;
    let whole_height = 1440;
    let width = 1920;
    let height = 1080;
    let print_offset_x = 64;
    let print_offset_y = 69;
    // read the image with "image" crate
    let input_image = image::open(image_path)
        .map_err(AppError::from_error_with_message("Failed to open image"))?;

    // resize the image
    let image = input_image.resize(width, height, image::imageops::FilterType::Lanczos3);

    // render letterboxed image with "tiny-skia" crate
    let mut canvas = tiny_skia::Pixmap::new(whole_width, whole_height)
        .ok_or(AppError::Unknown("Failed to create canvas".to_string()))?;
    canvas.fill(tiny_skia::Color::WHITE); // fill with white background
    let (resized_width, resized_height) = image.dimensions();
    let x_offset = (width - resized_width) / 2 + print_offset_x;
    let y_offset = (height - resized_height) / 2 + print_offset_y;
    let resized_rgba = image.to_rgba8();

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
    use crate::{
        build_config::{get_test_api_key, get_test_uploader_url_base_url},
        upload_image_to_video_server_internal,
    };

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

        let result = super::upload_image_to_image_server_internal(
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
        let result = super::get_tos_and_version(get_test_uploader_url_base_url()).await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously() {
        let result = super::register_anonymously(1, get_test_uploader_url_base_url()).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_register_anonymously_fail() {
        let result = super::register_anonymously(9999, get_test_uploader_url_base_url()).await;
        eprintln!("Result: {:?}", result);
        assert!(result.is_err());
    }
}

// Windows-specific: to prevent opening a console window
const DETACHED_PROCESS: u32 = 0x00000008;

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
        .creation_flags(DETACHED_PROCESS)
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
    uploader_base_url: &str,
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
        .post(format!("{}/upload?ext={}", uploader_base_url, ext))
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
    uploader_base_url: &str,
) -> Result<String, AppError> {
    upload_file_to_uploader(video_file_path, api_key, "mp4", uploader_base_url).await
}

async fn upload_image_file_to_image_server(
    image_file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
) -> Result<String, AppError> {
    upload_file_to_uploader(image_file_path, api_key, "png", uploader_base_url).await
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
struct Tos {
    version: i32,
    content: String,
}

#[tauri::command]
#[specta::specta]
async fn get_tos_and_version(uploader_base_url: &str) -> Result<Tos, AppError> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/registration/tos", uploader_base_url))
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
async fn register_anonymously(
    accepted_tos_version: i32,
    uploader_base_url: &str,
) -> Result<String, AppError> {
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
        .post(format!("{}/registration/anonymous", uploader_base_url))
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

#[tauri::command]
#[specta::specta]
fn get_system_locale() -> String {
    tauri_plugin_os::locale().unwrap_or("en".to_string())
}

static CAPTURE_THREAD_REQUEST_SENDER: std::sync::OnceLock<Sender<CaptureThreadRequest>> =
    std::sync::OnceLock::new();

#[derive(Debug, Clone, PartialEq)]
enum CaptureThreadRequest {
    Start,
    Quit,
}

fn create_capture_thread(app_handle: AppHandle) -> Sender<CaptureThreadRequest> {
    let (tx, rx) = tokio::sync::broadcast::channel::<CaptureThreadRequest>(10);

    std::thread::spawn(move || {
        capture_thread(app_handle, rx).unwrap();
    });

    tx
}

fn capture_thread(
    app_handle: AppHandle,
    mut request_receiver: Receiver<CaptureThreadRequest>,
) -> Result<String, String> {
    loop {
        loop {
            if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Start {
                break;
            };
        }

        let webview = app_handle.get_webview_window("main");

        if let Some(window) = &webview {
            if let Err(error) = window.hide() {
                info!("Failed to hide main window: {:?}", error);
            }
        }

        sleep(Duration::from_millis(500));

        // capture every screens
        let monitors = Monitor::enumerate().unwrap();
        for (i, monitor) in monitors.iter().enumerate() {
            // NOTE: 2nd argument must be matched with label of WebviewWindow
            let path = get_capture_url(&app_handle, format!("capture_{}", i))
                .map_err(|e| format!("Failed to get temp file path: {e}"))?;

            match capture_monitor(&path, *monitor) {
                Ok(_) => info!("Captured monitor {} to {:?}", i, path),
                Err(e) => info!("Failed to capture monitor {}: {}", i, e),
            }
        }

        info!("Finished capturing all monitors.");

        let tauri_monitors = app_handle
            .available_monitors()
            .expect("Failed to get monitor");

        for (i, monitor) in monitors.iter().enumerate() {
            let tauri_monitor = tauri_monitors.get(i).ok_or("Not enough monitors")?.clone();

            info!(
                "Monitor {}(Tauri monitor: {}): {:?}, size: {:?}, position: {:?}",
                i,
                monitor
                    .name()
                    .map_err(|e| format!("Monitor {} has no name: {:?}", i, e))?,
                tauri_monitor.name(),
                tauri_monitor.size(),
                tauri_monitor.position()
            );

            let app_handle = app_handle.clone();

            info!("Spawning window for monitor {}", i);

            // NOTE: We add 10 pixel offset to avoid invalid monitor
            /*let x = tauri_monitor.work_area().position.x as f64 + 10.0;
            let y = tauri_monitor.work_area().position.y as f64 + 10.0;*/

            let request_receiver = request_receiver.resubscribe();

            // FIXME: Does not need to spawn a new thread for each window?
            std::thread::spawn(move || {
                let window = tauri::webview::WebviewWindowBuilder::new(
                    &app_handle,
                    format!("capture_{}", i),
                    tauri::WebviewUrl::App("/capture/".into()),
                )
                .decorations(false)
                .shadow(false)
                .inner_size(
                    tauri_monitor.size().width as f64,
                    tauri_monitor.size().height as f64,
                )
                .position(
                    tauri_monitor.position().x as f64,
                    tauri_monitor.position().y as f64,
                )
                .transparent(true)
                .background_color(Color(0, 0, 0, 0))
                .resizable(false)
                .build()
                .unwrap();

                // NOTE: Somehow we need to set position after the window creation to make it work correctly
                window
                    .set_position(*tauri_monitor.position())
                    .unwrap_or_else(|e| info!("Failed to set position for monitor: {:?}", e));

                window
                    .set_size(*tauri_monitor.size())
                    .unwrap_or_else(|e| info!("Failed to set size for monitor: {:?}", e));

                let mut request_receiver = request_receiver;

                loop {
                    if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Quit {
                        break;
                    };
                }

                window.close().unwrap();
            });
        }

        if let Some(window) = &webview {
            if let Err(error) = window.show() {
                info!("Failed to show main window: {:?}", error);
            }
        }

        loop {
            if request_receiver.blocking_recv().unwrap() == CaptureThreadRequest::Quit {
                sleep(Duration::from_secs(1)); // wait for windows to close
                break;
            }
        }
    }
}

#[tauri::command]
#[specta::specta]
fn start_capture(app_handle: AppHandle) -> Result<(), String> {
    let sender =
        CAPTURE_THREAD_REQUEST_SENDER.get_or_init(|| create_capture_thread(app_handle.clone()));

    sender
        .send(CaptureThreadRequest::Start)
        .map_err(|e| format!("Failed to send start request: {}", e))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
fn stop_capture(app_handle: AppHandle) -> Result<(), String> {
    let sender =
        CAPTURE_THREAD_REQUEST_SENDER.get_or_init(|| create_capture_thread(app_handle.clone()));

    sender
        .send(CaptureThreadRequest::Quit)
        .map_err(|e| format!("Failed to send quit request: {}", e))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
fn get_capture_url_command(app_handle: AppHandle, monitor_id: String) -> Result<String, String> {
    match get_capture_url(&app_handle, monitor_id) {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get capture URL: {e}")),
    }
}

fn get_capture_url(
    app_handle: &AppHandle,
    monitor_id: String,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let path_string = format!("screenshot_monitor_{}.png", monitor_id);
    let path = app_handle
        .path()
        .temp_dir()
        .map_err(|d| format!("Failed to get temp directory: {d}"))?
        .join(Path::new(&path_string));

    Ok(path)
}

fn capture_monitor(path: &Path, monitor: Monitor) -> Result<(), Box<dyn std::error::Error>> {
    // Select a monitor (primary in this example)

    // Create a duplication session for this monitor
    let mut dup = DxgiDuplicationApi::new(monitor)?;

    for i in 0..10 {
        // Try to grab one frame within ~33ms (about 30 FPS budget)
        let mut frame = dup.acquire_next_frame(1000)?;

        // Map the GPU image into CPU memory and save a PNG
        // Note: The API could send an empty frame especially
        // in the first few calls, you can check this by seeing if
        // frame.frame_info().LastPresentTime is zero.

        if frame.frame_info().LastPresentTime == 0 {
            info!("Frame {} is empty", i);
            continue;
        }

        frame.save_as_image(path, ImageFormat::Png)?;

        return Ok(());
    }

    Err("No frame captured".into())
}

#[derive(Debug, Clone, Type, Serialize, Deserialize)]
struct NormalizedRect {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
}

impl NormalizedRect {
    fn to_rect(&self, img_width: u32, img_height: u32) -> Rect {
        Rect {
            x1: (self.x1 * img_width as f32) as u32,
            y1: (self.y1 * img_height as f32) as u32,
            x2: (self.x2 * img_width as f32) as u32,
            y2: (self.y2 * img_height as f32) as u32,
        }
    }
}

struct Rect {
    x1: u32,
    y1: u32,
    x2: u32,
    y2: u32,
}

#[tauri::command]
#[specta::specta]
fn finish_capture_with_cropped_rect(
    app_handle: AppHandle,
    monitor_id: &str,
    rect: NormalizedRect,
) -> Result<(), String> {
    info!("Finishing capture with cropped rect: {:?}", rect);

    let capture_path = get_capture_url(&app_handle, monitor_id.to_string())
        .map_err(|e| format!("Failed to get capture URL: {e}"))?;

    let result_path = temp_file_path("cropped.png");

    let img =
        image::open(&capture_path).map_err(|e| format!("Failed to open captured image: {e}"))?;

    let rect = rect.to_rect(img.width(), img.height());

    let x1 = cmp::min(rect.x1, rect.x2);
    let y1 = cmp::min(rect.y1, rect.y2);
    let width = cmp::max(rect.x1, rect.x2) - x1;
    let height = cmp::max(rect.y1, rect.y2) - y1;

    info!(
        "Cropping image: x1={}, y1={}, width={}, height={}",
        x1, y1, width, height
    );

    let cropped = img.crop_imm(
        x1,
        y1,
        cmp::min(width, img.width() - x1),
        cmp::min(height, img.height() - y1),
    );

    cropped
        .save(&result_path)
        .map_err(|e| format!("Failed to save cropped image: {e}"))?;

    stop_capture(app_handle.clone())?;

    app_handle
        .emit("send_request", result_path.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to emit send_request event: {e}"))?;

    Ok(())
}
