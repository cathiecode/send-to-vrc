import { setFileToSendAtom } from "@/atoms";
import Button from "@/Button";
import Container from "@/Container";
import useFilePickerDialog from "@/useFilePickerDialog";
import { css } from "@emotion/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import Logo from "@/assets/logo.png";
import { useLocalized } from "@/i18n";
import { commands } from "@/bindings.gen";
import AppLayout from "@/AppContainer";
import { TbPhotoScan } from "react-icons/tb";

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

  const localized = useLocalized();

  return (
    <AppLayout>
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
          <div
            css={css`
              display: flex;
              justify-content: center;
              gap: 0.5em;
              flex-wrap: wrap;
            `}
          >
            <Button onClick={onFilePickClicked}>
              {localized("send.select-file-for-upload")}
            </Button>
            <Button
              onClick={() => {
                commands.startCapture().catch(console.error);
              }}
            >
              <TbPhotoScan /> {localized("capture.start")}
            </Button>
          </div>
          <div
            css={css`
              margin-top: 1em;
            `}
          >
            <Link to="/about">
              <Button variant="secondary">
                {localized("about.open-about-page")}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </AppLayout>
  );
}
