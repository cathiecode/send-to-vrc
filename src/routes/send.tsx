import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useImageValidity } from "@/useImageValidity";
import { useLocalized } from "@/i18n";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  sendImageToVideoPlayerAtom,
  sendImageToImageViewerAtom,
  sendStateAtom,
  setFileToSendAtom,
  fileToSendAtom,
  shouldCopyAfterUploadAtom,
  vrchatPrintFeatureFlagAtom,
  sendImageToVRChatPrintAtom,
} from "@/atoms";
import { convertFileSrc } from "@tauri-apps/api/core";

import SendPageComponent from "@/SendPageComponent";

export const Route = createFileRoute("/send")({
  component: SendPage,
});

function SendPage() {
  const pickedFilePath = useAtomValue(fileToSendAtom);

  const sendState = useAtomValue(sendStateAtom);

  const localized = useLocalized();

  const sendImageToVideoPlayer = useSetAtom(sendImageToVideoPlayerAtom);
  const sendImageToImageViewer = useSetAtom(sendImageToImageViewerAtom);
  const sendImageToVRChatPrint = useSetAtom(sendImageToVRChatPrintAtom);

  const imageValidity = useImageValidity(pickedFilePath);

  const onSendToVideoPlayerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert(localized("send.no-file-selected"));
      return;
    }

    sendImageToVideoPlayer(pickedFilePath);
  }, [pickedFilePath, localized, sendImageToVideoPlayer]);

  const onSendToImageViewerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert(localized("send.no-file-selected"));
      return;
    }

    sendImageToImageViewer(pickedFilePath);
  }, [pickedFilePath, localized, sendImageToImageViewer]);

  const onSendToVrchatPrintClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert(localized("send.no-file-selected"));
      return;
    }

    sendImageToVRChatPrint(pickedFilePath);
  }, [pickedFilePath, localized, sendImageToVRChatPrint]);

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

  const vrchatPrintFeatureFlag = useAtomValue(vrchatPrintFeatureFlagAtom);

  return (
    <SendPageComponent
      sendState={sendState}
      pickedFilePath={pickedFilePath}
      imageFileSrc={imageFileSrc}
      imageValidity={imageValidity}
      shouldCopyAfterUpload={shouldCopyAfterUpload}
      vrchatPrint={vrchatPrintFeatureFlag}
      onFilePicked={onFilePicked}
      onSendToImageViewerClicked={onSendToImageViewerClicked}
      onSendToVideoPlayerClicked={onSendToVideoPlayerClicked}
      onSendToVrchatPrintClicked={onSendToVrchatPrintClicked}
      onShouldCopyAfterUploadChanged={setShouldCopyAfterUpload}
    />
  );
}
