import { useCallback } from "react";
import { TbHome } from "react-icons/tb";
import { css } from "@emotion/react";
import { useRouter } from "@tanstack/react-router";

export default function HomeButton() {
  const router = useRouter();
  const canGoHome = router.state.location.pathname !== "/";

  const onClick = useCallback(() => {
    if (router.state.location.pathname !== "/") {
      location.href = "/"; // Force full reload to reset state
    }
  }, [router]);

  return (
    <button
      css={css`
        display: inline-flex;
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
      disabled={!canGoHome}
    >
      <TbHome />
    </button>
  );
}
