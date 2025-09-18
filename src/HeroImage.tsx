import { css } from "storybook/internal/theming";

type HeroImageProps = {
  src: string;
  width: string;
  height: string;
  alt?: string;
};

export default function HeroImage(props: HeroImageProps) {
  const { src, width, height } = props;

  const alt = props.alt ?? "";

  return (
    <div
      css={css`
        position: relative;
        display: block;
        width: ${width};
        height: ${height};
      `}
    >
      <img
        src={src}
        alt=""
        css={css`
          position: absolute;
          display: block;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          filter: blur(calc(${width} / 20));
          transform: scale(1);
          opacity: 0.5;
          user-select: none;
        `}
      />
      <img
        src={src}
        alt={alt}
        css={css`
          position: absolute;
          display: block;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 0.5em;
        `}
      />
    </div>
  );
}
