import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import { parseArgs } from "./args";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import router from "./router";

let cachedArgs: string[] | null = null;

export const argsAtom = atom((_get) => {
  if (cachedArgs) {
    return cachedArgs;
  }

  return (async () => {
    cachedArgs = (await invoke("get_args")) as string[];

    return cachedArgs;
  })();
});

export const optionsAtom = atom((get) => mapPromise(get(argsAtom), parseArgs));

export type ImageViewerSendState =
  | {
      status: "uploading";
    }
  | {
      status: "done";
      url: string;
    }
  | {
      status: "error";
      message: string;
    };

export type VideoPlayerSendState =
  | {
      status: "uploading";
    }
  | {
      status: "done";
      url: string;
    }
  | {
      status: "error";
      message: string;
    };

export type SendState =
  | {
      mode: "image_viewer";
      state: ImageViewerSendState;
    }
  | {
      mode: "video_player";
      state: VideoPlayerSendState;
    };

export const sendStateAtom = atom<SendState | undefined>();

const fileToSendBaseAtom = atom<string | undefined>();

export const fileToSendAtom = atom(
  (get) => {
    return (
      get(fileToSendBaseAtom) ??
      mapPromise(get(optionsAtom), (opts) => opts.fileToSend)
    );
  },
  (_get, set, filePath: string) => {
    set(fileToSendBaseAtom, filePath);
  },
);

export const setFileToSendAtom = atom(null, (get, set, filePath: string) => {
  const sendState = get(sendStateAtom);
  if (sendState !== undefined && sendState.state.status === "uploading") {
    return;
  }

  set(fileToSendAtom, filePath);
  router.navigate({ href: "/send" });
  set(sendStateAtom, undefined);
});

export const sendImageToVideoPlayerAtom = atom(
  null,
  async (_get, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "video_player",
      state: { status: "uploading" },
    });

    try {
      const url = await invoke("upload_image_to_video_server", { filePath });

      await writeText(url as string);

      set(sendStateAtom, {
        mode: "video_player",
        state: { status: "done", url: url as string },
      });
    } catch (err) {
      set(sendStateAtom, {
        mode: "video_player",
        state: { status: "error", message: String(err) },
      });
    }
  },
);

export const shouldCopyAfterUploadAtom = atom(
  (get) => get(configAtom).copyOnUpload,
  (_get, set, v: boolean) => {
    set(configAtom, { copyOnUpload: v });
  },
);

export const sendImageToImageViewerAtom = atom(
  null,
  async (_gte, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "image_viewer",
      state: { status: "uploading" },
    });

    try {
      const url = await invoke("upload_image_to_image_server", { filePath });

      await writeText(url as string);

      set(sendStateAtom, {
        mode: "image_viewer",
        state: { status: "done", url: url as string },
      });
    } catch (err) {
      set(sendStateAtom, {
        mode: "image_viewer",
        state: { status: "error", message: String(err) },
      });
    }
  },
);

export const copyUploadedUrlToClipboardAtom = atom(null, async (get) => {
  const sendState = get(sendStateAtom);
  if (
    sendState === undefined ||
    (sendState.mode !== "image_viewer" && sendState.mode !== "video_player") ||
    sendState.state.status !== "done"
  ) {
    return;
  }

  await writeText(sendState.state.url);
});

type Config = {
  copyOnUpload: boolean;
};

export const configAtom = atom(
  {
    copyOnUpload: true,
  } as Config,
  (get, set, newConfig: Partial<Config>) => {
    set(configAtom, { ...get(configAtom), ...newConfig });
  },
);

function mapPromise<T, U>(v: T | Promise<T>, map: (v: T) => U): U | Promise<U> {
  if (v instanceof Promise) {
    return v.then(map);
  }

  return map(v);
}
