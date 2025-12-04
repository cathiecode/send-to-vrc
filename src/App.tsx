import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { events } from "./bindings.gen";
import {
  sendImageToImageViewerAtom,
  sendImageToVRChatPrintAtom,
  sendImageToVideoPlayerAtom,
  setFileToSendAtom,
} from "./stores/atoms";
import router from "./stores/router";

type SendRequestEvent = string;

function App() {
  const setFileToSend = useSetAtom(setFileToSendAtom);
  const sendImageToVideoPlayer = useSetAtom(sendImageToVideoPlayerAtom);
  const sendImageToImageViewer = useSetAtom(sendImageToImageViewerAtom);
  const sendImageToVRChatPrint = useSetAtom(sendImageToVRChatPrintAtom);

  useEffect(() => {
    events.sendRequestEvent.listen((event) => {
      console.log(event);
      setFileToSend(event.payload.file);
      switch (event.payload.mode) {
        case "UploadImageToVideoServer":
          sendImageToVideoPlayer(event.payload.file);
          break;
        case "UploadImageToImageServer":
          sendImageToImageViewer(event.payload.file);
          break;
        case "UploadImageToVRChatPrint":
          sendImageToVRChatPrint(event.payload.file);
          break;
      }
    });
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
  }, [
    sendImageToImageViewer,
    sendImageToVRChatPrint,
    sendImageToVideoPlayer,
    setFileToSend,
  ]);
  return <RouterProvider router={router} />;
}

export default App;
