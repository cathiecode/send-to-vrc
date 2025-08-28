use anyhow::{anyhow, Result};

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
pub struct Config {
    version: Option<i64>,
    vrchat_api_key: Option<String>,
}

impl Config {
    pub fn get_vrchat_api_key(&self) -> Option<&str> {
        self.vrchat_api_key.as_deref()
    }

    pub fn set_vrchat_api_key(&mut self, api_key: String) {
        self.vrchat_api_key = Some(api_key);
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            version: Some(1),
            vrchat_api_key: None,
        }
    }
}

pub fn save_config(config: &Config) -> Result<()> {
    let config_dir = dirs::config_local_dir()
        .ok_or(anyhow!("Failed to get config directory"))?
        .join("send-to-vrc");

    let config_path = config_dir.join("config.json");

    std::fs::create_dir_all(&config_dir)?;

    let config_data = serde_json::to_string_pretty(config)?;

    std::fs::write(config_path, config_data)?;

    log::info!("Config saved");

    Ok(())
}

pub fn load_config() -> Result<Config> {
    let config_dir = dirs::config_local_dir()
        .ok_or(anyhow!("Failed to get config directory"))?
        .join("send-to-vrc");

    let config_path = config_dir.join("config.json");

    if !config_path.exists() {
        return Ok(Config {
            version: None,
            vrchat_api_key: None,
        });
    }

    let config_data = std::fs::read_to_string(config_path)?;

    let config: Config = serde_json::from_str(&config_data)?;

    log::info!("Config saved");

    Ok(config)
}
