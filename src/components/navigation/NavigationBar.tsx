import { css } from "@emotion/react";
import BackButton from "./BackButton";

export default function NavigationBar() {
  return (
    <div
      css={css`
        position: sticky;
        top: 0;
        padding: 0.25em;
      `}
    >
      <BackButton />
    </div>
  );
}
