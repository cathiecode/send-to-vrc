import { css } from "@emotion/react";

type GraphicButtonProps = {
  title: string;
  description: string;
  background: string;
  baseColor?: string;
  onClick?: () => void;
};

export default function GraphicButton(props: GraphicButtonProps) {
  const {
    title,
    description,
    background,
    baseColor: baseColorProps,
    onClick,
  } = props;

  const baseColor = baseColorProps ?? "#000";

  return (
    <button
      onClick={onClick}
      css={css`
        position: relative;
        display: block;
        width: 100%;
        height: 6em;
        border: none;
        border-radius: 0.5em;
        overflow: hidden;
        cursor: pointer;
        background-color: #000;
        background-size: cover !important;

        &:hover [data-class="title"] {
          transform: translateY(-1em);
        }

        &:hover [data-class="description"] {
          opacity: 1;
        }
      `}
      style={{ background }}
    >
      <div
        css={css`
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            to right,
            rgb(from ${baseColor} r g b / 1) 30%,
            rgb(from ${baseColor} r g b / 0) 90%
          );
        `}
      />
      <div
        data-class="title"
        css={css`
          position: absolute;
          left: 1em;
          bottom: 1em;
          color: #fff;
          transform: translateY(0);
          transition: transform 0.5s cubic-bezier(0, 0.9, 0.1, 1);
        `}
      >
        <span
          css={css`
            font-size: 1.25em;
          `}
        >
          {title}
        </span>
      </div>
      <div
        data-class="description"
        css={css`
          position: absolute;
          left: 1em;
          bottom: 1em;
          opacity: 0;
          color: #ddd;
          transition: opacity 0.5s cubic-bezier(0, 0.9, 0.1, 1);
        `}
      >
        {description}
      </div>
    </button>
  );
}
