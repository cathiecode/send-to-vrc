import { useSetAtom } from "jotai";
import { setFileToSendAtom } from "./atoms";
import useFilePickerDialog from "./useFilePickerDialog";
import Button from "./Button";

export default function MainMode() {
  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = (filePath: string | undefined) => {
    if (filePath) {
      setFileToSend(filePath);
    }
  };

  const onFilePickClicked = useFilePickerDialog(onFilePicked);

  return (
    <div>
      <h1>SendToVRC</h1>
      <Button onClick={onFilePickClicked}>
        アップロードする画像ファイルを選択
      </Button>
    </div>
  );
}
