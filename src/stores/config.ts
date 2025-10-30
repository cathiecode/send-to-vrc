import { WritableAtom, atom } from "jotai";
import { commands } from "@/bindings.gen";

const cacheInvalidateAtom = atom(0);

function readConfigAtom(key: string) {
  return atom(
    async (get) => {
      const result = await commands.readConfigValue(key);

      if (result.status === "error") {
        throw new Error("Failed to read config value: " + result.error);
      }

      get(cacheInvalidateAtom); // depend on cache invalidation

      return result.data ?? undefined;
    },
    async (_get, set, value: string) => {
      await commands.writeConfigValue(key, value);
      set(cacheInvalidateAtom, (c) => c + 1);
    },
  );
}

function withDefaultValue(
  baseAtom: WritableAtom<Promise<string | undefined>, [string], Promise<void>>,
  defaultValue: string,
): WritableAtom<Promise<string>, [string], void> {
  return atom(
    async (get) => {
      const v = await get(baseAtom);
      return v === undefined ? defaultValue : v;
    },
    (_get, set, value: string) => {
      set(baseAtom, value);
    },
  );
}

const shouldCopyAfterUploadBaseAtom = readConfigAtom(
  "should_copy_after_upload",
);

export const shouldCopyAfterUploadAtom = atom(
  async (get) =>
    ((await get(shouldCopyAfterUploadBaseAtom)) ?? "true") === "true",
  (_get, set, value: boolean) => {
    set(shouldCopyAfterUploadBaseAtom, value ? "true" : "false");
  },
);

export const uploaderApiKeyAtom = readConfigAtom("uploader_api_key");

export const uploaderUrlBaseAtom = withDefaultValue(
  readConfigAtom("uploader_url_base"),
  "https://s2v-upload.superneko.net",
);

// NOTE: This is dummy atom. The actual read/write is done in Rust code.
export const vrchatApiKeyAtom = atom(
  (get) => {
    get(cacheInvalidateAtom); // depend on cache invalidation
    return { __dummy: cacheInvalidateAtom };
  },
  (_get, set) => {
    set(cacheInvalidateAtom, (c) => c + 1);
  },
);

export const configuredLangAtom = readConfigAtom("language");
