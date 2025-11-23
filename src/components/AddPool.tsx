import { Button } from "antd";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import ContactABI from "../ContractABI.json";
import type { createPoolParams } from "../type";

export default function AddPool() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleCreatePool = () => {
    if (!isConnected || !address) {
      alert("请先连接钱包");
      return;
    }
    // 判断token0是否为空
    const token0Input = document.getElementById("token0") as HTMLInputElement;
    const token1Input = document.getElementById("token1") as HTMLInputElement;
    const feeTierSelect = document.getElementById(
      "feeTier"
    ) as HTMLSelectElement;

    const token0 = token0Input.value.trim();
    const token1 = token1Input.value.trim();
    const feeTier = parseInt(feeTierSelect.value);

    if (!token0 || !token1) {
      alert("Token 地址不能为空");
      return;
    }

    if (!token0.startsWith("0x") || !token1.startsWith("0x")) {
      alert("Token 地址必须以 0x 开头");
      return;
    }

    const createPoolParams: createPoolParams = {
      tokenA: token0 as `0x${string}`,
      tokenB: token1 as `0x${string}`,
      tickLower: 0,
      tickUpper: 0,
      feeTier: feeTier,
    };

    writeContractAsync({
      address: "0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B",
      abi: ContactABI,
      functionName: "createPool",
      args: [
        createPoolParams.tokenA,
        createPoolParams.tokenB,
        createPoolParams.tickLower,
        createPoolParams.tickUpper,
        createPoolParams.feeTier,
      ],
    })
      .then((tx) => {
        alert(`池子创建交易已发送，交易哈希: ${tx}`);
      })
      .catch((error) => {
        console.error("创建池子失败:", error);
        alert(`创建池子失败: ${error.message || error}`);
      });
  };

  return (
    <div className="add-pool-wrap">
      <div className="add-pool-container">
        <div className="add-pool-title">
          <h2>Add New Pool</h2>
        </div>
        <div className="form-container">
          <div className="form-group">
            <label htmlFor="token0">Token A Address</label>
            <input
              placeholder="token0 Address"
              id="token0"
              name="token0"
              className="add-pool-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="token1">Token B Address</label>
            <input
              placeholder="token1 Address"
              id="token1"
              name="token1"
              className="add-pool-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="feeTier">Fee Tier</label>
            <select id="feeTier" name="feeTier" className="add-pool-select">
              <option value="500">0.05%</option>
              <option value="3000" selected>
                0.3%
              </option>
              <option value="10000">1%</option>
            </select>
          </div>
          <div className="form-submit">
            <Button
              type="primary"
              style={{ height: "40px" }}
              onClick={handleCreatePool}
            >
              Create Pool
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
