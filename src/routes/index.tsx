import { setFileToSendAtom } from "@/atoms";
import Button from "@/Button";
import Container from "@/Container";
import useFilePickerDialog from "@/useFilePickerDialog";
import { css } from "@emotion/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import Logo from "@/assets/logo.png";

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
      <div
        css={css`
          text-align: center;
        `}
      >
        <img
          css={css`
            background-color: #fff;
            border-radius: 50%;
            padding: 0.5em;
          `}
          src={Logo}
          alt=""
          width="128"
          height="128"
        />
        <h1
          css={css`
            margin-top: 0;
          `}
        >
          Send to VRC
        </h1>
        <div>
          <Button onClick={onFilePickClicked}>
            アップロードする画像ファイルを選択
          </Button>
        </div>
        <div
          css={css`
            margin-top: 1em;
          `}
        >
          <Link to="/about">
            <Button variant="secondary">このソフトウェアについて</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
