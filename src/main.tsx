import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.scss";
import { invoke } from "@tauri-apps/api/core";
import { parseArgs } from "./args";

async function main() {
  const args = await invoke("get_args");

  const options = parseArgs(args as string[]);

  if (options.mode === "send") {
    if (!options.fileToSend) {
      throw new Error("fileToSend is required in send mode");
    }

    if (!window.location.href.endsWith("/send")) {
      window.location.href = "/send";
    }
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </React.StrictMode>,
  );
}

main().catch((err) => {
  alert("Failed to start/ the app: " + String(err));
});
