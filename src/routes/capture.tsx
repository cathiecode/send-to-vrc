import { commands } from "@/bindings.gen";
import BoundingSelector from "@/BoundingSelector";
import convertFreshFileSrc from "@/convertFreshFileSrc";
import useBoundingSelectorState, {
  bounding as boundingInRootCssPixel,
} from "@/useBoundingSelectorState";
import useBoundingClientRect from "@/useClientBoundingBox";
import { css } from "@emotion/react";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import useSWR from "swr";

export const Route = createFileRoute("/capture")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: webviewWidowLabel } = useSWR("webviewWindowLabel", async () => {
    return await getCurrentWebviewWindow().label;
  });

  const { data: previewUrl } = useSWR(
    ["captureUrl", webviewWidowLabel],
    async () => {
      if (!webviewWidowLabel) {
        return undefined;
      }

      const captureUrl = await commands.getCaptureUrlCommand(webviewWidowLabel);

      if (captureUrl.status === "error") {
        throw new Error(captureUrl.error);
      }

      return convertFreshFileSrc(captureUrl.data);
    },
  );

  const [state, dispatch] = useBoundingSelectorState();

  const { ref, boundingClientRect } = useBoundingClientRect();

  return (
    <div>
      <div
        ref={ref}
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
        <div
          css={css`
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 10;
          `}
        >
          <button
            onClick={() => {
              commands.stopCapture().catch(console.error);
            }}
          >
            Stop capture
          </button>
          <button
            onClick={() => {
              if (!webviewWidowLabel) {
                return;
              }

              const boundingRectInRootCssPixel = boundingInRootCssPixel(state);

              const rootBoundingClientRect = boundingClientRect;

              if (!rootBoundingClientRect) {
                return;
              }

              console.log(boundingRectInRootCssPixel);

              const rect = {
                x1: boundingRectInRootCssPixel.left / boundingClientRect.width,
                y1: boundingRectInRootCssPixel.top / boundingClientRect.height,
                x2: boundingRectInRootCssPixel.right / boundingClientRect.width,
                y2:
                  boundingRectInRootCssPixel.bottom / boundingClientRect.height,
              };

              commands
                .finishCaptureWithCroppedRect(webviewWidowLabel, rect)
                .catch(console.error);
            }}
          ></button>
        </div>
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
