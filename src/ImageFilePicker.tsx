import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import ImageFilePickerComponent from "./ImageFilePickerComponent";

type ImageFilePickerProps = {
  imageSrc?: string;
  pickedFilePath?: string;
  pickedFileValidity: "pending" | "valid" | "invalid";
  height: string;
  maxWidth?: string
  readonly?: boolean;
  onFilePicked?: (path: string | undefined) => void;
};

export default function ImageFilePicker(props: ImageFilePickerProps) {
  const { onFilePicked, ...baseProps } = props;

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
    <ImageFilePickerComponent
      onOpenClicked={onOpenClicked}
      {...baseProps}
    />
  );
}
