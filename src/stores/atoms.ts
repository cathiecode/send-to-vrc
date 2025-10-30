import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { vrchatLoginTaskAtom } from "@/features/send-image/stores/vrchat-login";
import router from "@/stores/router";
import { commands } from "@/bindings.gen";
import { parseArgs } from "./args";
import {
  shouldCopyAfterUploadAtom,
  uploaderApiKeyAtom,
  uploaderUrlBaseAtom,
} from "./config";
import { createTaskAtom } from "./task";

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

export type VRChatPrintSendState =
  | {
      status: "uploading";
    }
  | {
      status: "done";
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
    }
  | {
      mode: "vrchat_print";
      state: VRChatPrintSendState;
    };

export const sendStateAtom = atom<SendState | undefined>();

const fileToSendBaseAtom = atom<
  { filePath: string; requestedAt: number } | undefined
>();

export const fileToSendAtom = atom(
  (get) => {
    return (
      get(fileToSendBaseAtom) ??
      mapPromise(get(optionsAtom), (opts) =>
        opts.fileToSend !== undefined
          ? { filePath: opts.fileToSend, requestedAt: 0 }
          : undefined,
      )
    );
  },
  (_get, set, filePath: string) => {
    set(fileToSendBaseAtom, { filePath: filePath, requestedAt: Date.now() });
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
  async (get, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "video_player",
      state: { status: "uploading" },
    });

    try {
      for (let i = 0; i < 3; i++) {
        const apiKey = await get(uploaderApiKeyAtom);
        const baseUrl = await get(uploaderUrlBaseAtom);

        if (apiKey === undefined) {
          // TODO
          await new Promise((resolve, reject) =>
            set(registerRequestAtom, { resolve, reject }),
          );

          continue; // Retry
        }

        const result = await commands.uploadImageToVideoServer(
          filePath,
          apiKey,
          baseUrl,
        );

        if (result.status === "error") {
          if (result.error.type === "UploaderAuthRequired") {
            await new Promise((resolve, reject) =>
              set(registerRequestAtom, { resolve, reject }),
            );

            continue; // Retry
          }

          throw new Error(
            `アップロードに失敗しました: ${result.error.type} ${result.error.message}`,
          );
        }

        const url = result.data;

        if (await get(shouldCopyAfterUploadAtom)) {
          await writeText(url);
        }

        set(sendStateAtom, {
          mode: "video_player",
          state: { status: "done", url: url },
        });

        return;
      }

      throw new Error(
        "アップロードに失敗しました: 不明な原因により失敗しました",
      );
    } catch (err) {
      set(sendStateAtom, {
        mode: "video_player",
        state: { status: "error", message: String(err) },
      });
    }
  },
);

export const sendImageToImageViewerAtom = atom(
  null,
  async (get, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "image_viewer",
      state: { status: "uploading" },
    });

    try {
      for (let i = 0; i < 3; i++) {
        const apiKey = await get(uploaderApiKeyAtom);
        const baseUrl = await get(uploaderUrlBaseAtom);

        if (apiKey === undefined) {
          // TODO
          await new Promise((resolve, reject) =>
            set(registerRequestAtom, { resolve, reject }),
          );

          continue; // Retry
        }

        const result = await commands.uploadImageToImageServer(
          filePath,
          apiKey,
          baseUrl,
        );

        if (result.status === "error") {
          if (result.error.type === "UploaderAuthRequired") {
            await new Promise((resolve, reject) =>
              set(registerRequestAtom, { resolve, reject }),
            );

            continue; // Retry
          }

          throw new Error(
            `アップロードに失敗しました: ${result.error.type} ${result.error.message}`,
          );
        }

        const url = result.data;

        if (await get(shouldCopyAfterUploadAtom)) {
          await writeText(url);
        }

        set(sendStateAtom, {
          mode: "image_viewer",
          state: { status: "done", url: url },
        });

        return;
      }

      throw new Error(
        "アップロードに失敗しました: 不明な原因により失敗しました",
      );
    } catch (err) {
      set(sendStateAtom, {
        mode: "image_viewer",
        state: { status: "error", message: String(err) },
      });
    }
  },
);

export const sendImageToVRChatPrintAtom = atom(
  null,
  async (_get, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "vrchat_print",
      state: { status: "uploading" },
    });

    try {
      for (let i = 0; i < 3; i++) {
        const result = await commands.uploadImageToVrchatPrint(filePath);

        if (result.status === "error") {
          if (result.error.type === "VrchatAuthRequired") {
            await new Promise((resolve, reject) =>
              set(vrchatLoginTaskAtom, { resolve, reject }),
            );

            continue; // Retry
          }

          throw new Error(
            `アップロードに失敗しました: ${result.error.type}: ${result.error.message}`,
          );
        }

        set(sendStateAtom, {
          mode: "vrchat_print",
          state: { status: "done" },
        });

        return;
      }

      throw new Error(
        "アップロードに失敗しました: 不明な原因により失敗しました",
      );
    } catch (err) {
      set(sendStateAtom, {
        mode: "vrchat_print",
        state: { status: "error", message: String(err) },
      });
    }
  },
);

export const registerRequestAtom = createTaskAtom<void>();

function mapPromise<T, U>(v: T | Promise<T>, map: (v: T) => U): U | Promise<U> {
  if (v instanceof Promise) {
    return v.then(map);
  }

  return map(v);
}
