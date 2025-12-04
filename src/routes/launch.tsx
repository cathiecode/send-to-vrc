import { getDefaultStore } from "jotai";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { setFileToSendAtom } from "@/stores/atoms";
import router from "@/stores/router";
import { commands } from "@/bindings.gen";

export const Route = createFileRoute("/launch")({
  component: RouteComponent,
});

function RouteComponent() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    launch().catch(setError);
  }, []);

  if (error === null) {
    return null;
  }

  return <div>Launch error: {error}</div>;
}

async function launch() {
  const launchOptions = await commands.getLaunchOptions();

  console.log("Launch options:", launchOptions);

  if (launchOptions.status === "error") {
    throw launchOptions.error.type + ": " + launchOptions.error.message;
  }

  if (launchOptions.data.mode === null) {
    router.navigate({
      to: "/",
      replace: true,
    });
    return;
  }

  switch (launchOptions.data.mode.type) {
    case "Capture":
      await commands.startCapture();
      router.navigate({
        to: "/",
        replace: true,
      });
      break;
    case "Send":
      getDefaultStore().set(
        setFileToSendAtom,
        launchOptions.data.mode.args.file,
      );
      break;
    case "Default":
      router.navigate({
        to: "/",
        replace: true,
      });
      break;
  }
}
