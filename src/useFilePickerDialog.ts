import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";

export default function useFilePickerDialog(
  onFilePicked?: (path: string | undefined) => void,
) {
  return useCallback(() => {
    open({
      multiple: false,
      directory: false,
    }).then((selected) => {
      if (typeof selected === "string") {
        if (onFilePicked) {
          onFilePicked(selected);
        }
      } else {
        if (onFilePicked) {
          onFilePicked(undefined);
        }
      }
    });
  }, [onFilePicked]);
}
