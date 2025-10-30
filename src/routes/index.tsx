import { useSetAtom } from "jotai";
import { TbPhotoScan } from "react-icons/tb";
import { css } from "@emotion/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppContainer";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import useFilePickerDialog from "@/hooks/useFilePickerDialog";
import { setFileToSendAtom } from "@/stores/atoms";
import Logo from "@/assets/logo.png";
import { commands } from "@/bindings.gen";
import { useLocalized } from "@/i18n";

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
            <Link to="/config">
              <Button variant="secondary">設定</Button>
            </Link>
          </div>
        </div>
      </Container>
    </AppLayout>
  );
}
