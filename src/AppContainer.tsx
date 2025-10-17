import { css } from "@emotion/react";
import FileDrop from "./FileDrop";
import NavigationBar from "./NavigationBar";
import RegisterOverlay from "./RegisterOverlay";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        min-height: 100vh;
      `}
    >
      <NavigationBar />
      {children}
      <FileDrop />
      <RegisterOverlay />
    </div>
  );
}
