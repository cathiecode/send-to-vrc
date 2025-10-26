import { ReactNode } from "react";
import { css } from "@emotion/react";

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
