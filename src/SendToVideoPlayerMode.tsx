import { useAtomValue } from "jotai";
import { sendStateAtom } from "./atoms";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";
import { useMemo } from "react";
import { css } from "@emotion/react";
import Button from "./Button";
import { TbCopy } from "react-icons/tb";

export default function SendToVideoPlayerMode() {
  const state = useAtomValue(sendStateAtom);

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

  if (state?.mode !== "video_player") {
    return null;
  }

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
        switch (state.state.status) {
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
                <div>
                  https://s2v-usercontent.superneko.net/02649cf3-4061-4fb4-a699-0d5689c3404b.mp4
                  <Button variant="secondary">
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
                statusText={`アップロードに失敗しました。(${state.state.message})`}
              />
            );
        }
      })()}
    </div>
  );
}
