import { css } from "@emotion/react";
import ImageFilePicker from "./ImageFilePicker";
import SendToVideoPlayerMode from "./SendToVideoPlayerMode";
import SendToImageViewerMode from "./SendToImageViewerMode";
import { SendState } from "@/stores/atoms";
import useSWR from "swr";
import { extractImageProps } from "./extractImageProps";
import ButtonCard from "@/components/ui/ButtonCard";
import { TbClipboard, TbMovie, TbPhotoUp, TbPrinter } from "react-icons/tb";
import Card, {
  CardAction,
  CardDescription,
  CardIcon,
  CardTitle,
} from "@/components/ui/Card";
import { useCallback, useId } from "react";
import SendToVRChatPrintMode from "./SendToVRChatPrintMode";
import { useLocalized } from "@/i18n";

type SendPageComponentProps = {
  sendState: SendState | undefined;
  pickedFilePath: string | undefined;
  imageFileSrc: string | undefined;
  imageValidity: "valid" | "invalid" | "pending";
  shouldCopyAfterUpload: boolean;
  vrchatPrint: boolean;
  onFilePicked: (filePath: string | undefined) => void;
  onSendToVideoPlayerClicked: () => void;
  onSendToImageViewerClicked: () => void;
  onSendToVrchatPrintClicked: () => void;
  onShouldCopyAfterUploadChanged?: (v: boolean) => void;
};

export default function SendPageComponent(props: SendPageComponentProps) {
  const {
    sendState,
    pickedFilePath,
    imageFileSrc,
    imageValidity,
    vrchatPrint,
    onFilePicked,
    onSendToImageViewerClicked,
    onSendToVideoPlayerClicked,
    onSendToVrchatPrintClicked,
  } = props;
  const isFilePicking = sendState?.mode === undefined;

  const { data: imageProps } = useSWR(
    imageFileSrc ? [imageFileSrc, "imageProps"] : null,
    ([imageFileSrc]) => {
      return extractImageProps(imageFileSrc);
    },
  );

  const checkboxId = useId();

  const onShouldCopyAfterUploadChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      props.onShouldCopyAfterUploadChanged?.(e.target.checked);
    },
    [],
  );

  const localized = useLocalized();

  return (
    <div
      css={css`
        position: relative;
        flex-grow: 1;
        & * {
          box-sizing: border-box;
        }
      `}
    >
      <div
        css={css`
          display: flex;
          position: absolute;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          height: 20em;
          top: 0em;
          left: 0;
          right: 0;
          transition: height 1s;
          ${isFilePicking ? "" : "height: calc(100% - 4em);"}
        `}
      >
        <ImageFilePicker
          pickedFilePath={pickedFilePath}
          imageSrc={imageProps?.src}
          height="20em"
          maxWidth="calc(100% - 8em)"
          readonly={!isFilePicking}
          pickedFileValidity={imageValidity}
          onFilePicked={onFilePicked}
        />
        <div
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            transition:
              margin-top 1s 0s,
              height 1s 0s;
            margin-top: 2em;
            height: 9em;
            ${isFilePicking
              ? "margin-top: 0em; height: 0em; opacity: 0; user-select: none; pointer-events: none;"
              : null}
            ${!isFilePicking ? "animation: fadeIn 1s 1s both;" : null}
            @keyframes fadeIn {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
          `}
        >
          {(() => {
            switch (sendState?.mode) {
              case "video_player":
                return <SendToVideoPlayerMode state={sendState.state} />;
              case "image_viewer":
                return <SendToImageViewerMode state={sendState.state} />;
              case "vrchat_print":
                return <SendToVRChatPrintMode state={sendState.state} />;
              default:
                return null;
            }
          })()}
        </div>
      </div>
      <div
        css={css`
          position: absolute;
          width: 100%;
          padding: 2em;
          padding-top: 0;
          top: 22em;
          transition: opacity 0.25s;
          ${!isFilePicking
            ? "opacity: 0; user-select: none; pointer-events: none;"
            : ""}
        `}
      >
        <div
          css={css`
            display: flex;
            gap: 0.25em;
            flex-direction: column;
          `}
        >
          <Card>
            <CardIcon>
              <TbClipboard />
            </CardIcon>
            <CardTitle>{localized("send.copy-on-upload")}</CardTitle>
            <CardDescription style={{ right: "4em" }}>
              {localized("send.copy-on-upload.description")}
            </CardDescription>
            <CardAction>
              <label
                css={css`
                  padding: 0.5em;
                `}
                htmlFor={checkboxId}
              >
                <input
                  type="checkbox"
                  id={checkboxId}
                  css={css`
                    width: 1em;
                  `}
                  checked={props.shouldCopyAfterUpload}
                  onChange={onShouldCopyAfterUploadChange}
                />
              </label>
            </CardAction>
          </Card>
          <ButtonCard
            icon={<TbMovie />}
            title={localized("send.send-to-video-player")}
            description={localized("send.send-to-video-player.description")}
            onClick={onSendToVideoPlayerClicked}
            disabled={imageValidity !== "valid"}
          />
          <ButtonCard
            icon={<TbPhotoUp />}
            title={localized("send.send-to-image-viewer")}
            description={localized("send.send-to-image-viewer.description")}
            onClick={onSendToImageViewerClicked}
            disabled={imageValidity !== "valid"}
          />
          {vrchatPrint ? (
            <ButtonCard
              icon={<TbPrinter />}
              title={localized("send.print-to-vrchat-print")}
              description={localized("send.print-to-vrchat-print.description")}
              onClick={onSendToVrchatPrintClicked}
              disabled={imageValidity !== "valid"}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
