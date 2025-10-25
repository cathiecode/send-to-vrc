use crate::prelude::*;

#[tauri::command]
#[specta::specta]
pub async fn upload_image_to_image_server(
    handle: tauri::AppHandle,
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
) -> Result<String, AppError> {
    let progress_callback = Some(progress::create_progress_callback(&handle));

    upload_image_to_image_server_internal(
        file_path,
        api_key,
        uploader_base_url,
        progress_callback.as_ref(),
    )
    .await
}

pub async fn upload_image_to_image_server_internal(
    file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
    progress_callback: Option<&progress::ProgressCallback>,
) -> Result<String, AppError> {
    if let Some(cb) = progress_callback {
        cb(progress::Progress::Starting)
    }
    let resized_image_path = crate::file::temp_file_path("resized_image.png")
        .to_string_lossy()
        .into_owned();

    let (width, height) = (1920, 1920);

    if let Some(cb) = progress_callback {
        cb(progress::Progress::Compressing)
    }

    crate::image::resize_image(file_path, &resized_image_path, width, height)
        .map_err(AppError::from_error_with_message("Failed to resize image"))?;

    if let Some(cb) = progress_callback {
        cb(progress::Progress::Uploading)
    }
    let url =
        upload_image_file_to_image_server(&resized_image_path, api_key, uploader_base_url).await?;

    Ok(url)
}

async fn upload_image_file_to_image_server(
    image_file_path: &str,
    api_key: &str,
    uploader_base_url: &str,
) -> Result<String, AppError> {
    crate::uploader::upload_file_to_uploader(image_file_path, api_key, "png", uploader_base_url)
        .await
}
