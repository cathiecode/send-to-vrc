import { useCallback, useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

type OnEnterHandler = () => void;
type OnDropHandler = (filePath: string) => void;
type OnOverHandler = () => void;
type OnLeaveHandler = () => void;

type Handlers = {
  onEnterHandler?: OnEnterHandler;
  onDropHandler?: OnDropHandler;
  onOverHandler?: OnOverHandler;
  onLeaveHandler?: OnLeaveHandler;
};

export function listenFileOpenRequest(handlers: Handlers) {
  const unlistenPromise = getCurrentWebview().onDragDropEvent((event) => {
    switch (event.payload.type) {
      case "enter":
        handlers.onEnterHandler?.();
        break;
      case "drop":
        if (event.payload.paths.length > 0) {
          handlers.onDropHandler?.(event.payload.paths[0]);
        }
        break;
      case "over":
        handlers.onOverHandler?.();
        break;
      case "leave":
        handlers.onLeaveHandler?.();
        break;
    }
  });

  return () => {
    unlistenPromise.then((unlisten) => {
      unlisten();
    });
  };
}

export function useFileOpenRequest(handlers: Handlers) {
  const [isOver, setIsOver] = useState(false);

  const { onEnterHandler, onDropHandler, onOverHandler, onLeaveHandler } =
    handlers;

  const onEnter = useCallback(() => {
    setIsOver(true);
    onEnterHandler?.();
  }, []);

  const onDrop = useCallback((filePath: string) => {
    setIsOver(false);
    onDropHandler?.(filePath);
  }, []);

  const onOver = useCallback(() => {
    setIsOver(true);
    onOverHandler?.();
  }, []);

  const onLeave = useCallback(() => {
    setIsOver(false);
    onLeaveHandler?.();
  }, []);

  useEffect(() => {
    const unlisten = listenFileOpenRequest({
      onEnterHandler: onEnter,
      onDropHandler: onDrop,
      onOverHandler: onOver,
      onLeaveHandler: onLeave,
    });

    return () => {
      unlisten();
    };
  }, [onEnterHandler, onDropHandler, onOverHandler, onLeaveHandler]);

  return {
    isOver,
  };
}
