import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import { parseArgs } from "./args";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import router from "./router";
import { createTaskAtom } from "./task";
import { Config, loadConfig, saveConfig } from "./config";
import { atomWithRefresh } from "jotai/utils";
import { commands } from "./bindings.gen";

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
  async (get, set, filePath: string) => {
    set(sendStateAtom, {
      mode: "video_player",
      state: { status: "uploading" },
    });

    try {
      for (let i = 0; i < 3; i++) {
        const config = await get(configAtom);
        const apiKey = config.uploaderApiKey;
        const baseUrl = config.uploaderUrlBase;

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

          throw new Error(`アップロードに失敗しました: ${result.error}`);
        }

        const url = result.data;

        if (get(shouldCopyAfterUploadAtom)) {
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

export const shouldCopyAfterUploadAtom = atom(
  (get) => mapPromise(get(configAtom), (c) => c.copyOnUpload),
  async (_get, set, v: boolean) => {
    set(configAtom, { copyOnUpload: v });
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
        const config = await get(configAtom);
        const apiKey = config.uploaderApiKey;
        const baseUrl = config.uploaderUrlBase;

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

          throw new Error(`アップロードに失敗しました: ${result.error}`);
        }

        const url = result.data;

        if (get(shouldCopyAfterUploadAtom)) {
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

export const registerRequestAtom = createTaskAtom<void>();

let configCache: Config | null = null;

const configValueAtom = atomWithRefresh<Config | Promise<Config>>(() => {
  if (!configCache) {
    return (async () => {
      configCache = await loadConfig();

      return configCache;
    })();
  }
  return configCache;
});

export const configAtom = atom(
  (get) => {
    return get(configValueAtom);
  },
  async (get, set, partialConfig: Partial<Config>) => {
    const oldConfig = await get(configAtom);

    configCache = { ...oldConfig, ...partialConfig };

    await saveConfig(configCache);

    set(configValueAtom);
  },
);

function mapPromise<T, U>(v: T | Promise<T>, map: (v: T) => U): U | Promise<U> {
  if (v instanceof Promise) {
    return v.then(map);
  }

  return map(v);
}
