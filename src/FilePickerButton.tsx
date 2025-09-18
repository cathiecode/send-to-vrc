import { useCallback } from "react"
import { open } from "@tauri-apps/plugin-dialog";

type FilePickerButtonProps = {
  onFilePicked?: (path: string | undefined) => void;
};

export default function FilePickerButton(props: FilePickerButtonProps) {
  const { onFilePicked } = props;

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

  return <button onClick={onOpenClicked}>Open</button>
}
