import { Suspense } from "react";
import FileDrop from "./FileDrop";
import { RouterProvider } from "@tanstack/react-router";
import router from "./router";
import RegisterOverlay from "./RegisterOverlay";

function App() {
  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
      <FileDrop />
      <RegisterOverlay />
    </Suspense>
  );
}

export default App;
