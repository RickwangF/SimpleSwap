import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Outlet } from "react-router-dom";
import "./App.css";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();

  const handleNavigateToPool = () => {
    navigate("/");
  };

  return (
    <>
      <div className="navi-bar">
        <div className="navi-title">Simple Swap</div>
        <div className="navi-center-container">
          <button className="navi-button">Swap</button>
          <button
            className="navi-button-selected"
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
