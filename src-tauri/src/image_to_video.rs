use crate::prelude::*;
use tauri::Manager as _;

#[tauri::command]
#[specta::specta]
pub async fn upload_image_to_video_server(
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

    let progress_callback = Some(progress::create_progress_callback(&handle));

    upload_image_to_video_server_internal(
        &ffmpeg_path,
        file_path,
        api_key,
        uploader_base_url,
        progress_callback.as_ref(),
    )
    .await
}

pub async fn upload_image_to_video_server_internal(
    ffmpeg_path: &str,
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
    progress_callback: Option<&progress::ProgressCallback>,
) -> Result<String, AppError> {
    if let Some(cb) = progress_callback {
        cb(progress::Progress::Starting)
    }
    let letterboxed_image_path = crate::file::temp_file_path("letterboxed_image.png")
        .to_string_lossy()
        .into_owned();

    let output_video_path = crate::file::temp_file_path("output.mp4")
        .to_string_lossy()
        .into_owned();

    info!("FFmpeg path: {}", ffmpeg_path);
    debug!("Input image path: {}", file_path);
    debug!("Letterboxed image path: {}", letterboxed_image_path);
    debug!("Output video path: {}", output_video_path);

    let (width, height) = (1280, 720);

    if let Some(cb) = progress_callback {
        cb(progress::Progress::Compressing)
    }
    crate::image::resize_image_letterboxed(file_path, &letterboxed_image_path, width, height)?;
    encode_image_to_video(ffmpeg_path, &letterboxed_image_path, &output_video_path).await?;

    if let Some(cb) = progress_callback {
        cb(progress::Progress::Uploading)
    }
    let url = upload_video_to_video_server(&output_video_path, api_key, uploader_base_url).await?;

    Ok(url)
}

async fn upload_video_to_video_server(
    video_file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
) -> Result<String, AppError> {
    crate::uploader::upload_file_to_uploader(video_file_path, api_key, "mp4", uploader_base_url)
        .await
}

// Windows-specific: to prevent opening a console window
const DETACHED_PROCESS: u32 = 0x00000008;

pub async fn encode_image_to_video(
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
