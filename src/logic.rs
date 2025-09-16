use std::{env::temp_dir, path::PathBuf, sync::Arc};

use anyhow::Result;
use cookie::Cookie;
use image::ImageReader;
use serde::Deserialize;

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
    let temp_file_path = temp_dir().join("send-to-vrc.png");

    log::debug!("Temporary file path: {:?}", temp_file_path);

    make_scaled_image_file(file_path, &temp_file_path)?;

    send_scaled_image_file_to_print(&temp_file_path, vrchat_api_key)?;

    Ok(())
}

fn send_scaled_image_file_to_print(
    file_path: &std::path::Path,
    vrchat_api_key: String,
) -> Result<()> {
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
        .text(
            "timestamp",
            format!("{}", chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ")),
        )
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

#[derive(Deserialize)]
pub enum TwoFactorAuthenticationCode {
    None,
    Totp(String),
    EmailOtp(String),
}

#[derive(Deserialize)]
struct UserResponse {
    #[serde(rename = "requiresTwoFactorAuth")]
    requires_two_factor_auth: Option<Vec<String>>,
}

pub fn login_vrchat(
    username: &str,
    password: &str,
    two_factor_authentication_code: TwoFactorAuthenticationCode,
) -> Result<String> {
    let client = reqwest::blocking::Client::new();

    let user_response = client
        .get("https://api.vrchat.cloud/api/1/auth/user")
        .header("User-Agent", "SendToVRC/1.0")
        .header(
            "Authorization",
            format!(
                "Basic {}",
                base64::encode(format!(
                    "{}:{}",
                    urlencoding::encode(username),
                    urlencoding::encode(password)
                ))
            ),
        )
        .send()?;

    let mut auth_cookie: Option<String> = None;

    for cookie in user_response.headers().get_all("Set-Cookie").iter() {
        log::debug!("Set-Cookie: {:?}", cookie);

        let cookie_str = cookie.to_str();

        if cookie_str.is_err() {
            continue;
        }

        let cookie_str = cookie_str.unwrap();

        if cookie_str.starts_with("auth=") {
            let cookie = Cookie::parse(cookie_str)?;

            auth_cookie = Some(cookie.value().to_string());
        }
    }

    if auth_cookie.is_none() {
        return Err(anyhow::anyhow!("No auth cookie found"));
    }

    let auth_cookie = auth_cookie.unwrap();

    let user_response_json = serde_json::from_str::<UserResponse>(&user_response.text()?)?;

    let totp_available = user_response_json
        .requires_two_factor_auth
        .as_ref()
        .map(|methods| methods.contains(&"totp".to_string()))
        .unwrap_or(false);

    let email_otp_available = user_response_json
        .requires_two_factor_auth
        .as_ref()
        .map(|methods| methods.contains(&"emailotp".to_string()))
        .unwrap_or(false);

    match (
        totp_available,
        email_otp_available,
        two_factor_authentication_code,
    ) {
        (true, _, TwoFactorAuthenticationCode::Totp(code)) => {
            // Use TOTP code
            log::debug!("Using TOTP code for 2FA");

            // Send TOTP code to /api/1/auth/twofactorauth/totp/verify
            let totp_response = client
                .post("https://api.vrchat.cloud/api/1/auth/twofactorauth/totp/verify")
                .header("User-Agent", "SendToVRC/1.0")
                .header("Cookie", format!("auth={}", auth_cookie))
                .body(format!(r#"{{"code":"{}"}}"#, code))
                .send()?;

            if !totp_response.status().is_success() {
                let text = totp_response.text();
                log::debug!("Response text: {:?}", text);
                return Err(anyhow::anyhow!("Failed to verify TOTP code: {:?}", text));
            }
        }
        (_, true, TwoFactorAuthenticationCode::EmailOtp(code)) => {
            // Use Email OTP code
            log::debug!("Using Email OTP code for 2FA");

            // Send Email OTP code to /api/1/auth/twofactorauth/emailotp/verify
            let emailotp_response = client
                .post("https://api.vrchat.cloud/api/1/auth/twofactorauth/emailotp/verify")
                .header("User-Agent", "SendToVRC/1.0")
                .header("Cookie", format!("auth={}", auth_cookie))
                .body(format!(r#"{{"code":"{}"}}"#, code))
                .send()?;

            if !emailotp_response.status().is_success() {
                let text = emailotp_response.text();
                log::debug!("Response text: {:?}", text);
                return Err(anyhow::anyhow!(
                    "Failed to verify Email OTP code: {:?}",
                    text
                ));
            }
        }
        (false, false, _) => {
            // No 2FA required
            log::debug!("No 2FA required");
        }
        _ => {
            return Err(anyhow::anyhow!("2FA required but no valid method provided"));
        }
    };

    Ok(auth_cookie)
}

fn make_still_image_video(
    input_image_file_path: &std::path::Path,
    output_video_file_path: &std::path::Path,
) -> Result<()> {
    // ./ffmpeg -loop 1 -r 0.1 -i /d/Pictures/VRChat/2025-08/VRChat_2025-08-17_12-14-52.659_1920x1080.png -t 20 -r 0.1 -pix_fmt yuvj420p -vcodec mjpeg output.avi

    let status = std::process::Command::new("ffmpeg")
        .arg("-loop")
        .arg("1")
        .arg("-r")
        .arg("0.1")
        .arg("-i")
        .arg(input_image_file_path)
        .arg("-t")
        .arg("20")
        .arg("-r")
        .arg("0.1")
        .arg("-pix_fmt")
        .arg("yuvj420p")
        .arg("-vcodec")
        .arg("mjpeg")
        .arg(output_video_file_path)
        .status()?;

    if !status.success() {
        return Err(anyhow::anyhow!("Failed to create video from picture"));
    }

    Ok(())
}

fn make_scaled_image_file(
    input_file_path: &std::path::Path,
    output_file_path: &std::path::Path,
) -> Result<()> {
    let image_reader = ImageReader::open(input_file_path)?;

    let image = image_reader.decode()?;

    let image = if image.width() > 1920 || image.height() > 1080 {
        log::debug!("Resizing image to fit within 1920x1080");
        image.resize(1920, 1080, image::imageops::FilterType::Lanczos3)
    } else {
        image
    };

    {
        let image_writer = std::fs::File::create(output_file_path)?;

        image.write_with_encoder(image::codecs::png::PngEncoder::new(image_writer))?;

        log::debug!("Image saved to temporary file: {:?}", output_file_path);
    }

    Ok(())
}
