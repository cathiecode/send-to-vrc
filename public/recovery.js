let RECOVERY = {
  async resetConfig() {
    try {
      await window.__TAURI__.core.invoke("reset_config");
    } catch (e) {
      this.log("Failed to save config file: " + e);
      return;
    }

    this.log("Config reset; please restart the application.");
  },
  async readConfigValue() {
    const key = document.querySelector("input#config_key_to_read").value;

    let value;

    try {
      value = await window.__TAURI__.core.invoke("read_config_value", {
        key: key,
      });
    } catch (e) {
      this.log("Failed to read config value: " + e);
      return;
    }

    if (value === null || value === undefined) {
      this.log(`Config key "${key}" is not set.`);
    } else {
      this.log(`Config value for "${key}": ${value}`);
    }
  },
  async writeConfigValue() {
    const key = document.querySelector("input#config_key_to_write").value;
    const value = document.querySelector("input#config_value").value;

    try {
      await window.__TAURI__.core.invoke("write_config_value", {
        key: key,
        value: value,
      });
    } catch (e) {
      this.log("Failed to write config value: " + e);
      return;
    }

    this.log(`Config value for "${key}" set to "${value}".`);
  },
  log(message) {
    console.log(message);
    document.getElementById("log").innerText += message + "\n";
  },
};

document.querySelectorAll("[data-onclick]").forEach((el) => {
  const funcName = el.getAttribute("data-onclick");
  if (funcName && typeof RECOVERY[funcName] === "function") {
    el.addEventListener("click", () => {
      RECOVERY[funcName]();
    });
  }
});

document.getElementById("log").innerText = "";
RECOVERY.log("Recovery mode initialized.");
