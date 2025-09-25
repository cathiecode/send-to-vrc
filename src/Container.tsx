import { css } from "@emotion/react";
import { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
};

export default function Container(props: ContainerProps) {
  const { children } = props;
  return (
    <div
      css={css`
        padding: 2em;
      `}
    >
      {children}
    </div>
  );
}
