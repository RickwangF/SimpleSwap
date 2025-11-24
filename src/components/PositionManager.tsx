import { Button, Table, Modal, Select } from "antd";
import type { TableProps } from "antd";
import { useEffect, useState } from "react";
import { usePositionManager } from "../PositionManagerContext";
import type { PoolInfo, PositionManagerData } from "../type";
import { usePoolManager } from "../PoolManagerContext";
import { getPrice, convertPositionInfoToManagerData } from "../utils.ts";
import { Divider, Input } from "antd";
import { useAccount, useWriteContract } from "wagmi";
import erc20ABI from "../ERC20ABI.json";
import PosistionAbi from "../PosistionABI.json";

export default function PositionManager() {
  const POSITION_MANAGER = "0xbe766Bf20eFfe431829C5d5a2744865974A0B610";

  const { address, isConnected } = useAccount();
  const [token0Address, setToken0Address] = useState<`0x${string}`>("0x0");
  const [token1Address, setToken1Address] = useState<`0x${string}`>("0x0");
  const [feeTier, setFeeTier] = useState<number>(1000);
  const [token0Amount, setToken0Amount] = useState<number>(0);
  const [token1Amount, setToken1Amount] = useState<number>(0);
  const [currentPool, setCurrentPool] = useState<PoolInfo>({} as PoolInfo);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [positionDataSource, setPositionDataSource] = useState<
    PositionManagerData[]
  >([]);
  const { pools, getPool, pairs, getTokenSymbol } = usePoolManager();
  const [symbolArray, setSymbolArray] = useState<
    { value: string; label: string }[]
  >([]);
  const { positions, isLoading, refreshPositions } = usePositionManager();
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const columns: TableProps<PositionManagerData>["columns"] = [
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
    },
    {
      title: "Fee tier",
      dataIndex: "feeTier",
      key: "feeTier",
    },
    {
      title: "Set price range",
      dataIndex: "priceRange",
      key: "priceRange",
    },
    {
      title: "Current price",
      dataIndex: "currentPrice",
      key: "currentPrice",
    },
  ];

  const buildPositionManagerDataSource = async () => {
    if (!positions || positions.length === 0) return;

    // 从positions中过滤owner为address的头寸
    const filteredPositions = positions.filter(
      (pos) => pos.owner.toLowerCase() === address?.toLowerCase()
    );

    const formatted: PositionManagerData[] = [];
    let tempPositionDatas: PositionManagerData[] = [];
    tempPositionDatas = filteredPositions.map((pos) => {
      const positionData: PositionManagerData =
        convertPositionInfoToManagerData(pos);
      return positionData;
    });
    setPositionDataSource(tempPositionDatas);

    for (const pos of filteredPositions) {
      const pool = await getPool(pos.token0, pos.token1, pos.index);
      if (!pool) continue;

      const sqrtPriceX96: bigint = pool.sqrtPriceX96;

      const token0Symbol = await getTokenSymbol(pos.token0);
      const token1Symbol = await getTokenSymbol(pos.token1);

      formatted.push({
        key: pos.index.toString(),
        token: `${token0Symbol}/${token1Symbol}`,
        feeTier: `${pos.fee / 10000}%`,
        priceRange: `${pos.tickLower} ~ ${pos.tickUpper}`,
        currentPrice: getPrice(sqrtPriceX96),
      });
    }

    setPositionDataSource(formatted);
  };

  const buildPairsArray = async () => {
    if (!pairs || pairs.length === 0) return;

    const addresses: string[] = [];

    // 收集所有 token 地址并去重
    pairs.forEach((pair) => {
      if (!addresses.includes(pair.token0)) addresses.push(pair.token0);
      if (!addresses.includes(pair.token1)) addresses.push(pair.token1);
    });

    // 获取所有 token 的 symbol
    const symbolPromises = addresses.map((addr) =>
      getTokenSymbol(addr as `0x${string}`)
    );
    const symbols = await Promise.all(symbolPromises);

    // 组装 options
    const options = addresses.map((addr, i) => ({
      value: addr,
      label: symbols[i],
    }));

    console.log("Options for Select:", options);
    setSymbolArray(options);
  };

  // 根据token0地址，token1地址，feeTier获取当前的Pool和价格
  const getCurrentPoolAndPrice = () => {
    if (token0Address === "0x0" || token1Address === "0x0") return;
    if (pools.length === 0) return;

    const pool = pools.find((p) => {
      return (
        (p.token0.toLowerCase() === token0Address.toLowerCase() &&
          p.token1.toLowerCase() === token1Address.toLowerCase() &&
          p.fee === feeTier) ||
        (p.token0.toLowerCase() === token1Address.toLowerCase() &&
          p.token1.toLowerCase() === token0Address.toLowerCase() &&
          p.fee === feeTier)
      );
    });
    if (pool) {
      setCurrentPool(pool);
      const price = getPrice(pool.sqrtPriceX96);
      setCurrentPrice(price);
    } else {
      setCurrentPool({} as PoolInfo);
      setCurrentPrice(0);
    }
  };

  const showModal = () => {
    setModalIsOpen(true);
  };

  const handleOk = async () => {
    // 检查输入合法性
    if (token0Amount <= 0 || token1Amount <= 0) {
      alert("Please enter valid amounts for both tokens.");
      return;
    }
    if (token0Address === "0x0" || token1Address === "0x0") {
      alert("Please select both tokens.");
      return;
    }
    if (token0Address === token1Address) {
      alert("Token0 and Token1 cannot be the same.");
      return;
    }

    if (!currentPool.token0 || !currentPool.token1) {
      alert("No pool found for the selected token pair and fee tier.");
      return;
    }

    if (!isConnected) {
      alert("Please connect your wallet.");
      return;
    }

    // 从token0获取授权
    const token0Approval = await writeContractAsync({
      address: token0Address,
      abi: erc20ABI,
      functionName: "approve",
      args: [POSITION_MANAGER, BigInt(token0Amount * 10 ** 18)],
    });

    const token1Approval = await writeContractAsync({
      address: token1Address,
      abi: erc20ABI,
      functionName: "approve",
      args: [POSITION_MANAGER, BigInt(token1Amount * 10 ** 18)],
    });

    if (!token0Approval || !token1Approval) {
      alert("Token approval failed.");
      return;
    }

    // 创建头寸
    const tx = await writeContractAsync({
      address: POSITION_MANAGER,
      abi: PosistionAbi,
      functionName: "mint",
      args: [
        {
          token0: currentPool.token0,
          token1: currentPool.token1,
          index: currentPool.index,
          amount0Desired: BigInt(token0Amount) * BigInt(10 ** 18),
          amount1Desired: BigInt(token1Amount) * BigInt(10 ** 18),
          recipient: address as `0x${string}`,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600), // 10 min later
        },
      ],
      // payable函数需要指定value，用于设置ETH数量（如token是WETH则通常为0）
      value: BigInt(0),
    });

    console.log("Position mint tx:", tx);
    alert("创建头寸成功，交易哈希：" + tx);
    setModalIsOpen(false);
    refreshPositions();
  };

  const handleCancel = () => {
    setModalIsOpen(false);
  };

  const handleToken0Change = (value: string) => {
    console.log(value); // { value: "tom", key: "tom", label: "Tom (100)" }
    setToken0Address(value as `0x${string}`);
  };

  const handleToken1Change = (value: string) => {
    console.log(value); // { value: "lucy", key: "lucy", label: "Lucy (101)" }
    setToken1Address(value as `0x${string}`);
  };

  const handleFeeTierChange = (value: number) => {
    setFeeTier(value);
  };

  const handleToken0ChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    if (isNaN(amount)) {
      setToken0Amount(0);
    } else {
      setToken0Amount(amount);
    }
  };

  const handleToken1ChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 如果e.target.value不是数字，设置为0

    const amount = parseFloat(e.target.value);
    if (isNaN(amount)) {
      setToken1Amount(0);
    } else {
      setToken1Amount(amount);
    }
  };

  useEffect(() => {
    console.log("Positions:", positions);
    buildPositionManagerDataSource();
  }, [positions, pools]);

  useEffect(() => {
    console.log("Pairs data:", pairs);
    buildPairsArray();
  }, [pairs]);

  useEffect(() => {
    getCurrentPoolAndPrice();
  }, [token0Address, token1Address, feeTier]);

  return (
    <>
      <div className="pool-manager-wrap">
        <div className="content-title-container">
          <p>Position</p>
        </div>
        <div className="content-inner">
          <div className="content-inner-top">
            <p>Position List</p>
            <div className="content-inner-top-divider">
              <Button type="primary" onClick={showModal}>
                Add
              </Button>
            </div>
          </div>
          <Table<PositionManagerData>
            columns={columns}
            dataSource={positionDataSource}
            loading={isLoading}
          />
        </div>
      </div>
      <Modal
        centered
        open={modalIsOpen}
        title="Add Position"
        onOk={handleOk}
        onCancel={handleCancel}
        width={800}
        okText="创建"
        cancelText="取消"
      >
        <div className="add-position-form">
          <div className="add-position-form-title">
            <label className="add-position-label">
              Deposite amounts<span>*</span>
            </label>
          </div>
          <div className="add-position-token-wrap">
            <div className="input-item">
              <Input
                type="text"
                id="token0Amount"
                defaultValue={0}
                style={{ border: "none", fontSize: "24px", fontWeight: 800 }}
                value={token0Amount}
                onChange={handleToken0ChangeAmount}
              ></Input>
            </div>
            <div className="select-item">
              <Select
                options={symbolArray}
                onChange={handleToken0Change}
                style={{
                  minWidth: "150px",
                  height: "45px",
                  borderRadius: "22.5px",
                  backgroundColor: "#f5f5f5",
                }}
              ></Select>
            </div>
            <div className="input-display-item">$0.00</div>
            <div className="balance-item">
              Balance: <span>0.0</span>
            </div>
          </div>
          <Divider />
          <div className="add-position-token-wrap">
            <div className="input-item">
              <Input
                type="text"
                id="token1Amount"
                defaultValue={0}
                style={{ border: "none", fontSize: "24px", fontWeight: 800 }}
                value={token1Amount}
                onChange={handleToken1ChangeAmount}
              ></Input>
            </div>
            <div className="select-item">
              <Select
                options={symbolArray}
                onChange={handleToken1Change}
                style={{ minWidth: "150px", height: "45px" }}
              ></Select>
            </div>
            <div className="input-display-item">$0.00</div>
            <div className="balance-item">
              Balance: <span>0.0</span>
            </div>
          </div>
          <div className="add-position-form-title">
            <label className="add-position-label">
              Fee tier<span>*</span>
            </label>
          </div>
          <div className="add-position-fee-tier-wrap">
            <Select
              defaultValue={1000}
              options={[
                { value: 1000, label: "0.01%" },
                { value: 3000, label: "0.03%" },
                { value: 10000, label: "0.1%" },
              ]}
              style={{ minWidth: "710px" }}
              onChange={handleFeeTierChange}
            ></Select>
          </div>
          <div className="add-position-form-title">
            <label className="add-position-label">
              Set Price Range<span>*</span>
            </label>
          </div>
          <div className="add-position-price-range-wrap">
            <div className="price-range-item">
              <Input type="number" id="lowerPrice" disabled></Input>
              <label>token0 per ETH</label>
            </div>
            <div className="price-range-item">
              <Input type="number" id="upperPrice" disabled></Input>
              <label>token1 per ETH</label>
            </div>
          </div>
          <div className="add-position-current-price-wrap-title">
            <label className="add-position-label">
              Current Price<span>*</span>
            </label>
          </div>
          <div className="add-position-current-price">
            ${currentPrice.toFixed(2)}
          </div>
        </div>
      </Modal>
    </>
  );
}
