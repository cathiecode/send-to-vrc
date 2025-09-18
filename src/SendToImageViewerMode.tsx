import { useAtomValue } from "jotai";
import { sendStateAtom } from "./atoms";
import StatusLineComponent from "./StatusLineComponent";

export default function SendToImageViewerMode() {
  const state = useAtomValue(sendStateAtom);

  if (state?.mode !== "image_viewer") {
    return null;
  }

  return (
    <div>
      {(() => {
        switch (state.state.status) {
          case "uploading":
            return (
              <StatusLineComponent
                status="pending"
                statusText="アップロードしています..."
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
