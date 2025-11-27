import { useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { usePoolManager } from "../PoolManagerContext";
import type { PoolInfo } from "../type.ts";
import { useAccount, useWriteContract } from "wagmi";
import { readContract } from "@wagmi/core";
import erc20ABI from "../ERC20ABI.json";
import { config } from "../Providers";
import SwapABI from "../SwapABI.json";
import { SWAP_ROUTER_ADDRESS } from "../const";
import { parseUnits, formatUnits } from "viem";

export default function Swap() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [token0Address, setToken0Address] = useState<`0x${string}`>("0x0");
  const [token1Address, setToken1Address] = useState<`0x${string}`>("0x0");
  const [token0Amount, setToken0Amount] = useState<string>("0");
  const [token1Amount, setToken1Amount] = useState<string>("0");
  const [token0Balance, setToken0Balance] = useState<number>(0);
  const [token1Balance, setToken1Balance] = useState<number>(0);
  const { pools, pairs, getTokenSymbol } = usePoolManager();
  const [symbolArray, setSymbolArray] = useState<
    { value: string; label: string }[]
  >([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isExactInput, setIsExactInput] = useState<boolean>(true);
  const [bestPool, setBestPool] = useState<PoolInfo | null>(null);

  const handleToken0ChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsTyping(true);
    setIsExactInput(true);
    setToken0Amount(value);
    setToken1Amount("0");
  };

  const handleToken1ChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsTyping(true);
    setIsExactInput(false);
    setToken1Amount(value);
    setToken0Amount("0");
  };

  const handleToken0Change = (value: string) => {
    console.log(`Selected token0: ${value}`);
    setToken0Address(value as `0x${string}`);
    updateTokenBalances(value as `0x${string}`, true);
  };

  const handleToken1Change = (value: string) => {
    console.log(`Selected token1: ${value}`);
    setToken1Address(value as `0x${string}`);
    updateTokenBalances(value as `0x${string}`, false);
  };

  const updateTokenBalances = async (
    tokenAddress: `0x${string}`,
    isToken0: boolean
  ) => {
    if (!isConnected || !address) return;

    // 获取 token0 余额
    const token0Data = await readContract(config, {
      address: tokenAddress,
      abi: erc20ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });

    if (isToken0) {
      setToken0Balance(Number(token0Data ? token0Data : BigInt(0)) / 10 ** 18);
    } else {
      setToken1Balance(Number(token0Data ? token0Data : BigInt(0)) / 10 ** 18);
    }
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

  const findBestPool = async () => {
    if (!token0Address || !token1Address) return;
    if (token0Address === token1Address) return;
    if (!pools || pools.length === 0) return;

    const amount0 = Number(token0Amount);
    const amount1 = Number(token1Amount);

    // 用户没有输入数量
    if (amount0 <= 0 && amount1 <= 0) return;

    try {
      const matchedPools = pools.filter(
        (p) =>
          p.token0.toLowerCase() === token0Address.toLowerCase() &&
          p.token1.toLowerCase() === token1Address.toLowerCase()
      );

      if (matchedPools.length === 0) {
        setBestPool(null);
        return;
      }

      let best = null;

      // token0 → token1  (exactInput)
      if (isExactInput) {
        const amountIn = BigInt(Math.floor(amount0 * 1e18));

        const results = await Promise.all(
          matchedPools.map(async (pool) => {
            try {
              const out = await readContract(config, {
                address: pool.pool,
                abi: SwapABI,
                functionName: "quoteExactInput",
                args: [
                  {
                    tokenIn: token0Address,
                    tokenOut: token1Address,
                    indexPath: [pool.index],
                    amountIn,
                    sqrtPriceLimitX96: pool.sqrtPriceX96,
                  },
                ],
              });

              return {
                pool,
                amountOut: out as bigint,
              };
            } catch (err) {
              console.error("quoteExactInput error:", err);
              return { pool, amountOut: 0n };
            }
          })
        );

        best = results.reduce((max, cur) =>
          cur.amountOut > max.amountOut ? cur : max
        );

        setBestPool(best.pool);
        setToken1Amount(formatUnits(best.amountOut, 18));
      } else {
        // token1 → token0 (exactOutput)
        if (amount1 > 0) {
          const amountOut = BigInt(Math.floor(amount1 * 1e18));

          const results = await Promise.all(
            matchedPools.map(async (pool) => {
              try {
                const amountIn = await readContract(config, {
                  address: pool.pool,
                  abi: SwapABI,
                  functionName: "quoteExactOutput",
                  args: [
                    {
                      tokenIn: token0Address,
                      tokenOut: token1Address,
                      indexPath: [pool.index],
                      amountOut,
                      sqrtPriceLimitX96: pool.sqrtPriceX96,
                    },
                  ],
                });

                return {
                  pool,
                  amountIn: amountIn as bigint,
                };
              } catch (err) {
                console.error("quoteExactOutput error:", err);
                return { pool, amountIn: 2n ** 255n }; // 设置为一个巨大的值，确保不会被选中
              }
            })
          );

          best = results.reduce((min, cur) =>
            cur.amountIn < min.amountIn ? cur : min
          );

          setBestPool(best.pool);
          console.log("Best pool for quoteExactOutput:", best.amountIn);
          console.log(
            "Formatted token0 amount:",
            formatUnits(best.amountIn, 18)
          );
          setToken0Amount(formatUnits(best.amountIn, 18));
        }
      }
    } catch (err) {
      console.error("findBestPool error:", err);
    }
  };

  const handleSwapButtonClick = async () => {
    if (!bestPool) {
      alert("No best pool found for the selected token pair.");
      return;
    }

    if (token0Amount === "0" || token1Amount === "0") {
      alert("Can't swap zero amount.");
      return;
    }

    if (!isConnected || !address) {
      alert("Please connect your wallet before swapping.");
      return;
    }

    debugger;

    const amount0 = parseUnits(token0Amount || "0", 18);
    const amount1 = parseUnits(token1Amount || "0", 18);

    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + 600); // 10 min

    try {
      if (isExactInput) {
        console.log("swap: exactInput (token0 → token1)");

        // 1) approve token0 to SwapRouter
        await writeContractAsync({
          address: token0Address,
          abi: erc20ABI,
          functionName: "approve",
          args: [SWAP_ROUTER_ADDRESS, amount0],
        });

        // 2) call exactInput
        const tx = await writeContractAsync({
          address: SWAP_ROUTER_ADDRESS,
          abi: SwapABI,
          functionName: "exactInput",
          args: [
            {
              tokenIn: token0Address,
              tokenOut: token1Address,
              indexPath: [bestPool.index],
              recipient: address,
              deadline,
              amountIn: amount0,
              amountOutMinimum: 0n, // 不做滑点保护
              sqrtPriceLimitX96: bestPool.sqrtPriceX96,
            },
          ],
        });

        console.log("exactInput tx:", tx);
        alert("Swap success!");
      } else {
        console.log("swap: exactOutput (token1 → token0)");

        // 1) approve token1 to SwapRouter
        await writeContractAsync({
          address: token1Address,
          abi: erc20ABI,
          functionName: "approve",
          args: [SWAP_ROUTER_ADDRESS, amount1],
        });

        // 2) call exactOutput
        const tx = await writeContractAsync({
          address: SWAP_ROUTER_ADDRESS,
          abi: SwapABI,
          functionName: "exactOutput",
          args: [
            {
              tokenIn: token0Address,
              tokenOut: token1Address,
              indexPath: [bestPool.index],
              recipient: address,
              deadline,
              amountOut: amount1,
              amountInMaximum: 0n, // 不做滑点保护
              sqrtPriceLimitX96: bestPool.sqrtPriceX96,
            },
          ],
        });

        console.log("exactOutput tx:", tx);
        alert("Swap success!");
      }
    } catch (err) {
      console.error("Swap error:", err);
    }
  };

  useEffect(() => {
    console.log("Pairs data:", pairs);
    buildPairsArray();
  }, [pairs]);

  useEffect(() => {
    if (!isTyping) return;

    const timer = setTimeout(() => {
      findBestPool();
      setIsTyping(false);
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [token0Amount, token1Amount]);

  return (
    <div className="swap-wrap">
      <div className="swap-container">
        <h2 className="swap-title">Swap</h2>
        <div className="swap-content">
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
                Balance: <span>{token0Balance}</span>
              </div>
            </div>
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
                Balance: <span>{token1Balance}</span>
              </div>
            </div>
            <Button
              type="primary"
              className="swap-button"
              onClick={handleSwapButtonClick}
            >
              Swap
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
