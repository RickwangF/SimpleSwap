import { Button, Input, Slider } from "antd";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import ContactABI from "../ContractABI.json";
import type { createPoolParams } from "../type";
import { POOL_MANAGER } from "../const";
import { useState } from "react";
import {
  getTickSpacing,
  nearestUsableTick,
  priceToSqrtPriceX96,
  priceToTick,
} from "../utils";

export default function AddPool() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [currentPrice, setCurrentPrice] = useState<number>(0.0);
  const [lowerPrice, setLowerPrice] = useState<string>("");
  const [upperPrice, setUpperPrice] = useState<string>("");
  const [sliderMin, setSliderMin] = useState<number>(0);
  const [sliderMax, setSliderMax] = useState<number>(100);

  const handleLowerPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && isNaN(Number(value))) {
      return;
    }

    // 如果lower price 大于 upper price，阻止输入
    if (upperPrice !== "" && Number(value) >= Number(upperPrice)) {
      return;
    }

    setLowerPrice(value);
    setSliderMin(value === "" ? 0 : Number(value));
  };

  const handleUpperPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && isNaN(Number(value))) {
      return;
    }

    // 如果upper price 小于 lower price，阻止输入
    if (lowerPrice !== "" && Number(value) <= Number(lowerPrice)) {
      return;
    }

    setUpperPrice(value);
    setSliderMax(value === "" ? 100 : Number(value));
  };

  const handleSliderChange = (value: number) => {
    console.log("Slider value:", value);
    setCurrentPrice(value);
  };

  const handleCreatePool = async () => {
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

    let token0 = token0Input.value.trim();
    let token1 = token1Input.value.trim();
    const feeTier = parseInt(feeTierSelect.value);

    if (token0.toLowerCase() > token1.toLowerCase()) {
      const temp0 = token1;
      const temp1 = token0;
      token0 = temp0;
      token1 = temp1;
    }

    if (!token0 || !token1) {
      alert("Token 地址不能为空");
      return;
    }

    if (!token0.startsWith("0x") || !token1.startsWith("0x")) {
      alert("Token 地址必须以 0x 开头");
      return;
    }

    if (token0 === token1) {
      alert("Token 地址不能相同");
      return;
    }

    // ---------------- ① 计算 tickLower / tickUpper ----------------
    const low = Number(lowerPrice);
    const high = Number(upperPrice);

    if (low <= 0 || high <= 0) {
      alert("价格必须大于 0");
      return;
    }

    const rawTickLower = priceToTick(low);
    const rawTickUpper = priceToTick(high);

    // ---------------- ② 根据 fee tier 自动对齐到 tickSpacing ----------------
    const tickSpacing = getTickSpacing(feeTier);

    const tickLower = nearestUsableTick(rawTickLower, tickSpacing);
    const tickUpper = nearestUsableTick(rawTickUpper, tickSpacing);

    if (tickLower >= tickUpper) {
      alert("tickLower 必须小于 tickUpper");
      return;
    }

    // ---------------- ③ 计算 sqrtPriceX96（使用当前 price） ----------------
    const currentPriceValue = currentPrice; // slider 的值

    if (currentPriceValue <= 0) {
      alert("当前价格必须大于 0");
      return;
    }

    const sqrtPriceX96 = priceToSqrtPriceX96(currentPriceValue);

    const createPoolParams: createPoolParams = {
      token0: token0 as `0x${string}`,
      token1: token1 as `0x${string}`,
      tickLower: tickLower,
      tickUpper: tickUpper,
      fee: feeTier,
      sqrtPriceX96: sqrtPriceX96,
      //BigInt("79228162514264337593543950336"),
    };

    try {
      const tx = await writeContractAsync({
        address: POOL_MANAGER,
        abi: ContactABI,
        functionName: "createAndInitializePoolIfNecessary",
        args: [createPoolParams],
      });
      console.log("创建池子交易已发送:", tx);
      alert(`创建池子交易已发送: ${tx}`);
    } catch (error) {
      console.error("创建池子失败:", error as Error);
      alert(`创建池子失败: ${error as Error}`);
    }
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
          <div className="form-group">
            <label className="add-position-label">
              Set Price Range<span>*</span>
            </label>
          </div>
          <div className="form-group-horizontal">
            <div className="price-range-item">
              <Input
                type="number"
                id="lowerPrice"
                placeholder="Low price"
                style={{ height: "40px" }}
                value={lowerPrice}
                onChange={handleLowerPriceChange}
              ></Input>
              <label>low price</label>
            </div>
            <div className="price-range-item">
              <Input
                type="number"
                id="upperPrice"
                placeholder="Hight price"
                style={{ height: "40px" }}
                value={upperPrice}
                onChange={handleUpperPriceChange}
              ></Input>
              <label>high price</label>
            </div>
          </div>
          <div className="form-group">
            <label className="add-position-label">
              Current Price<span>*</span>
            </label>
          </div>
          <div className="add-pool-current-price">
            {currentPrice.toFixed(2)}
          </div>
          <div className="add-pool-price-slider">
            <Slider
              defaultValue={0}
              marks={{
                [sliderMin]: `${sliderMin}`,
                [sliderMax]: `${sliderMax}`,
              }}
              onChange={handleSliderChange}
              min={sliderMin}
              max={sliderMax}
              styles={{
                track: { backgroundColor: "#1677ff" },
                handle: { borderColor: "#1677ff" },
              }}
            />
          </div>
          <div className="form-submit">
            <Button
              type="primary"
              style={{ height: "50px" }}
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
