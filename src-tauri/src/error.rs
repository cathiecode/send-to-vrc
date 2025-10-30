use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

#[derive(Serialize, Deserialize, Debug, Type, Error)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Configuration file is malformed or contains invalid data.")]
    ConfigContents(String),
    #[error("Configuration file does not exist.")]
    ConfigExistance(String),
    #[error("Directory for configuration file does not exist.")]
    ConfigDirectoryExistance(String),
    #[error("Uploader requires authentication.")]
    UploaderAuthRequired(String),
    #[error("VRChat requires authentication.")]
    VrchatAuthRequired(String),
    #[error("VRChat Print needs valid VRChat Plus subscription.")]
    VrchatPlusRequired(String),
    #[error("Unknown error occurred.")]
    Unknown(String),
}

impl AppError {
    pub fn from_error_with_message<'a, E>(msg: &'a str) -> impl (Fn(E) -> Self) + 'a
    where
        E: std::error::Error,
    {
        move |err| AppError::Unknown(format!("{}: {}", msg, err))
    }
}
