import { VideoPlayerSendState } from "./atoms";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";
import { useCallback, useMemo } from "react";
import { css } from "@emotion/react";
import Button from "./Button";
import { TbCopy } from "react-icons/tb";
import LimitedText from "./LimitedText";
import useClipboard from "./useClipboard";

type SendToVideoPlayerModeProps = {
  state: VideoPlayerSendState;
};

export default function SendToVideoPlayerMode(
  props: SendToVideoPlayerModeProps,
) {
  const { state } = props;

  const progressMessage = useProgressMessage();

  const displayProgressMessage = useMemo(() => {
    switch (progressMessage) {
      case "Starting":
        return "処理が開始されました…";
      case "Compressing":
        return "画像を圧縮しています…";
      case "Uploading":
        return "動画をアップロードしています…";
      default:
        return "処理を開始しています…";
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
                  statusText="アップロードに成功しました。"
                />
                <div>動画プレイヤーにURLを貼り付けてください。(Liveモード)</div>
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
                    <TbCopy /> コピー
                  </Button>
                </div>
              </>
            );
          case "error":
            return (
              <StatusLineComponent
                status="error"
                statusText={`アップロードに失敗しました。(${state.message})`}
              />
            );
        }
      })()}
    </div>
  );
}
