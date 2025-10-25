import ErrorComponent from "@/components/layout/ErrorComponent";
import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  // component: RootLayout,
  errorComponent: ErrorComponent,
});
