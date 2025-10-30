import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import RewriteLangTag from "@/components/i18n/RewriteLangTag";
import ErrorComponent from "@/components/layout/ErrorComponent";
import { parseArgs } from "@/stores/args";
import App from "./App";
import { commands } from "./bindings.gen";
import "./index.scss";

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

  if ((await commands.isAppHealthy()) === false) {
    location.href = "/error.html";
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <ErrorBoundary FallbackComponent={ErrorComponent}>
          <App />
          <RewriteLangTag />
        </ErrorBoundary>
      </Suspense>
    </React.StrictMode>,
  );
}

main().catch((err) => {
  alert("Failed to start/ the app: " + String(err));
});
