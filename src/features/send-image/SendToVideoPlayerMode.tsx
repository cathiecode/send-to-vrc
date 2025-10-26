import { useCallback, useMemo } from "react";
import { TbCopy } from "react-icons/tb";
import { css } from "@emotion/react";
import Button from "@/components/ui/Button";
import LimitedText from "@/components/ui/LimitedText";
import useClipboard from "@/hooks/useClipboard";
import { VideoPlayerSendState } from "@/stores/atoms";
import router from "@/stores/router";
import { useLocalized } from "@/i18n";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";

type SendToVideoPlayerModeProps = {
  state: VideoPlayerSendState;
};

export default function SendToVideoPlayerMode(
  props: SendToVideoPlayerModeProps,
) {
  const { state } = props;

  const progressMessage = useProgressMessage();

  const localized = useLocalized();

  const displayProgressMessage = useMemo(() => {
    switch (progressMessage) {
      case "Starting":
        return localized("send.send-to-video-player.started");
      case "Compressing":
        return localized("send.send-to-video-player.compressing");
      case "Uploading":
        return localized("send.send-to-video-player.uploading");
      default:
        return localized("send.send-to-video-player.starting");
    }
  }, [localized, progressMessage]);

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
                  statusText={localized("send.send-to-video-player.succeeded")}
                />
                <div>
                  {localized(
                    "send.send-to-video-player.please-paste-url-to-video-player",
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
                    <TbCopy /> {localized("send.send-to-video-player.copy")}
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
                statusText={`${localized("send.send-to-video-player.failed")}(${state.message})`}
              />
            );
        }
      })()}
    </div>
  );
}
