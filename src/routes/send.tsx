import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import Switch, { Case } from "@/Switch";
import { useImageValidity } from "@/useImageValidity";
import { useAtomValue, useSetAtom } from "jotai";
import {
  sendImageToVideoPlayerAtom,
  sendImageToImageViewerAtom,
  sendStateAtom,
  setFileToSendAtom,
  fileToSendAtom,
} from "@/atoms";
import SendToVideoPlayerMode from "@/SendToVideoPlayerMode";
import SendToImageViewerMode from "@/SendToImageViewerMode";
import useSWR from "swr";
import { convertFileSrc } from "@tauri-apps/api/core";

import { extractImageProps } from "@/extractImageProps";
import { css } from "storybook/internal/theming";
import ImageFilePicker from "@/ImageFilePicker";
import GraphicButton from "@/GraphicButton";
import Video from "@/assets/Video.png";
import Tab from "@/assets/Tab.png";
import Print from "@/assets/Print.png";

export const Route = createFileRoute("/send")({
  component: SendPage,
});

function SendPage() {
  const pickedFilePath = useAtomValue(fileToSendAtom);

  const sendState = useAtomValue(sendStateAtom);

  const sendImageToVideoPlayer = useSetAtom(sendImageToVideoPlayerAtom);
  const sendImageToImageViewer = useSetAtom(sendImageToImageViewerAtom);

  const imageValidity = useImageValidity(pickedFilePath);

  const onSendToVideoPlayerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert("ファイルが選択されていません");
      return;
    }

    sendImageToVideoPlayer(pickedFilePath);
  }, [pickedFilePath]);

  const onSendToImageViewerClicked = useCallback(() => {
    if (!pickedFilePath) {
      alert("ファイルが選択されていません");
      return;
    }

    sendImageToImageViewer(pickedFilePath);
  }, [pickedFilePath]);

  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = useCallback(
    (filePath: string | undefined) => {
      if (filePath) {
        setFileToSend(filePath);
      }
    },
    [setFileToSend],
  );

  const imageFileSrc = useMemo(
    () => pickedFilePath && convertFileSrc(pickedFilePath),
    [pickedFilePath],
  );

  const { data: imageProps } = useSWR(
    imageFileSrc ? [imageFileSrc, "imageProps"] : null,
    ([imageFileSrc]) => {
      return extractImageProps(imageFileSrc);
    },
  );

  const isFilePicking = sendState?.mode === undefined;

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
          <Switch value={sendState?.mode}>
            <Case value="video_player">
              <SendToVideoPlayerMode />
            </Case>
            <Case value="image_viewer">
              <SendToImageViewerMode />
            </Case>
          </Switch>
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
