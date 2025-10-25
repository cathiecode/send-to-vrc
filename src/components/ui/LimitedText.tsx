import { css } from "@emotion/react";

type LimitedTextProps = {
  width?: string;
  children: string;
};

export default function LimitedText(props: LimitedTextProps) {
  const { width: widthProps, children } = props;

  const width = widthProps ?? "100%";

  return (
    <div
      css={css`
        display: inline-block;
        width: ${width};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: bottom;
      `}
    >
      {children}
    </div>
  );
}
