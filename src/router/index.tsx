import { createHashRouter } from "react-router-dom";
import { Mint } from "../components/Mint.tsx";
import App from "../App.tsx";
import { PoolManager } from "../components/PoolManager.tsx";
import { PositionManager } from "../components/PositionManager.tsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App />, // 布局组件
    children: [
      { index: true, element: <PoolManager /> }, // 默认 / 显示 PoolManager
      { path: "mint", element: <Mint /> }, // /mint 显示 Mint
      { path: "positions", element: <PositionManager /> }, // /positions 显示 PositionManager
    ],
  },
]);

export default router;
