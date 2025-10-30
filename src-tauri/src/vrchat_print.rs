use base64::Engine as _;
use image::GenericImageView as _;
use tauri::Manager as _;

use crate::prelude::*;

#[tauri::command]
#[specta::specta]
pub async fn upload_image_to_vrchat_print(
    app_handle: tauri::AppHandle,
    file_path: &str,
) -> Result<(), AppError> {
    let Some(vrchat_api_key) = app_handle
        .state::<crate::app_data::AppData>()
        .lock_config()
        .read_vrchat_api_key()?
    else {
        return Err(AppError::VrchatAuthRequired(
            "VRChat API key is not set in configuration".to_string(),
        ));
    };

    if vrchat_api_key.is_empty() {
        return Err(AppError::VrchatAuthRequired(
            "VRChat API key is empty in configuration".to_string(),
        ));
    };

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

#[derive(PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum TwoFactorMethod {
    Totp,
    EmailOtp,
    Unknown(String),
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(tag = "type", content = "content")]
pub enum LoginResult {
    Success,                                     // auth cookie
    RequiresTwoFactorAuth(Vec<TwoFactorMethod>), // auth cookie
}

#[tauri::command]
#[specta::specta]
pub async fn login_to_vrchat_get_current_user_name(
    app_handle: tauri::AppHandle,
) -> Result<String, AppError> {
    let state = app_handle.state::<crate::app_data::AppData>();
    let config = state.config();
    login_to_vrchat_get_current_user_name_internal(config).await
}

#[tauri::command]
#[specta::specta]
pub async fn login_to_vrchat_get_current_user_name_internal(
    config: std::sync::Arc<std::sync::Mutex<crate::config::Config>>,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let Some(vrchat_api_key) = config.lock().unwrap().read_vrchat_api_key()? else {
        return Err(AppError::VrchatAuthRequired(
            "VRChat API key is not set in configuration".to_string(),
        ));
    };

    if vrchat_api_key.is_empty() {
        return Err(AppError::VrchatAuthRequired(
            "VRChat API key is empty in configuration".to_string(),
        ));
    };

    let response = client
        .get("https://api.vrchat.cloud/api/1/auth/user")
        .header(
            "Cookie",
            format!(
                "auth={}",
                config.lock().unwrap().read_vrchat_api_key()?.unwrap()
            ),
        )
        .header("User-Agent", "SendToVRC/1.0")
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send get current user request",
        ))?;

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(AppError::VrchatAuthRequired(
            "VRChat API key is invalid or expired".to_string(),
        ));
    }

    if response.status() != reqwest::StatusCode::OK {
        return Err(AppError::Unknown(format!(
            "Get current user failed with status code: {}",
            response.status()
        )));
    }

    let response_json =
        response
            .json::<serde_json::Value>()
            .await
            .map_err(AppError::from_error_with_message(
                "Failed to parse get current user response",
            ))?;

    if let Some(serde_json::Value::String(display_name)) = response_json.get("displayName") {
        return Ok(display_name.clone());
    }

    info!("Get current user response: {:?}", response_json);

    Err(AppError::Unknown(
        "Get current user response does not contain displayName".to_string(),
    ))
}

#[tauri::command]
#[specta::specta]
pub async fn login_to_vrchat(
    app_handle: tauri::AppHandle,
    username: &str,
    password: &str,
) -> Result<LoginResult, AppError> {
    let state = app_handle.state::<crate::app_data::AppData>();
    let config = state.config();
    login_to_vrchat_internal(config, username, password).await
}

pub async fn login_to_vrchat_internal(
    config: std::sync::Arc<std::sync::Mutex<crate::config::Config>>,
    username: &str,
    password: &str,
) -> Result<LoginResult, AppError> {
    info!("Logging in to VRChat as {}", username);
    let client = reqwest::Client::new();

    // base64(urlencode(username):urlencode(password))
    let credentials = base64::prelude::BASE64_STANDARD.encode(format!(
        "{}:{}",
        urlencoding::encode(username),
        urlencoding::encode(password)
    ));

    let response = client
        .get("https://api.vrchat.cloud/api/1/auth/user")
        .header("Authorization", format!("Basic {}", credentials))
        .header("User-Agent", "SendToVRC/1.0 cathiecode@gmail.com")
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send login request",
        ))?;

    if response.status() != reqwest::StatusCode::OK {
        return Err(AppError::Unknown(format!(
            "Login failed with status code: {}",
            response.status()
        )));
    }

    let auth_cookie = response
        .cookies()
        .find(|cookie| cookie.name() == "auth")
        .map(|c| c.value().to_string());

    let response_json =
        response
            .json::<serde_json::Value>()
            .await
            .map_err(AppError::from_error_with_message(
                "Failed to parse login response",
            ))?;

    // Successful login (without 2FA)
    if response_json.get("displayName").is_some() {
        if let Some(cookie) = auth_cookie {
            config.lock().unwrap().write_vrchat_api_key(&cookie)?;
            // config.write_vrchat_api_key(&cookie)?;
            return Ok(LoginResult::Success);
        }

        return Err(AppError::Unknown(
            "Login succeeded but auth cookie not found".to_string(),
        ));
    }

    // Requires 2FA
    if let Some(serde_json::Value::Array(two_factor_methods)) =
        response_json.get("requiresTwoFactorAuth")
    {
        let two_factor_methods = two_factor_methods
            .iter()
            .map(|method| match method {
                serde_json::Value::String(s) if s == "totp" => TwoFactorMethod::Totp,
                serde_json::Value::String(s) if s == "emailOtp" => TwoFactorMethod::EmailOtp,
                s => TwoFactorMethod::Unknown(s.to_string()),
            })
            .collect();

        info!(
            "VRChat login requires 2FA methods: {:?}",
            two_factor_methods
        );

        if let Some(cookie) = auth_cookie {
            config.lock().unwrap().write_vrchat_api_key(&cookie)?;
            return Ok(LoginResult::RequiresTwoFactorAuth(two_factor_methods));
        }

        return Err(AppError::Unknown(
            "2FA required but auth cookie not found".to_string(),
        ));
    }

    Err(AppError::Unknown(
        "Login failed for unknown reasons".to_string(),
    ))
}

#[tauri::command]
#[specta::specta]
pub async fn login_to_vrchat_submit_totp_code(
    app_handle: tauri::AppHandle,
    totp_code: &str,
) -> Result<(), AppError> {
    let vrchat_api_key = {
        let state = app_handle.state::<crate::app_data::AppData>();
        let config = state.lock_config();

        let Some(vrchat_api_key) = config.read_vrchat_api_key()? else {
            return Err(AppError::VrchatAuthRequired(
                "VRChat API key is not set in configuration".to_string(),
            ));
        };

        vrchat_api_key
    };

    login_to_vrchat_submit_totp_code_internal(vrchat_api_key, totp_code).await
}

pub async fn login_to_vrchat_submit_totp_code_internal(
    auth_cookie: String,
    totp_code: &str,
) -> Result<(), AppError> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://api.vrchat.cloud/api/1/auth/twofactorauth/totp/verify")
        .header("Cookie", format!("auth={}", auth_cookie))
        .header("User-Agent", "SendToVRC/1.0")
        .header("Content-Type", "application/json")
        .body(format!(
            r#"{{"code":"{}"}}"#,
            totp_code.replace("\"", "\\\"")
        ))
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send TOTP verification request",
        ))?;

    if response.status() != reqwest::StatusCode::OK {
        return Err(AppError::Unknown(format!(
            "TOTP verification failed with status code: {}",
            response.status()
        )));
    }

    let response_json =
        response
            .json::<serde_json::Value>()
            .await
            .map_err(AppError::from_error_with_message(
                "Failed to parse TOTP verification response",
            ))?;

    info!("Signed in as {:?}", response_json.get("displayName"));

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn login_to_vrchat_submit_email_otp_code(
    app_handle: tauri::AppHandle,
    otp_code: &str,
) -> Result<(), AppError> {
    let vrchat_api_key = {
        let state = app_handle.state::<crate::app_data::AppData>();
        let config = state.lock_config();

        let Some(vrchat_api_key) = config.read_vrchat_api_key()? else {
            return Err(AppError::VrchatAuthRequired(
                "VRChat API key is not set in configuration".to_string(),
            ));
        };

        vrchat_api_key
    };

    login_to_vrchat_submit_email_otp_code_internal(vrchat_api_key, otp_code).await
}

pub async fn login_to_vrchat_submit_email_otp_code_internal(
    auth_cookie: String,
    otp_code: &str,
) -> Result<(), AppError> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://api.vrchat.cloud/api/1/auth/twofactorauth/emailotp/verify")
        .header("Cookie", format!("auth={}", auth_cookie))
        .header("User-Agent", "SendToVRC/1.0")
        .header("Content-Type", "application/json")
        .body(format!(
            r#"{{"code":"{}"}}"#,
            otp_code.replace("\"", "\\\"")
        ))
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send email OTP verification request",
        ))?;

    if response.status() != reqwest::StatusCode::OK {
        return Err(AppError::Unknown(format!(
            "Email OTP verification failed with status code: {}",
            response.status()
        )));
    }

    let response_json =
        response
            .json::<serde_json::Value>()
            .await
            .map_err(AppError::from_error_with_message(
                "Failed to parse email OTP verification response",
            ))?;

    info!("Signed in as {:?}", response_json.get("displayName"));

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn logout_from_vrchat(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    let state = app_handle.state::<crate::app_data::AppData>();
    let config = state.config();

    let Some(api_key) = config.lock().unwrap().read_vrchat_api_key()? else {
        return Ok(());
    };

    if api_key.is_empty() {
        return Ok(());
    };

    config.lock().unwrap().write_vrchat_api_key("")?;

    let client = reqwest::Client::new();

    let response = client
        .put("https://api.vrchat.cloud/api/1/logout")
        .header("Cookie", format!("auth={}", api_key))
        .header("User-Agent", "SendToVRC/1.0")
        .send()
        .await
        .map_err(AppError::from_error_with_message(
            "Failed to send logout request",
        ))?;

    if response.status() != reqwest::StatusCode::OK {
        return Err(AppError::Unknown(format!(
            "Logout failed with status code: {}",
            response.status()
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    #[ignore]
    async fn login_with_totp() {
        env_logger::builder().is_test(true).try_init().ok();

        dotenvy::dotenv().ok();

        let username = std::env::var("TEST_VRCHAT_USERNAME").unwrap();
        let password = std::env::var("TEST_VRCHAT_PASSWORD").unwrap();
        let totp_code = std::env::var("TEST_VRCHAT_TOTP_CODE").unwrap();

        let config = std::sync::Arc::new(std::sync::Mutex::new(
            crate::config::Config::new(std::path::PathBuf::from("test_config.ini")).unwrap(),
        ));

        let result = super::login_to_vrchat_internal(config.clone(), &username, &password).await;
        assert!(result.is_ok());

        if let super::LoginResult::RequiresTwoFactorAuth(methods) = result.unwrap() {
            assert!(methods.contains(&super::TwoFactorMethod::Totp));

            let vrchat_api_key = config
                .lock()
                .unwrap()
                .read_vrchat_api_key()
                .unwrap()
                .unwrap();

            let totp_result = super::login_to_vrchat_submit_totp_code_internal(
                vrchat_api_key.clone(),
                &totp_code,
            )
            .await;
            assert!(totp_result.is_ok());

            let user_name = super::login_to_vrchat_get_current_user_name_internal(config)
                .await
                .unwrap();

            println!("Logged in as {}", user_name);
        } else {
            panic!("Expected RequiresTwoFactorAuth result");
        }
    }

    #[tokio::test]
    #[ignore]
    async fn login_with_email_otp() {
        env_logger::builder().is_test(true).try_init().ok();

        dotenvy::dotenv().ok();

        let username = std::env::var("TEST_VRCHAT_USERNAME").unwrap();
        let password = std::env::var("TEST_VRCHAT_PASSWORD").unwrap();

        let config = std::sync::Arc::new(std::sync::Mutex::new(
            crate::config::Config::new(std::path::PathBuf::from("test_config.ini")).unwrap(),
        ));

        let result = super::login_to_vrchat_internal(config.clone(), &username, &password).await;
        assert!(result.is_ok());

        if let super::LoginResult::RequiresTwoFactorAuth(methods) = result.unwrap() {
            assert!(methods.contains(&super::TwoFactorMethod::EmailOtp));

            println!("Waiting 60 seconds to receive email OTP code... Please Write TEST_VRCHAT_EMAIL_OTP_CODE env var before continuing.");
            std::thread::sleep(std::time::Duration::from_secs(60));

            dotenvy::dotenv_override().ok();

            let otp_code = std::env::var("TEST_VRCHAT_EMAIL_OTP_CODE").unwrap();

            let vrchat_api_key = config
                .lock()
                .unwrap()
                .read_vrchat_api_key()
                .unwrap()
                .unwrap();

            let otp_result = super::login_to_vrchat_submit_email_otp_code_internal(
                vrchat_api_key.clone(),
                &otp_code,
            )
            .await;
            assert!(otp_result.is_ok());

            let user_name = super::login_to_vrchat_get_current_user_name_internal(config)
                .await
                .unwrap();

            log::info!("Logged in as {}", user_name);
        } else {
            panic!("Expected RequiresTwoFactorAuth result");
        }
    }
}
