import { css } from "@emotion/react";
import { VRChatPrintSendState } from "./atoms";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";
import { useMemo } from "react";

type SendToVRChatPrintModeProps = {
  state: VRChatPrintSendState;
};

export default function SendToVRChatPrintMode(
  props: SendToVRChatPrintModeProps,
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
        return "画像をアップロードしています…";
      default:
        return "処理を開始しています…";
    }
  }, [progressMessage]);

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
                <div>Print機能を使用してシェアしてください。</div>
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
