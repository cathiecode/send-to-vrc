import { commands } from "@/bindings.gen";
import BoundingSelector from "@/BoundingSelector";
import useBoundingSelectorState from "@/useBoundingSelectorState";
import { css } from "@emotion/react";
import { createFileRoute } from "@tanstack/react-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import useSWR from "swr";

export const Route = createFileRoute("/capture")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: previewUrl } = useSWR("captureUrl", async () => {
    const webviewWidowLabel = await getCurrentWebviewWindow().label;

    const captureUrl = await commands.getCaptureUrlCommand(webviewWidowLabel);

    if (captureUrl.status === "error") {
      throw new Error(captureUrl.error);
    }

    return convertFileSrc(captureUrl.data);
  });

  const [state, dispatch] = useBoundingSelectorState();

  return (
    <div>
      <div
        css={css`
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url(${previewUrl});
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-color: #000;
        `}
      >
        <button
          onClick={() => {
            commands.stopCapture().catch(console.error);
          }}
        >
          Stop capture
        </button>
        <BoundingSelector
          width="100%"
          height="100%"
          state={state}
          dispatch={dispatch}
        />
      </div>
    </div>
  );
}
