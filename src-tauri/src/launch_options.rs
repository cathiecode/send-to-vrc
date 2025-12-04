use crate::prelude::*;

#[derive(specta::Type, serde::Serialize, PartialEq, Eq, Debug)]
#[serde(tag = "type", content = "args")]
pub enum LaunchOptionsMode {
    Default,
    Send { file: String },
    Capture,
}

#[derive(specta::Type, serde::Serialize, Debug)]
pub struct LaunchOptions {
    pub mode: LaunchOptionsMode,
}

#[tauri::command]
#[specta::specta]
pub fn get_launch_options() -> Result<LaunchOptions, AppError> {
    let args = std::env::args();

    debug!("Command line arguments: {:?}", args);

    parse_launch_options(args.collect())
}

pub fn parse_launch_options(args: Vec<String>) -> Result<LaunchOptions, AppError> {
    match (args.get(1), args.get(2)) {
        (None, None) => Ok(LaunchOptions {
            mode: LaunchOptionsMode::Default,
        }),
        (Some(args_1), args_2) if args_1 == "send" => {
            let Some(file) = args_2 else {
                return Err(AppError::Unknown(
                    "Send subcommand requires a file argument".to_string(),
                ));
            };
            Ok(LaunchOptions {
                mode: LaunchOptionsMode::Send { file: file.clone() },
            })
        }
        (Some(args_1), args_2) if args_1 == "capture" => {
            if args_2.is_some() {
                return Err(AppError::Unknown(
                    "Capture subcommand does not take arguments".to_string(),
                ));
            }
            Ok(LaunchOptions {
                mode: LaunchOptionsMode::Capture,
            })
        }
        (Some(file), None) => Ok(LaunchOptions {
            mode: LaunchOptionsMode::Send { file: file.clone() },
        }),
        _ => Err(AppError::Unknown("Invalid launch arguments".to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_no_args() {
        let result = parse_launch_options(vec!["app".to_string()]).unwrap();

        assert_eq!(result.mode, LaunchOptionsMode::Default);
    }

    #[test]
    fn parses_no_subcommand_with_file() {
        let result = parse_launch_options(vec!["app".to_string(), "file.txt".to_string()]).unwrap();

        assert_eq!(
            result.mode,
            LaunchOptionsMode::Send {
                file: "file.txt".to_string()
            }
        );
    }

    #[test]
    fn parses_send_subcommand() {
        let result = parse_launch_options(vec![
            "app".to_string(),
            "send".to_string(),
            "file.txt".to_string(),
        ])
        .unwrap();

        assert_eq!(
            result.mode,
            LaunchOptionsMode::Send {
                file: "file.txt".to_string()
            }
        );
    }

    #[test]
    fn parses_capture_subcommand() {
        let result = parse_launch_options(vec!["app".to_string(), "capture".to_string()]).unwrap();

        assert_eq!(result.mode, LaunchOptionsMode::Capture);
    }
}
