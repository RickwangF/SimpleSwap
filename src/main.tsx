import "@ant-design/v5-patch-for-react-19";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Providers } from "./Providers.tsx";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { PoolManagerProvider } from "./PoolManagerContext.tsx";
import { PositionManagerProvider } from "./PositionManagerContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <PoolManagerProvider>
        <PositionManagerProvider>
          <RouterProvider router={router} />
        </PositionManagerProvider>
      </PoolManagerProvider>
    </Providers>
  </StrictMode>
);
