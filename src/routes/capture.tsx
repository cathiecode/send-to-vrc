import { commands } from "@/bindings.gen";
import BoundingSelector from "@/components/ui/BoundingSelector";
import convertFreshFileSrc from "@/features/file/convertFreshFileSrc";
import useBoundingSelectorState, {
  bounding as boundingInRootCssPixel,
} from "@/hooks/useBoundingSelectorState";
import useBoundingClientRect from "@/hooks/useClientBoundingBox";
import { css } from "@emotion/react";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { usePopper } from "react-popper";
import Button from "@/components/ui/Button";

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

  const boundingRectInRootCssPixel = boundingInRootCssPixel(state);

  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(
    null,
  );
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  // const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);

  const { styles: popperStyles } = usePopper(referenceElement, popperElement, {
    strategy: "fixed",
    placement: "bottom-end",
  });

  const onSendClicked = useCallback(() => {
    if (!webviewWidowLabel) {
      return;
    }

    const rootBoundingClientRect = boundingClientRect;

    if (!rootBoundingClientRect) {
      return;
    }

    const rect = {
      x1: boundingRectInRootCssPixel.left / boundingClientRect.width,
      y1: boundingRectInRootCssPixel.top / boundingClientRect.height,
      x2: boundingRectInRootCssPixel.right / boundingClientRect.width,
      y2: boundingRectInRootCssPixel.bottom / boundingClientRect.height,
    };

    commands
      .finishCaptureWithCroppedRect(webviewWidowLabel, rect)
      .catch(console.error);
  }, [webviewWidowLabel, boundingClientRect, boundingRectInRootCssPixel]);

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
          <Button
            variant="secondary"
            onClick={() => {
              commands.stopCapture().catch(console.error);
            }}
          >
            Stop capture
          </Button>
        </div>
        <BoundingSelector
          width="100%"
          height="100%"
          state={state}
          dispatch={dispatch}
        />
        <div
          ref={setReferenceElement}
          style={{
            top: boundingRectInRootCssPixel.top,
            left: boundingRectInRootCssPixel.left,
            width:
              boundingRectInRootCssPixel.right -
              boundingRectInRootCssPixel.left,
            height:
              boundingRectInRootCssPixel.bottom -
              boundingRectInRootCssPixel.top,
          }}
          css={css`
            position: absolute;
            pointer-events: none;
            touch-action: none;
          `}
        ></div>
        {state.type === "selected" ? (
          <div
            ref={setPopperElement}
            style={popperStyles.popper}
            css={css`
              padding: 1em;
            `}
          >
            <Button onClick={onSendClicked}>Send to VRC</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
