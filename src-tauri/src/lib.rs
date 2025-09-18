use std::path::PathBuf;

use image::GenericImageView;
use log::{debug, info};
use serde::Serialize;
use tauri::{Emitter, Manager};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_args,
            is_able_to_read_image_file,
            upload_image_to_video_server,
            upload_image_to_image_server,
            upload_image_to_vrchat_print
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_args() -> Vec<String> {
    std::env::args().collect()
}

#[tauri::command]
async fn upload_image_to_video_server(
    handle: tauri::AppHandle,
    file_path: &str
) -> Result<String, String> {
    let ffmpeg_path = handle
        .path()
        .resolve("resources/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve ffmpeg path: {:?}", e))?
        .to_string_lossy()
        .into_owned();

    let progress_callback = Some(create_progress_callback(&handle));

    upload_image_to_video_server_internal(&ffmpeg_path, file_path, progress_callback.as_ref()).await
}

async fn upload_image_to_video_server_internal(
    ffmpeg_path: &str,
    file_path: &str,
    progress_callback: Option<&ProgressCallback>,
) -> Result<String, String> {
    if let Some(cb) = progress_callback { cb(Progress::Starting) }
    let letterboxed_image_path = temp_file_path("letterboxed_image.png")
        .to_string_lossy()
        .into_owned();

    let output_video_path = temp_file_path("output.mp4").to_string_lossy().into_owned();

    info!("FFmpeg path: {}", ffmpeg_path);
    debug!("Input image path: {}", file_path);
    debug!("Letterboxed image path: {}", letterboxed_image_path);
    debug!("Output video path: {}", output_video_path);

    let (width, height) = (1280, 720);

    if let Some(cb) = progress_callback { cb(Progress::Compressing) }
    resize_image_letterboxed(file_path, &letterboxed_image_path, width, height)?;
    encode_image_to_video(ffmpeg_path, &letterboxed_image_path, &output_video_path).await?;

    if let Some(cb) = progress_callback { cb(Progress::Uploading) }
    let url = upload_video_to_video_server(&output_video_path).await?;

    Ok(url)
}

#[tauri::command]
async fn upload_image_to_image_server(handle: tauri::AppHandle, file_path: &str) -> Result<String, String> {
    let progress_callback = Some(create_progress_callback(&handle));
    
    upload_image_to_image_server_internal(file_path, progress_callback.as_ref()).await
}

async fn upload_image_to_image_server_internal(file_path: &str, progress_callback: Option<&ProgressCallback>) -> Result<String, String> {
    if let Some(cb) = progress_callback { cb(Progress::Starting) }
    let resized_image_path = temp_file_path("resized_image.png")
        .to_string_lossy()
        .into_owned();

    let (width, height) = (1920, 1920);

    if let Some(cb) = progress_callback { cb(Progress::Compressing) }
    resize_image(file_path, &resized_image_path, width, height)?;

    if let Some(cb) = progress_callback { cb(Progress::Uploading) }
    let url = upload_image_file_to_image_server(&resized_image_path).await?;

    Ok(url)
}

#[tauri::command]
async fn upload_image_to_vrchat_print(
    file_path: &str,
    vrchat_api_key: String,
) -> Result<(), String> {
    let path = std::path::Path::new(file_path);

    if !path.exists() {
        return Err("File does not exist".into());
    }

    send_file_to_print(path, vrchat_api_key).await
}

#[tauri::command]
async fn is_able_to_read_image_file(file_path: &str) -> Result<bool, ()> {
    Ok(image::open(file_path).is_ok())
}

async fn send_file_to_print(
    file_path: &std::path::Path,
    vrchat_api_key: String,
) -> Result<(), String> {
    let bytes =
        std::fs::read(file_path).map_err(|e| format!("failed to get file bytes: {:?}", e))?;

    debug!("Read {} bytes from file {:?}", bytes.len(), file_path);

    let client = reqwest::Client::new();

    let form = reqwest::multipart::Form::new()
        .part(
            "image",
            reqwest::multipart::Part::bytes(bytes)
                .file_name("image")
                .mime_str("image/png")
                .map_err(|e| format!("Failed to create file part: {:?}", e))?,
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
        .map_err(|e| format!("Failed to upload file: {:?}", e))?;

    debug!("Response: {:?}", response);

    if !response.status().is_success() {
        let text = response.text().await;
        // log::debug!("Response text: {:?}", text);
        return Err(format!("Failed to upload file: {:?}", text));
    }

    info!("File uploaded successfully.");

    Ok(())
}

fn resize_image_letterboxed(
    image_path: &str,
    output_path: &str,
    width: u32,
    height: u32,
) -> Result<(), String> {
    // read the image with "image" crate
    let img = image::open(image_path).map_err(|e| format!("Failed to open image: {}", e))?;

    // resize the image
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    // render letterboxed image with "tiny-skia" crate
    let mut canvas = tiny_skia::Pixmap::new(width, height).ok_or("Failed to create canvas")?;
    canvas.fill(tiny_skia::Color::WHITE); // fill with white background
    let (resized_width, resized_height) = resized.dimensions();
    let x_offset = (width - resized_width) / 2;
    let y_offset = (height - resized_height) / 2;
    let resized_rgba = resized.to_rgba8();

    let size = tiny_skia::IntSize::from_wh(resized_width, resized_height)
        .ok_or("Failed to create pixmap with input dimensions")?;

    let resized_pixmap = tiny_skia::Pixmap::from_vec(resized_rgba.into_raw(), size)
        .ok_or("Failed to create pixmap from resized image")?;

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
        .map_err(|e| format!("Failed to save resized image: {}", e))?;

    Ok(())
}

fn resize_image(
    image_path: &str,
    output_path: &str,
    width: u32,
    height: u32,
) -> Result<(), String> {
    // read the image with "image" crate
    let img = image::open(image_path).map_err(|e| format!("Failed to open image: {}", e))?;

    // resize the image
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    // save the resized image
    resized
        .save(output_path)
        .map_err(|e| format!("Failed to save resized image: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod test {
    use crate::upload_image_to_video_server_internal;

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

        let result = upload_image_to_video_server_internal(&ffmpeg_path, &input_file, None).await;

        eprintln!("Result: {:?}", result);

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upload_image() {
        let input_file =
            std::env::var("CARGO_MANIFEST_DIR").unwrap() + "/test_data/input_image.png";

        let result = super::upload_image_to_image_server_internal(&input_file, None).await;

        eprintln!("Result: {:?}", result);
        assert!(result.is_ok());
    }
}

async fn encode_image_to_video(
    ffmpeg_path: &str,
    image_file_path: &str,
    output_video_path: &str,
) -> Result<(), String> {
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
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !status.success() {
        return Err(format!("ffmpeg exited with status: {}", status));
    }

    Ok(())
}

#[derive(serde::Deserialize)]
struct VideoServerResponse {
    pub url: String,
}

async fn upload_video_to_video_server(video_file_path: &str) -> Result<String, String> {
    info!("Uploading video file: {}", video_file_path);

    let length = std::fs::metadata(video_file_path)
        .map_err(|e| format!("Failed to get video file metadata: {}", e))?
        .len();

    let reader = tokio::fs::File::open(video_file_path)
        .await
        .map_err(|e| format!("Failed to open video file: {}", e))?;

    let client = reqwest::Client::new();

    let result = client
        .post("https://s2v-upload.superneko.net/upload?ext=mp4")
        .body(reader)
        .header("Content-Length", length)
        .header(
            "Authorization",
            "Bearer 97095649-1ffc-43a3-bd46-f2f3acaf2acc",
        )
        .send()
        .await;

    if let Err(e) = result {
        return Err(format!("Failed to upload video: {}", e));
    }

    let response = result.unwrap();

    if !response.status().is_success() {
        return Err(format!(
            "Video upload failed with status: {}, {}",
            response.status(),
            response
                .text()
                .await
                .unwrap_or("(Failed to read response text)".into())
        ));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    let video_response: VideoServerResponse =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    info!("Video uploaded successfully: {}", video_response.url);

    Ok(video_response.url)
}

#[derive(serde::Deserialize)]
struct ImageServerResponse {
    pub url: String,
}

async fn upload_image_file_to_image_server(image_file_path: &str) -> Result<String, String> {
    info!("Uploading image file: {}", image_file_path);

    let length = std::fs::metadata(image_file_path)
        .map_err(|e| format!("Failed to get image file metadata: {}", e))?
        .len();

    let reader = tokio::fs::File::open(image_file_path)
        .await
        .map_err(|e| format!("Failed to open image file: {}", e))?;

    let client = reqwest::Client::new();

    let result = client
        .post("https://s2v-upload.superneko.net/upload?ext=png")
        .body(reader)
        .header("Content-Length", length)
        .header(
            "Authorization",
            "Bearer 97095649-1ffc-43a3-bd46-f2f3acaf2acc",
        )
        .send()
        .await;

    if let Err(e) = result {
        return Err(format!("Failed to upload image: {}", e));
    }

    let response = result.unwrap();

    if !response.status().is_success() {
        return Err(format!(
            "Image upload failed with status: {}, {}",
            response.status(),
            response
                .text()
                .await
                .unwrap_or("(Failed to read response text)".into())
        ));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    let image_response: ImageServerResponse =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    info!("Image uploaded successfully: {}", image_response.url);

    Ok(image_response.url)
}

fn temp_file_path(name: &str) -> PathBuf {
    std::env::temp_dir().join(name)
}
