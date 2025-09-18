import { useCallback, useId, useMemo } from "react";
import Switch, { Case } from "./Switch";
import { useImageValidity } from "./useImageValidity";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  configAtom,
  sendImageToVideoPlayerAtom,
  sendImageToImageViewerAtom,
  sendStateAtom,
  setFileToSendAtom,
  fileToSendAtom,
} from "./atoms";
import SendToVideoPlayerMode from "./SendToVideoPlayerMode";
import SendToImageViewerMode from "./SendToImageViewerMode";
import useSWR from "swr";
import { convertFileSrc } from "@tauri-apps/api/core";

import { extractImageProps } from "./extractImageProps";
import { css } from "storybook/internal/theming";
import ImageFilePicker from "./ImageFilePicker";
import ButtonCard from "./ButtonCard";
import { TbClipboard, TbMovie, TbPhotoUp, TbPrinter } from "react-icons/tb";
import Card, { CardIcon, CardTitle, CardDescription, CardAction } from "./Card";

export default function SendMode() {
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

  const [config, setConfig] = useAtom(configAtom);

  const copyOnUploadId = useId();

  const setFileToSend = useSetAtom(setFileToSendAtom);

  const onFilePicked = useCallback(
    (filePath: string | undefined) => {
      if (filePath) {
        setFileToSend(filePath);
      }
    },
    [setFileToSend]
  );

  const imageFileSrc = useMemo(
    () => pickedFilePath && convertFileSrc(pickedFilePath),
    [pickedFilePath]
  );

  const { data: imageProps } = useSWR(
    imageFileSrc ? [imageFileSrc, "imageProps"] : null,
    ([imageFileSrc]) => {
      return extractImageProps(imageFileSrc);
    }
  );

  const isFilePicking = sendState?.mode === undefined;

  return (
    <div
      css={css`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
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
          top: 2em;
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
          top: 24em;
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
            <CardTitle>自動でクリップボードにコピー</CardTitle>
            <CardDescription>
              必要な場合、アップロード完了時にURLをクリップボードにコピーします
            </CardDescription>
            <CardAction>
              <label css={css`padding: .5em;`}>
                <input
                  id={copyOnUploadId}
                  type="checkbox"
                  checked={config.copyOnUpload}
                  onChange={(ev) =>
                    setConfig({ copyOnUpload: ev.currentTarget.checked })
                  }
                />
              </label>
            </CardAction>
          </Card>

          <ButtonCard
            icon={<TbMovie />}
            title="動画プレイヤーに映す"
            description="動画プレイヤーに画像を表示する"
            onClick={onSendToVideoPlayerClicked}
          />
          <ButtonCard
            icon={<TbPhotoUp />}
            title="静止画ビューアに映す"
            description="静止画ビューアに画像を表示する"
            onClick={onSendToImageViewerClicked}
          />
          <ButtonCard
            icon={<TbPrinter />}
            title="VRChat Printで印刷する"
            description="VRChat Printとして画像をアップロードします(開発中)"
            onClick={() => alert("開発中です!")}
          />
        </div>
      </div>
    </div>
  );
}
