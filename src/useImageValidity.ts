import { atom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo } from "react";
import { commands } from "./bindings.gen";

export function useImageValidity(
  fileSendRequest: { filePath: string; requestedAt: number } | undefined,
) {
  const isAbleToReadAtom = useMemo(
    () =>
      atom(async () => {
        if (!fileSendRequest?.filePath) {
          return false;
        }

        const result = await commands.isAbleToReadImageFile(
          fileSendRequest.filePath,
        );

        if (result.status === "error") {
          throw new Error("Failed to check image validity: " + result.error);
        }

        return result.data;
      }),
    [fileSendRequest],
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
