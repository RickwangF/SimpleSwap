import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Outlet } from "react-router-dom";
import "./App.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function App() {
  const [isShowingPool, setIsShowingPool] = useState(true);

  const navigate = useNavigate();

  const handleNavigateToPool = () => {
    setIsShowingPool(true);
    navigate("/");
  };

  const handleNavigateToSwap = () => {
    setIsShowingPool(false);
    navigate("swap");
  };

  return (
    <>
      <div className="navi-bar">
        <div className="navi-title">Simple Swap</div>
        <div className="navi-center-container">
          <button
            className={!isShowingPool ? "navi-button-selected" : "navi-button"}
            onClick={handleNavigateToSwap}
          >
            Swap
          </button>
          <button
            className={isShowingPool ? "navi-button-selected" : "navi-button"}
            onClick={handleNavigateToPool}
          >
            Pool
          </button>
        </div>
        <div className="navi-right-container">
          <ConnectButton />
        </div>
      </div>
      <div className="content-container">
        <Outlet />
      </div>
    </>
  );
}

export default App;
