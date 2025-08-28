#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::{Result, anyhow};
use std::{path::PathBuf, sync::Arc};

mod config;
mod logic;
mod ui;

use logic::{Options, OptionsStruct};

use crate::{
    config::{Config, load_config},
    logic::Command,
};

fn main() {
    // Get argument
    let args: Vec<String> = std::env::args().collect();

    let Ok(options) = pasrse_args(&args) else {
        return print_usage();
    };

    simple_logger::init_with_level(options.log_level).unwrap();


    let window_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([320.0, 240.0]),
        ..Default::default()
    };

    let config = load_config();

    // TODO Proper error handling
    let (config, config_error) = match config {
        Ok(c) => (c, None),
        Err(e) => (
            Config::default(),
            Some(format!("Failed to load config: {}", e)),
        ),
    };

    if let Some(err) = config_error {
        eprintln!("{}", err);
    }

    eframe::run_native(
        "Send to VRC",
        window_options,
        Box::new(|_cc| {
            let mut gui = ui::Gui::new(_cc, config);

            match &options.command {
                Command::Config => gui.config(),
                Command::Upload { file_path } => gui.upload(file_path.as_ref()),
                Command::Notice => {
                    print_notice();
                    std::process::exit(0);
                },
                Command::Version => {
                    print_version();
                    std::process::exit(0);
                }
                Command::Help => {
                    print_usage();
                    std::process::exit(0);
                }
            }

            Ok(Box::new(gui))
        }),
    )
    .expect("Failed to start GUI");
}

fn pasrse_args(args: &[String]) -> Result<Options> {
    let mut args_iterator = args.iter();

    let _program_name = args_iterator
        .next()
        .ok_or(anyhow!("Failed to get program name"))?;

    let mut command: Option<Command> = None;
    let mut log_level: log::Level = log::Level::Warn;

    let args_iterator = args_iterator.by_ref();

    for arg in args_iterator {
        let arg = arg.as_str();

        if command.is_some() {
            return Err(anyhow!("Multiple commands or files specified"));
        }

        match arg {
            "help" | "-h" | "--help" => {
                command = Some(Command::Help);
                break;
            },
            "version" | "--version" => {
                command = Some(Command::Version);
            },
            "--verbose" => {
                log_level = log::Level::Info;
            },
            "--debug" => {
                log_level = log::Level::Debug;
            },
            "--trace" => {
                log_level = log::Level::Trace;
            },
            "config" => {
                command = Some(Command::Config);
                break;
            },
            "notice" => {
                command = Some(Command::Notice);
                break;
            },
            _ => {
                command = Some(Command::Upload {
                    file_path: PathBuf::from(arg),
                })
            }
        }
    }

    Ok(Arc::new(OptionsStruct {
        command: command.ok_or(anyhow!("No command specified"))?,
        log_level,
    }))
}

fn print_usage() {
    println!(include_str!("./usage.txt"), version=version());
}

fn print_notice() {
    println!("{}", notice());
}

fn print_version() {
    println!("send-to-vrc {}", version());
}

fn notice() -> &'static str {
    include_str!("../THIRDPARTY")
}

fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
