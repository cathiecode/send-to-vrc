import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useImageValidity } from "@/useImageValidity";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  sendImageToVideoPlayerAtom,
  sendImageToImageViewerAtom,
  sendStateAtom,
  setFileToSendAtom,
  fileToSendAtom,
  shouldCopyAfterUploadAtom,
} from "@/atoms";
import { convertFileSrc } from "@tauri-apps/api/core";

import SendPageComponent from "@/SendPageComponent";

export const Route = createFileRoute("/send")({
  component: SendPage,
});

function SendPage() {
  const pickedFilePath = useAtomValue(fileToSendAtom);

  const sendState = useAtomValue(sendStateAtom);

  const sendImageToVideoPlayer = useSetAtom(sendImageToVideoPlayerAtom);
  const sendImageToImageViewer = useSetAtom(sendImageToImageViewerAtom);

  const imageValidity = useImageValidity(pickedFilePath);

  const onSendToVideoPlayerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert("ファイルが選択されていません");
      return;
    }

    sendImageToVideoPlayer(pickedFilePath);
  }, [pickedFilePath]);

  const onSendToImageViewerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert("ファイルが選択されていません");
      return;
    }

    sendImageToImageViewer(pickedFilePath);
  }, [pickedFilePath]);

  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = useCallback(
    (filePath: string | undefined) => {
      if (filePath) {
        setFileToSend(filePath);
      }
    },
    [setFileToSend],
  );

  const imageFileSrc = useMemo(
    () => pickedFilePath && convertFileSrc(pickedFilePath),
    [pickedFilePath],
  );

  const [shouldCopyAfterUpload, setShouldCopyAfterUpload] = useAtom(
    shouldCopyAfterUploadAtom,
  );

  return (
    <SendPageComponent
      sendState={sendState}
      pickedFilePath={pickedFilePath}
      imageFileSrc={imageFileSrc}
      imageValidity={imageValidity}
      shouldCopyAfterUpload={shouldCopyAfterUpload}
      onFilePicked={onFilePicked}
      onSendToImageViewerClicked={onSendToImageViewerClicked}
      onSendToVideoPlayerClicked={onSendToVideoPlayerClicked}
      onShouldCopyAfterUploadChanged={setShouldCopyAfterUpload}
    />
  );
}
