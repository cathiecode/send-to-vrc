import { createRootRoute } from "@tanstack/react-router";
import ErrorComponent from "@/components/layout/ErrorComponent";

export const Route = createRootRoute({
  // component: RootLayout,
  errorComponent: ErrorComponent,
});
