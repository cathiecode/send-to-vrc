let RECOVERY = {
  async resetConfig() {
    const contentsResponse = await fetch("/default_config.json");

    if (!contentsResponse.ok) {
      this.log("Failed to fetch default config");
      return;
    }

    const contents = await contentsResponse.text();

    if (!contents) {
      this.log("Default config is empty; something is very wrong");
      return;
    }

    this.log("Resetting config to default");
    this.log("New config contents:");
    this.log(contents);

    try {
      await window.__TAURI__.core.invoke("save_config_file", { contents });
    } catch (e) {
      this.log("Failed to save config file: " + e);
      return;
    }

    this.log("Config reset; please restart the application.");
  },
  async outputConfig() {
    this.log("Fetching config file...");
    try {
      const contents = await window.__TAURI__.core.invoke("load_config_file");

      this.log("Config file contents:");
      this.log(contents);
      console.log(contents);
    } catch (e) {
      this.log("Failed to load config file: " + e);
      return;
    }
  },
  async overwriteConfig() {
    const textarea = document.getElementById("config");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      this.log("Failed to find config textarea");
      return;
    }

    const contents = textarea.value;
    if (!contents) {
      this.log("Config textarea is empty; not overwriting");
      return;
    }

    this.log("Overwriting config with contents:");
    this.log(contents);

    try {
      await window.__TAURI__.core.invoke("save_config_file", { contents });
    } catch (e) {
      this.log("Failed to save config file: " + e);
      return;
    }

    this.log("Config overwritten; please restart the application.");
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

RECOVERY.log("Recovery mode initialized.");
