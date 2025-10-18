import { useCallback } from "react";
import useBoundingClientRect from "./useClientBoundingBox";
import { css } from "@emotion/react";
import {
  bounding,
  BoundingSelectorEvent,
  BoundingSelectorState,
} from "./useBoundingSelectorState";

type BoundingSelectorBackgroundProps = {
  areaWidth: number;
  areaHeight: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  style?: React.CSSProperties;
};

function BoundingSelectorBackground(props: BoundingSelectorBackgroundProps) {
  const { areaWidth, areaHeight, top, left, right, bottom, style } = props;

  return (
    <svg
      width={areaWidth}
      height={areaHeight}
      viewBox={`0 0 ${areaWidth} ${areaHeight}`}
      version="1.1"
      style={style}
    >
      <g>
        <path
          style={{ strokeWidth: 0, fill: "rgba(0, 0, 0, 0.6)" }}
          d={`M 0 0 L 0 ${areaHeight} L ${areaWidth} ${areaHeight} L ${areaWidth} 0 L 0 0 z M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} L ${left} ${top} z`}
        />
      </g>
    </svg>
  );
}

type HandleProps = {
  xAssign: "x1" | "x2";
  yAssign: "y1" | "y2";
  x: number;
  y: number;
  id: string;
  onDragStart?: (
    xAssign: "x1" | "x2",
    yAssign: "y1" | "y2",
    handleId: string,
  ) => void;
};

function Handle(props: HandleProps) {
  const { xAssign, yAssign, x, y, id, onDragStart } = props;

  const onMouseDown = useCallback(() => {
    onDragStart?.(xAssign, yAssign, id);
  }, [xAssign, yAssign, id, onDragStart]);

  return (
    <div
      style={{ left: x, top: y }}
      css={css`
        position: absolute;
        width: 2em;
        height: 2em;
        background-color: #fff;
        border: solid 1px #666;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        user-select: none;
        cursor: grab;
      `}
      onMouseDown={onMouseDown}
    ></div>
  );
}

type BoundingSelectorProps = {
  width: string;
  height: string;
  state: BoundingSelectorState;
  dispatch: React.Dispatch<BoundingSelectorEvent>;
};

export default function BoundingSelector(props: BoundingSelectorProps) {
  const { width, height, state, dispatch } = props;

  const { boundingClientRect, ref, effectiveScale } = useBoundingClientRect();

  const onHandleDragStart = useCallback(
    (xAssign: "x1" | "x2", yAssign: "y1" | "y2", id: string) => {
      dispatch({
        type: "start-modify-corner-selection",
        xAssign,
        yAssign,
        handleId: id,
      });
    },
    [],
  );

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
      }}
      css={css`
        position: relative;
        top: 0;
        left: 0;
        color: white;
      `}
      onMouseMove={(ev) =>
        dispatch({
          type: "move-selection",
          x: ev.clientX - ev.currentTarget.getBoundingClientRect().left,
          y: ev.clientY - ev.currentTarget.getBoundingClientRect().top,
        })
      }
      onMouseUp={(ev) =>
        dispatch({
          type: "finish-selection",
          x: ev.clientX - ev.currentTarget.getBoundingClientRect().left,
          y: ev.clientY - ev.currentTarget.getBoundingClientRect().top,
        })
      }
    >
      <BoundingSelectorBackground
        areaWidth={boundingClientRect?.width ?? 0}
        areaHeight={boundingClientRect?.height ?? 0}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        {...bounding(state)}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: boundingClientRect?.width ?? 0,
          height: boundingClientRect?.height ?? 0,
          transform: `scale(${effectiveScale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            cursor: crosshair;
          `}
          onMouseDown={(ev) =>
            dispatch({
              type: "start-selection",
              x: ev.clientX - ev.currentTarget.getBoundingClientRect().left,
              y: ev.clientY - ev.currentTarget.getBoundingClientRect().top,
            })
          }
        ></div>
        {state.type === "selected" ? (
          <>
            <Handle
              xAssign="x1"
              yAssign="y1"
              x={state.x1}
              y={state.y1}
              id="handle-x1-y1"
              onDragStart={onHandleDragStart}
            />
            <Handle
              xAssign="x2"
              yAssign="y2"
              x={state.x2}
              y={state.y2}
              id="handle-x2-y2"
              onDragStart={onHandleDragStart}
            />
            <Handle
              xAssign="x1"
              yAssign="y2"
              x={state.x1}
              y={state.y2}
              id="handle-x1-y2"
              onDragStart={onHandleDragStart}
            />
            <Handle
              xAssign="x2"
              yAssign="y1"
              x={state.x2}
              y={state.y1}
              id="handle-x2-y1"
              onDragStart={onHandleDragStart}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
