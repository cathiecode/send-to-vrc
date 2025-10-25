import { css } from "@emotion/react";
import { ImageViewerSendState } from "@/stores/atoms";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";
import { useCallback, useMemo } from "react";
import LimitedText from "@/components/ui/LimitedText";
import Button from "@/components/ui/Button";
import { TbCopy } from "react-icons/tb";
import useClipboard from "@/hooks/useClipboard";
import { useLocalized } from "@/i18n";
import router from "@/stores/router";

type SendToImageViewerMode = {
  state: ImageViewerSendState;
};

export default function SendToImageViewerMode(props: SendToImageViewerMode) {
  const { state } = props;

  const progressMessage = useProgressMessage();

  const localized = useLocalized();

  const displayProgressMessage = useMemo(() => {
    switch (progressMessage) {
      case "Starting":
        return localized("send.send-to-image-viewer.started");
      case "Compressing":
        return localized("send.send-to-image-viewer.compressing");
      case "Uploading":
        return localized("send.send-to-image-viewer.uploading");
      default:
        return localized("send.send-to-image-viewer.starting");
    }
  }, [progressMessage]);

  const { writeText } = useClipboard();

  const onCopyClicked = useCallback(() => {
    if (state.status !== "done") return;
    writeText(state.url ?? "");
  }, [writeText, state]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25em;
      `}
    >
      {(() => {
        switch (state.status) {
          case "uploading":
            return (
              <StatusLineComponent
                status="pending"
                statusText={displayProgressMessage}
              />
            );
          case "done":
            return (
              <>
                <StatusLineComponent
                  status="success"
                  statusText={localized("send.send-to-image-viewer.succeeded")}
                />
                <div>
                  {localized(
                    "send.send-to-image-viewer.please-paste-url-to-image-viewer",
                  )}
                </div>
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 0.5em;
                  `}
                >
                  <LimitedText width="15em">{state.url}</LimitedText>
                  <Button variant="secondary" onClick={onCopyClicked}>
                    {" "}
                    <TbCopy /> {localized("send.send-to-image-viewer.copy")}
                  </Button>
                </div>
                <Button
                  variant="primary"
                  css={css`
                    margin-top: 0.5em;
                  `}
                  onClick={() => {
                    router.navigate({ href: "/", replace: true });
                  }}
                >
                  {localized("send.back-to-home")}
                </Button>
              </>
            );
          case "error":
            return (
              <StatusLineComponent
                status="error"
                statusText={`${localized("send.send-to-image-viewer.failed")}(${state.message})`}
              />
            );
        }
      })()}
    </div>
  );
}
