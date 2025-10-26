import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppContainer";
import convertFreshFileSrc from "@/features/file/convertFreshFileSrc";
import SendPageComponent from "@/features/send-image/SendPageComponent";
import { useImageValidity } from "@/features/send-image/useImageValidity";
import {
  fileToSendAtom,
  sendImageToImageViewerAtom,
  sendImageToVRChatPrintAtom,
  sendImageToVideoPlayerAtom,
  sendStateAtom,
  setFileToSendAtom,
  shouldCopyAfterUploadAtom,
  vrchatPrintFeatureFlagAtom,
} from "@/stores/atoms";
import { useLocalized } from "@/i18n";

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

    sendImageToVideoPlayer(pickedFilePath.filePath);
  }, [pickedFilePath, localized, sendImageToVideoPlayer]);

  const onSendToImageViewerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert(localized("send.no-file-selected"));
      return;
    }

    sendImageToImageViewer(pickedFilePath.filePath);
  }, [pickedFilePath, localized, sendImageToImageViewer]);

  const onSendToVrchatPrintClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert(localized("send.no-file-selected"));
      return;
    }

    sendImageToVRChatPrint(pickedFilePath.filePath);
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
    () => pickedFilePath && convertFreshFileSrc(pickedFilePath.filePath),
    [pickedFilePath],
  );

  const [shouldCopyAfterUpload, setShouldCopyAfterUpload] = useAtom(
    shouldCopyAfterUploadAtom,
  );

  const vrchatPrintFeatureFlag = useAtomValue(vrchatPrintFeatureFlagAtom);

  return (
    <AppLayout>
      <SendPageComponent
        sendState={sendState}
        pickedFilePath={pickedFilePath?.filePath}
        imageFileSrc={imageFileSrc}
        imageValidity={imageValidity}
        shouldCopyAfterUpload={shouldCopyAfterUpload}
        vrchatPrint={vrchatPrintFeatureFlag}
        onFilePicked={onFilePicked}
        onSendToImageViewerClicked={onSendToImageViewerClicked}
        onSendToVideoPlayerClicked={onSendToVideoPlayerClicked}
        onSendToVrchatPrintClicked={onSendToVrchatPrintClicked}
        onShouldCopyAfterUploadChanged={setShouldCopyAfterUpload}
        key={pickedFilePath?.filePath + "-" + pickedFilePath?.requestedAt}
      />
    </AppLayout>
  );
}
