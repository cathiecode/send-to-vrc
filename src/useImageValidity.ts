import { invoke } from "@tauri-apps/api/core";
import { atom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo } from "react";

export function useImageValidity(filePath: string | undefined) {
  const isAbleToReadAtom = useMemo(
    () =>
      atom(async () => {
        if (!filePath) {
          return false;
        }

        const a: boolean = await invoke("is_able_to_read_image_file", {
          filePath,
        });

        return a;
      }),
    [filePath],
  );

  const loadableAtom = useMemo(
    () => loadable(isAbleToReadAtom),
    [isAbleToReadAtom],
  );

  const result = useAtomValue(loadableAtom);

  const validity = useMemo(() => {
    switch (result.state) {
      case "loading":
        return "pending";
      case "hasError":
        return "invalid";
      case "hasData":
        return result.data ? "valid" : "invalid";
    }
  }, [result]);

  return validity;
}
