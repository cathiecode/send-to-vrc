import ErrorComponent from "@/ErrorComponent";
import NavigationBar from "@/NavigationBar";
import { css } from "@emotion/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import FileDrop from "@/FileDrop";
import RegisterOverlay from "@/RegisterOverlay";

const RootLayout = () => {
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
      <Outlet />
      <FileDrop />
      <RegisterOverlay />
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: ErrorComponent,
});
