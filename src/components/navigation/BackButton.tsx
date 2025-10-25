import { css } from "@emotion/react";
import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { TbArrowLeft } from "react-icons/tb";

export default function BackButton() {
  const router = useRouter();
  const canBack = useCanGoBack();

  const onClick = useCallback(() => {
    router.history.back();
  }, [router]);

  return (
    <button
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5em;
        height: 1.5em;
        border: none;
        font-size: 1.5em;
        color: #555;
        background-color: transparent;
        border-radius: 0.1em;

        &:disabled {
          color: #aaa;
        }

        &:hover:enabled {
          background-color: #0001;
        }
      `}
      onClick={onClick}
      disabled={!canBack}
    >
      <TbArrowLeft />
    </button>
  );
}
