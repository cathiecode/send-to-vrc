import { css } from "@emotion/react";
import ImageFilePicker from "./ImageFilePicker";
import SendToVideoPlayerMode from "./SendToVideoPlayerMode";
import SendToImageViewerMode from "./SendToImageViewerMode";
import GraphicButton from "./GraphicButton";
import { SendState } from "./atoms";
import useSWR from "swr";
import { extractImageProps } from "./extractImageProps";
import Video from "@/assets/Video.png";
import Tab from "@/assets/Tab.png";
import Print from "@/assets/Print.png";

type SendPageComponentProps = {
  sendState: SendState | undefined;
  pickedFilePath: string | undefined;
  imageFileSrc: string | undefined;
  imageValidity: "valid" | "invalid" | "pending";
  onFilePicked: (filePath: string | undefined) => void;
  onSendToVideoPlayerClicked: () => void;
  onSendToImageViewerClicked: () => void;
};

export default function SendPageComponent(props: SendPageComponentProps) {
  const {
    sendState,
    pickedFilePath,
    imageFileSrc,
    imageValidity,
    onFilePicked,
    onSendToImageViewerClicked,
    onSendToVideoPlayerClicked,
  } = props;
  const isFilePicking = sendState?.mode === undefined;

  const { data: imageProps } = useSWR(
    imageFileSrc ? [imageFileSrc, "imageProps"] : null,
    ([imageFileSrc]) => {
      return extractImageProps(imageFileSrc);
    },
  );

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
            height: 4em;
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
          <GraphicButton
            title="動画プレイヤーに映す"
            description="クラウドサービスに動画としてアップロードする"
            background={`url(${Video})`}
            baseColor="rgba(30, 133, 133, 1)"
            onClick={onSendToVideoPlayerClicked}
          />
          <GraphicButton
            title="静止画ビューアに映す"
            description="クラウドサービスに静止画としてアップロードする"
            background={`url(${Tab})`}
            baseColor="rgba(30, 99, 133, 1)"
            onClick={onSendToImageViewerClicked}
          />
          <GraphicButton
            title="VRChat Printで印刷する"
            description="VRChat Printとして画像をアップロードします(開発中)"
            background={`url(${Print})`}
            baseColor="rgba(133, 98, 30, 1)"
            onClick={() => alert("開発中です!")}
          />
        </div>
      </div>
    </div>
  );
}
