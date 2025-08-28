use std::{env::temp_dir, path::PathBuf, sync::Arc};

use anyhow::Result;
use image::ImageReader;

pub enum Command {
    Upload { file_path: PathBuf },
    Config,
    Notice,
    Help,
    Version,
}

pub struct OptionsStruct {
    pub command: Command,
    pub log_level: log::Level,
}

pub type Options = Arc<OptionsStruct>;

pub fn send_image_file_to_print(file_path: &std::path::Path, vrchat_api_key: String) -> Result<()> {
    let image_reader = ImageReader::open(file_path)?;

    let image = image_reader.decode()?;

    let temp_file_path = temp_dir().join("send-to-vrc.png");

    log::debug!("Temporary file path: {:?}", temp_file_path);

    let image = if image.width() > 1920 || image.height() > 1080 {
        log::debug!("Resizing image to fit within 1920x1080");
        image.resize(1920, 1080, image::imageops::FilterType::Lanczos3)
    } else {
        image
    };

    {
        let image_writer = std::fs::File::create(&temp_file_path)?;

        image.write_with_encoder(image::codecs::png::PngEncoder::new(image_writer))?;

        log::debug!("Image saved to temporary file: {:?}", temp_file_path);
    }

    send_file_to_print(&temp_file_path, vrchat_api_key)?;

    Ok(())
}

fn send_file_to_print(file_path: &std::path::Path, vrchat_api_key: String) -> Result<()> {
    let bytes = std::fs::read(file_path)?;

    log::debug!("Read {} bytes from file {:?}", bytes.len(), file_path);

    let client = reqwest::blocking::Client::new();

    let form = reqwest::blocking::multipart::Form::new()
        .part(
            "image",
            reqwest::blocking::multipart::Part::bytes(bytes)
                .file_name("image")
                .mime_str("image/png")?,
        )
        .text("timestamp", format!("{}", chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ")))
        .text("note", "Uploaded via Send to VRC");

    log::debug!("Form: {:?}", form);

    let response = client
        .post("https://api.vrchat.cloud/api/1/prints")
        .header("Cookie", format!("auth={}", vrchat_api_key))
        .header("User-Agent", "SendToVRC/1.0 cathiecode@gmail.com")
        .multipart(form)
        .send()?;

    log::debug!("Response: {:?}", response);

    if !response.status().is_success() {
        let text = response.text();
        log::debug!("Response text: {:?}", text);
        return Err(anyhow::anyhow!("Failed to upload file: {:?}", text));
    }

    log::info!("File uploaded successfully.");

    Ok(())
}
