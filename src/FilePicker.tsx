import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import FilePickerComponent from "./FilePickerComponent";

type FilePickerProps = {
  pickedFilePath?: string;
  pickedFileValidity: "pending" | "valid" | "invalid";
  onFilePicked?: (path: string | undefined) => void;
};

export default function FilePicker(props: FilePickerProps) {
  const { pickedFilePath, onFilePicked } = props;

  const onOpenClicked = useCallback(() => {
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

  return (
    <FilePickerComponent
      pickedFilePath={pickedFilePath}
      pickedFileValidity={props.pickedFileValidity}
      onOpenClicked={onOpenClicked}
    />
  );
}
