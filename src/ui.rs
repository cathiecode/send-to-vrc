use anyhow::{Error, Result};
use egui::FontDefinitions;
use std::sync::{Arc, Mutex};

mod font;

use crate::{
    config::{self, Config},
    logic::{login_vrchat, send_image_file_to_print, TwoFactorAuthenticationCode},
};

pub enum GuiState {
    Init,
    Uploading(AsyncTask<(), Error>),
    Uploaded,
    Config(crate::config::Config, bool),
    Login {
        user_name: String, password: String, task: AsyncTask<String, Error>
    },
    Error(String),
}

pub struct Gui {
    state: GuiState,
    config: crate::config::Config,
}

impl Gui {
    pub fn new(cc: &eframe::CreationContext<'_>, config: Config) -> Self {
        let mut fonts = FontDefinitions::default();

        fonts = font::load_system_fonts(fonts);

        cc.egui_ctx.set_fonts(fonts);

        Self {
            state: GuiState::Init,
            config,
        }
    }

    pub fn upload(&mut self, path: &std::path::Path) {
        let vrchat_api_key = self.config.get_vrchat_api_key();

        if vrchat_api_key.is_none() {
            self.error("VRChat API Key is not set in config.".to_string());
            return;
        }

        self.state.upload(path, vrchat_api_key.unwrap().to_owned());
    }

    pub fn config(&mut self) {
        self.state.config(self.config.clone());
    }

    pub fn login(&mut self) {
        self.state.login();
    }

    pub fn error(&mut self, msg: String) {
        self.state = GuiState::Error(msg);
    }
}

impl eframe::App for Gui {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| match self.state {
            GuiState::Init => {}
            GuiState::Uploading(_) => self.state.update_uploading(ctx, ui),
            GuiState::Uploaded => self.state.update_uploaded(ui),
            GuiState::Login{..} => self.state.update_login(ui),
            GuiState::Error(_) => self.state.update_error(ui),
            GuiState::Config(_, _) => self.update_config(ui),
        });
    }
}

impl Gui {
    fn update_config(&mut self, ui: &mut egui::Ui) {
        let GuiState::Config(config, saved) = &mut self.state else {
            return;
        };

        ui.heading("Config");

        ui.label("VRChat API Key:");
        let mut api_key = config.get_vrchat_api_key().unwrap_or("").to_string();
        if ui.text_edit_multiline(&mut api_key).changed() {
            config.set_vrchat_api_key(api_key);
        }

        let is_saved = *saved;

        if ui.button("Save").clicked() {
            if let Err(e) = config::save_config(config) {
                self.state = GuiState::Error(format!("Failed to save config: {}", e));
            } else {
                self.config = config.clone();
                *saved = true;
            }
        }

        if is_saved {
            ui.label("Config saved.");
        }
    }
}

impl GuiState {
    fn update_uploading(&mut self, ctx: &egui::Context, ui: &mut egui::Ui) {
        let GuiState::Uploading(future) = self else {
            return;
        };

        ui.heading("Uploading...");

        match future.seek() {
            Some(Ok(_)) => {
                *self = GuiState::Uploaded;
            }
            Some(Err(e)) => {
                *self = GuiState::Error(format!("{}", e));
            }
            None => {}
        }

        ctx.request_repaint_after_secs(0.1);
    }

    fn update_uploaded(&mut self, ui: &mut egui::Ui) {
        let GuiState::Uploaded = self else {
            return;
        };

        ui.heading("Upload complete!");
    }

    fn update_error(&mut self, ui: &mut egui::Ui) {
        let GuiState::Error(msg) = self else {
            return;
        };

        ui.heading("Error");
        ui.label(msg.as_str());
    }

    fn update_login(&mut self, ui: &mut egui::Ui) {
        let GuiState::Login{user_name, password, task} = self else {
            return;
        };

        ui.heading("Login");

        ui.label("Username:");
        if ui.text_edit_singleline(user_name).changed() {
            // do nothing
        }

        ui.label("Password:");
        if ui.text_edit_singleline(password).changed() {
            // do nothing
        }

        if ui.button("Login").clicked() {
            let username = user_name.clone();
            let password = password.clone();

            *task = AsyncTask::new(move || {
                login_vrchat(&username, &password, TwoFactorAuthenticationCode::None)
            });
        }

        match task.seek() {
            Some(Ok(_)) => {
                *self = GuiState::Init;
                // TODO: write token to config
            }
            Some(Err(e)) => {
                *self = GuiState::Error(format!("{}", e));
            }
            None => {}
        }
    }

    pub fn upload(&mut self, path: &std::path::Path, vrchat_api_key: String) {
        let GuiState::Init = self else {
            return;
        };

        let path = path.to_owned();

        *self = GuiState::Uploading(AsyncTask::new(move || {
            send_image_file_to_print(&path, vrchat_api_key)?;
            Ok(())
        }));
    }

    pub fn config(&mut self, config: crate::config::Config) {
        *self = GuiState::Config(config, false);
    }

    pub fn login(&mut self) {
        let GuiState::Init = self else {
            return;
        };

        *self = GuiState::Login {
            user_name: "".to_string(),
            password: "".to_string(),
            task: AsyncTask::new(|| Err(anyhow::anyhow!("Not started"))),
        };
    }
}

pub struct AsyncTask<T, E> {
    result: Arc<Mutex<Option<Result<T, E>>>>,
    taken: bool,
}

impl<T, E> AsyncTask<T, E> {
    pub fn new<F>(f: F) -> Self
    where
        F: FnOnce() -> Result<T, E> + Send + 'static,
        T: Send + 'static,
        E: Send + 'static,
    {
        let shared_result: Arc<Mutex<Option<_>>> = Arc::new(Mutex::new(None));

        {
            let shared_result = shared_result.clone();

            std::thread::spawn(move || {
                let result = f();

                shared_result.lock().unwrap().replace(result);
            });
        }

        Self {
            result: shared_result,
            taken: false,
        }
    }

    pub fn seek(&mut self) -> Option<Result<T, E>> {
        if self.taken {
            panic!("Result already taken");
        }

        let mut result = self.result.lock().unwrap();

        if result.is_some() {
            self.taken = true;
        }

        result.take()
    }
}
