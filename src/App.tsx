import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PoolManager } from "./components/PoolManager.tsx";
import './App.css'

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
                    <ConnectButton/>
                </div>
            </div>
            <div className="content-container">
                <PoolManager/>
            </div>
        </>
    )
}


export default App