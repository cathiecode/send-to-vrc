import { css } from "@emotion/react";
import BackButton from "./BackButton";
import HomeButton from "./HomeButton";

export default function NavigationBar() {
  return (
    <div
      css={css`
        position: sticky;
        top: 0;
        padding: 0.25em;
        z-index: 10;
      `}
    >
      <BackButton />
      <HomeButton />
    </div>
  );
}
