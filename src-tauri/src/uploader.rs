use crate::prelude::*;

#[derive(serde::Deserialize)]
struct UploaderResponse {
    pub url: String,
}

pub async fn upload_file_to_uploader(
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

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize, specta::Type)]
pub struct Tos {
    version: i32,
    content: String,
}

#[tauri::command]
#[specta::specta]
pub async fn get_tos_and_version(uploader_base_url: &str) -> Result<Tos, AppError> {
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

#[derive(serde::Serialize)]
struct AnonymousRegisterRequestTos {
    accept: bool,
    version: i32,
}

#[derive(serde::Serialize)]
struct AnonymousRegisterRequest {
    tos: AnonymousRegisterRequestTos,
    date: String,
}

#[derive(serde::Deserialize)]
pub struct AnonymousRegisterResponse {
    token: String,
}

#[tauri::command]
#[specta::specta]
pub async fn register_anonymously(
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
