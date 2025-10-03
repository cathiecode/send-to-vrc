import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.scss";
import { parseArgs } from "./args";
import { commands } from "./bindings.gen";

async function main() {
  const args = await commands.getArgs();

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
