import NavigationBar from "@/NavigationBar";
import { css } from "@emotion/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

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
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
});
