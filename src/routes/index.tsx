import { setFileToSendAtom } from "@/atoms";
import Button from "@/Button";
import Container from "@/Container";
import useFilePickerDialog from "@/useFilePickerDialog";
import { css } from "@emotion/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSetAtom } from "jotai";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = (filePath: string | undefined) => {
    if (filePath) {
      setFileToSend(filePath);
    }
  };

  const onFilePickClicked = useFilePickerDialog(onFilePicked);

  return (
    <Container>
      <h1
        css={css`
          margin-top: 0;
        `}
      >
        SendToVRC
      </h1>
      <Button onClick={onFilePickClicked}>
        アップロードする画像ファイルを選択
      </Button>
      <Link to="/about">
        <Button variant="secondary">このソフトウェアについて</Button>
      </Link>
    </Container>
  );
}
