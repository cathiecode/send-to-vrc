import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { setFileToSendAtom } from "./stores/atoms";
import router from "./stores/router";

type SendRequestEvent = string;

function App() {
  const setFileToSend = useSetAtom(setFileToSendAtom);

  useEffect(() => {
    const listener = listen("send_request", (event) => {
      const payload = event.payload as SendRequestEvent;
      setFileToSend(payload);
      console.log(payload);
    });

    return () => {
      listener
        .then((unlisten) => unlisten && unlisten())
        .catch((e) => {
          console.error("Failed to listen to send_request events:", e);
        });
    };
  }, [setFileToSend]);
  return <RouterProvider router={router} />;
}

export default App;
