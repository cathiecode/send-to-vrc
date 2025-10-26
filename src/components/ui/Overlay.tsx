import { ReactNode } from "react";
import { css } from "@emotion/react";

type OverlayProps = {
  children: ReactNode;
};

export default function Overlay(props: OverlayProps) {
  const { children } = props;

  return (
    <div
      css={css`
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.5);
      `}
    >
      <div
        css={css`
          width: calc(100vw - 6em);
          height: calc(100vh - 12em);
          background: white;
          padding: 1em;
          border-radius: 0.5em;
        `}
      >
        {children}
      </div>
    </div>
  );
}
