import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Outlet } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <>
      <div className="navi-bar">
        <div className="navi-title">Simple Swap</div>
        <div className="navi-center-container">
          <button className="navi-button">Swap</button>
          <button className="navi-button-selected">Pool</button>
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
