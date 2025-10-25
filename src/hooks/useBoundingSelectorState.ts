import { useReducer } from "react";

export type BoundingSelectorEvent =
  | {
      type: "start-selection" | "finish-selection" | "move-selection";
      x: number;
      y: number;
    }
  | {
      type: "start-modify-corner-selection";
      handleId: string;
      xAssign: "x1" | "x2";
      yAssign: "y1" | "y2";
    }
  | {
      type: "finish-modify-corner-selection";
    };

export type BoundingSelectorState =
  | {
      type: "idle";
    }
  | {
      type: "selecting" | "selected";
      y1: number;
      x1: number;
      x2: number;
      y2: number;
    }
  | {
      type: "modifying-corner";
      xAssign: "x1" | "x2";
      yAssign: "y1" | "y2";
      y1: number;
      x1: number;
      x2: number;
      y2: number;
      handleId: string;
    };

export const stateMachine = (
  state: BoundingSelectorState,
  event: BoundingSelectorEvent,
): BoundingSelectorState => {
  switch (event.type) {
    case "start-selection":
      if (state.type === "idle" || state.type === "selected") {
        return {
          type: "selecting",
          y1: event.y,
          x1: event.x,
          x2: event.x,
          y2: event.y,
        };
      }
      break;

    case "move-selection":
      if (state.type === "selecting") {
        return {
          type: "selecting",
          x1: state.x1,
          y1: state.y1,
          x2: event.x,
          y2: event.y,
        };
      }

      if (state.type === "modifying-corner") {
        return {
          type: "modifying-corner",
          handleId: state.handleId,
          xAssign: state.xAssign,
          yAssign: state.yAssign,
          x1: state.xAssign === "x1" ? event.x : state.x1,
          y1: state.yAssign === "y1" ? event.y : state.y1,
          x2: state.xAssign === "x2" ? event.x : state.x2,
          y2: state.yAssign === "y2" ? event.y : state.y2,
        };
      }

      break;

    case "finish-selection":
      if (state.type === "selecting") {
        return {
          type: "selected",
          x1: state.x1,
          y1: state.y1,
          x2: state.x2,
          y2: state.y2,
        };
      }
      if (state.type === "modifying-corner") {
        return {
          type: "selected",
          x1: state.x1,
          y1: state.y1,
          x2: state.x2,
          y2: state.y2,
        };
      }
      break;

    case "start-modify-corner-selection":
      if (state.type === "selected") {
        return {
          type: "modifying-corner",
          handleId: event.handleId,
          xAssign: event.xAssign,
          yAssign: event.yAssign,
          x1: state.x1,
          y1: state.y1,
          x2: state.x2,
          y2: state.y2,
        };
      }
      break;

    case "finish-modify-corner-selection":
      if (state.type === "modifying-corner") {
        return {
          type: "selected",
          x1: state.x1,
          y1: state.y1,
          x2: state.x2,
          y2: state.y2,
        };
      }
      break;
  }

  return state;
};

export default function useBoundingSelectorState(
  initialState: BoundingSelectorState = { type: "idle" },
) {
  return useReducer(stateMachine, initialState);
}

export function bounding(state: BoundingSelectorState): {
  top: number;
  left: number;
  right: number;
  bottom: number;
} {
  switch (state.type) {
    case "idle":
      return {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      };
    case "selecting":
    case "selected":
      return {
        top: Math.min(state.y1, state.y2),
        left: Math.min(state.x1, state.x2),
        right: Math.max(state.x1, state.x2),
        bottom: Math.max(state.y1, state.y2),
      };
    case "modifying-corner":
      return {
        top: Math.min(state.y1, state.y2),
        left: Math.min(state.x1, state.x2),
        right: Math.max(state.x1, state.x2),
        bottom: Math.max(state.y1, state.y2),
      };
  }
}
