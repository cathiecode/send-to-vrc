use image::GenericImageView as _;

use crate::prelude::*;

#[tauri::command]
#[specta::specta]
pub async fn is_able_to_read_image_file(file_path: &str) -> Result<bool, ()> {
    Ok(image::open(file_path).is_ok())
}

pub fn resize_image_letterboxed(
    image_path: &str,
    output_path: &str,
    width: u32,
    height: u32,
) -> Result<(), crate::error::AppError> {
    // read the image with "image" crate
    let img = image::open(image_path).map_err(crate::error::AppError::from_error_with_message(
        "Failed to open image",
    ))?;

    // resize the image
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    // render letterboxed image with "tiny-skia" crate
    let mut canvas = tiny_skia::Pixmap::new(width, height).ok_or(
        crate::error::AppError::Unknown("Failed to create canvas".to_string()),
    )?;
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

pub fn resize_image(
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
