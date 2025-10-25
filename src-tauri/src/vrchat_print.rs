use image::GenericImageView as _;

use crate::prelude::*;

#[tauri::command]
#[specta::specta]
pub async fn upload_image_to_vrchat_print(
    file_path: &str,
    vrchat_api_key: String,
) -> Result<(), AppError> {
    let path = std::path::Path::new(file_path);

    if !path.exists() {
        return Err(AppError::Unknown("File does not exist".to_string()));
    }

    let letterboxed_image_path = crate::file::temp_file_path("letterboxed_image.png");

    resize_image_vrchat_print(file_path, &letterboxed_image_path.to_string_lossy())?;

    send_file_to_print(&letterboxed_image_path, vrchat_api_key).await
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
