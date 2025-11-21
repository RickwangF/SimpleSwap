import { createHashRouter } from "react-router-dom";
import { Mint } from "../components/Mint.tsx";
import App from "../App.tsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/mint",
    element: <Mint />,
  },
]);

export default router;
