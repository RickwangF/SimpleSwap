import { useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { usePoolManager } from "../PoolManagerContext";
import type { PoolInfo } from "../type.ts";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { readContract } from "@wagmi/core";
import erc20ABI from "../ERC20ABI.json";
import { config } from "../Providers";
import SwapABI from "../SwapABI.json";
import {
  SWAP_ROUTER_ADDRESS,
  MIN_TICK,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
} from "../const";
import { parseUnits, formatUnits } from "viem";
import replaceIcon from "../assets/replace.png";

export default function Swap() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [token0Address, setToken0Address] = useState<string>("");
  const [token1Address, setToken1Address] = useState<string>("");
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
  const publicClient = usePublicClient();

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

  const handleReplaceClick = () => {
    if (!token0Address || !token1Address) {
      alert("Both tokens must be selected to swap.");
      return;
    }

    const previousToken0 = token0Address;
    const previousToken1 = token1Address;

    const previousToken0Amount = token0Amount;
    const previousToken1Amount = token1Amount;

    const existAmountInputed =
      (previousToken0Amount != null && previousToken0Amount !== "0") ||
      (previousToken1Amount != null && previousToken1Amount !== "0");

    if (existAmountInputed) {
      handleToken0Change(previousToken1);
      handleToken1Change(previousToken0);
      if (isExactInput) {
        // token0 → token1
        setToken1Amount(previousToken0Amount);
        setIsExactInput(false);
        setToken0Amount("0");
        setIsTyping(true);
      } else {
        // token1 → token0
        setToken0Amount(previousToken1Amount);
        setIsExactInput(true);
        setToken1Amount("0");
        setIsTyping(true);
      }
    }
  };

  const findMatchedPools = () => {
    if (!token0Address || !token1Address) return [];

    const matchedPools = pools.filter(
      (p) =>
        (p.token0.toLowerCase() === token0Address.toLowerCase() &&
          p.token1.toLowerCase() === token1Address.toLowerCase()) ||
        (p.token0.toLowerCase() === token1Address.toLowerCase() &&
          p.token1.toLowerCase() === token0Address.toLowerCase())
    );

    return matchedPools;
  };

  const quoteExactInputOrOutput = async () => {
    if (!token0Address || !token1Address) return;
    if (token0Address === token1Address) return;
    if (!pools || pools.length === 0) return;
    if (!publicClient) return;

    const amount0 = Number(token0Amount);
    const amount1 = Number(token1Amount);

    // 用户没有输入数量
    if (amount0 <= 0 && amount1 <= 0) return;

    const zeroForOne =
      token0Address.toLowerCase() < token1Address.toLowerCase();

    try {
      const matchedPools = findMatchedPools();

      if (matchedPools.length === 0) {
        setBestPool(null);
        return;
      }

      // token0 → token1  (exactInput)
      if (isExactInput) {
        const amountIn = parseUnits(token0Amount || "0", 18);
        const sqrtPriceLimitX96 = zeroForOne
          ? MIN_SQRT_RATIO + 1n
          : MAX_SQRT_RATIO - 1n;

        try {
          const result = await publicClient.simulateContract({
            address: SWAP_ROUTER_ADDRESS,
            abi: SwapABI,
            functionName: "quoteExactInput",
            args: [
              {
                tokenIn: token0Address,
                tokenOut: token1Address,
                indexPath: matchedPools.map((p) => p.index),
                amountIn,
                sqrtPriceLimitX96: sqrtPriceLimitX96,
              },
            ],
          });
          console.log("quoteExactInput out:", result);
          const amountOut = result.result as bigint;
          setToken1Amount(formatUnits(amountOut, 18));
        } catch (err) {
          console.error("quoteExactInput error:", err);
        }
      } else {
        // token1 → token0 (exactOutput)
        if (amount1 > 0) {
          const amountOut = parseUnits(token1Amount || "0", 18);
          const sqrtPriceLimitX96 = zeroForOne
            ? MIN_SQRT_RATIO + 1n
            : MAX_SQRT_RATIO - 1n;

          try {
            const result = await publicClient.simulateContract({
              address: SWAP_ROUTER_ADDRESS,
              abi: SwapABI,
              functionName: "quoteExactOutput",
              args: [
                {
                  tokenIn: token0Address,
                  tokenOut: token1Address,
                  indexPath: matchedPools.map((p) => p.index),
                  amountOut,
                  sqrtPriceLimitX96: sqrtPriceLimitX96,
                },
              ],
            });

            console.log("quoteExactOutput out:", result);
            const amountIn = result.result as bigint;
            setToken0Amount(formatUnits(amountIn, 18));
          } catch (err) {
            console.error("quoteExactOutput error:", err);
          }
        }
      }
    } catch (err) {
      console.error("findBestPool error:", err);
    }
  };

  const handleSwapButtonClick = async () => {
    if (token0Amount === "0" || token1Amount === "0") {
      alert("Can't swap zero amount.");
      return;
    }

    if (!isConnected || !address) {
      alert("Please connect your wallet before swapping.");
      return;
    }

    const matchedPools = findMatchedPools();

    if (matchedPools.length === 0) {
      alert("No available pool for the selected token pair.");
      return;
    }

    const amount0 = parseUnits(token0Amount || "0", 18);
    const amount1 = parseUnits(token1Amount || "0", 18);

    const token0Addr = token0Address as `0x${string}`;
    const token1Addr = token1Address as `0x${string}`;

    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + 3600); // 1 hour from now
    const zeroForOne =
      token0Address.toLowerCase() < token1Address.toLowerCase();

    const sqrtPriceLimitX96 = zeroForOne
      ? MIN_SQRT_RATIO + 1n
      : MAX_SQRT_RATIO - 1n;

    try {
      if (isExactInput) {
        console.log("swap: exactInput (token0 → token1)");

        // 1) approve token0 to SwapRouter
        await writeContractAsync({
          address: token0Addr,
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
              indexPath: matchedPools.map((p) => p.index),
              recipient: address,
              deadline,
              amountIn: amount0,
              amountOutMinimum: 0n, // 不做滑点保护
              sqrtPriceLimitX96: sqrtPriceLimitX96,
            },
          ],
        });

        console.log("exactInput tx:", tx);
        alert("Swap success!");
      } else {
        console.log("swap: exactOutput (token1 → token0)");

        const estimatedAmountIn = parseUnits(token0Amount || "0", 18);
        const amountInMaximum =
          estimatedAmountIn + (estimatedAmountIn / 100n) * 5n; // 多支付5%以防不足

        // 1) approve token1 to SwapRouter
        await writeContractAsync({
          address: token0Addr,
          abi: erc20ABI,
          functionName: "approve",
          args: [SWAP_ROUTER_ADDRESS, amountInMaximum],
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
              indexPath: matchedPools.map((p) => p.index),
              recipient: address,
              deadline,
              amountOut: amount1,
              amountInMaximum,
              sqrtPriceLimitX96: sqrtPriceLimitX96,
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
      quoteExactInputOrOutput();
      setIsTyping(false);
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [token0Amount, token1Amount]);

  return (
    <div className="swap-wrap">
      <div className="swap-container">
        <h2 className="swap-title">Swap</h2>
        <div className="swap-content">
          <div className="add-position-form position-relative">
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
                  value={token0Address}
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
                  value={token1Address}
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
            <div className="replace-wrap" onClick={handleReplaceClick}>
              <img src={replaceIcon} alt="Replace" />
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
