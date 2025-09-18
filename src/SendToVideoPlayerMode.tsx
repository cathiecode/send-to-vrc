import { useAtomValue } from "jotai";
import { sendStateAtom } from "./atoms";
import StatusLineComponent from "./StatusLineComponent";
import { Status } from "@chakra-ui/react";
import { useProgressMessage } from "./useProgressMessage";
import { useMemo, useState } from "react";

export default function SendToVideoPlayerMode() {
  const state = useAtomValue(sendStateAtom);

  if (state?.mode !== "video_player") {
    return null;
  }

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

  return (
    <div>
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
              <StatusLineComponent
                status="success"
                statusText="アップロードに成功しました。"
              />
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
