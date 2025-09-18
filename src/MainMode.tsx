import { useSetAtom } from "jotai";
import { setFileToSendAtom } from "./atoms";
import FilePickerButton from "./FilePickerButton";

export default function MainMode() {
  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = (filePath: string | undefined) => {
    if (filePath) {
      setFileToSend(filePath);
    }
  };

  return (
    <div>
      <h1>Main</h1>
      <FilePickerButton
        onFilePicked={onFilePicked}
      />
    </div>
  );
}
