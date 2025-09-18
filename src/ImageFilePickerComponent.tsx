import { useMemo } from "react";
import { css } from "storybook/internal/theming";
import useSWR from "swr";
import { extractImageProps } from "./extractImageProps";

type ImageFilePickerComponentProps = {
  imageSrc?: string;
  maxWidth?: string;
  height: string;
  readonly?: boolean;
  pickedFilePath?: string;
  pickedFileValidity: "pending" | "valid" | "invalid";
  onOpenClicked?: () => void;
};

export default function ImageFilePickerComponent(
  props: ImageFilePickerComponentProps,
) {
  const { imageSrc, readonly, height, pickedFileValidity, onOpenClicked } =
    props;

  const { data: imageProps } = useSWR(
    () => imageSrc && [imageSrc, "imageProps"],
    ([imageSrc]) => {
      return extractImageProps(imageSrc);
    },
  );

  const imageRatio = useMemo(() => {
    if (imageProps) {
      return imageProps.width / imageProps.height;
    }
    return 1;
  }, [imageProps]);

  return (
    <div
      css={css`
        position: relative;
        width: calc(${height} * ${imageRatio});
        height: ${height};
        min-height: 5em;
        max-width: ${props.maxWidth ?? "100%"};
      `}
    >
      <img
        src={imageSrc}
        alt=""
        css={css`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #eee;
          filter: blur(1em);
          object-fit: cover;
          ${pickedFileValidity === "valid"
            ? "animation: fadeIn 1s both;"
            : "opacity: 0;"}
          user-select: none;
          pointer-events: none;

          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 0.8;
            }
          }
        `}
      />
      <div
        css={css`
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background-color: #999;
          border-radius: 0.5em;
          overflow: hidden;

          ${pickedFileValidity === "pending"
            ? "animation: pulse 1s infinite;"
            : ""}
          ${pickedFileValidity === "invalid" ? "background-color: #ccc;" : ""}
        ${pickedFileValidity === "valid" ? "background-color: #fff;" : ""}

        @keyframes pulse {
            0% {
              background-color: #eee;
            }
            50% {
              background-color: #ccc;
            }
            100% {
              background-color: #eee;
            }
          }
        `}
      >
        <img
          src={imageSrc}
          alt=""
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #eee;
            object-fit: cover;

            ${pickedFileValidity === "valid" ? "opacity: 1" : "opacity: 0"}
          `}
        />

        {readonly ? null : (
          <button
            css={css`
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;

              background-color: #0009;
              cursor: pointer;
              opacity: 0;
              transition: opacity 0.2s;
              color: #fff;

              :hover {
                opacity: 1;
              }
            `}
            onClick={onOpenClicked}
          >
            画像ファイルを選択
          </button>
        )}
      </div>
    </div>
  );
}
