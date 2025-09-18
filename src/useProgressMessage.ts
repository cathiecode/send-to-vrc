import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

type ProgressEvent = "Starting" | "Compressing" | "Uploading";

let lastProgressEvent: ProgressEvent | undefined = undefined;

const progressEventListeners = new Set<(event: ProgressEvent) => void>();

listen("progress", (event) => {
  progressEventListeners.forEach((listener) => {
    listener(event.payload as ProgressEvent);
  });
  
}).catch((e) => {
  console.error("Failed to listen to progress events:", e);
});

export function useProgressMessage() {
  const [progressMessage, setProgressMessage] = useState<ProgressEvent | undefined>(lastProgressEvent);

  useEffect(() => {
    const listener = (event: ProgressEvent) => {
      lastProgressEvent = event;
      setProgressMessage(event);
    };

    progressEventListeners.add(listener);

    return () => {
      progressEventListeners.delete(listener);
    };
  }, []);

  return progressMessage;
}
