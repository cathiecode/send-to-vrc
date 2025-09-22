import { Suspense } from "react";
import FileDrop from "./FileDrop";
import { RouterProvider } from "@tanstack/react-router";
import router from "./router";

function App() {
  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
      <FileDrop />
    </Suspense>
  );
}

export default App;
