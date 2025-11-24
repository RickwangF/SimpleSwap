import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useReadContract } from "wagmi";
import type { PoolInfo, PoolPairs } from "./type";
import abi from "./ContractABI.json";
import { getPublicClient } from "@wagmi/core";
import { sepolia } from "viem/chains";
import erc20ABI from "./ERC20ABI.json";
import { config } from "./Providers";

const POOL_MANAGER = "0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B";
const ETH_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

interface PoolManagerContextType {
  pools: PoolInfo[];
  isLoading: boolean;
  refreshPools: () => Promise<void>;
  getPool: (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    index: number
  ) => Promise<PoolInfo | null>;
  getPoolsByTokens: (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`
  ) => Promise<PoolInfo[]>;
  getPoolByAddress: (poolAddress: `0x${string}`) => PoolInfo | null;
  getTokenSymbol: (address: `0x${string}`) => Promise<string>;
  // 返回一个string: string的对象数组
  pairs: PoolPairs[];
}

const PoolManagerContext = createContext<PoolManagerContextType>({
  pools: [],
  isLoading: false,
  refreshPools: async () => {},
  getPool: async () => null,
  getPoolsByTokens: async () => [],
  getPoolByAddress: () => null,
  getTokenSymbol: async (address) => address.slice(0, 6),
  pairs: [],
});

export const usePoolManager = () => useContext(PoolManagerContext);

interface Props {
  children: ReactNode;
}

export const PoolManagerProvider = ({ children }: Props) => {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [pairs, setPairs] = useState<PoolPairs[]>([]);

  const { data, isLoading, refetch } = useReadContract({
    address: POOL_MANAGER,
    abi,
    functionName: "getAllPools",
  });

  const { data: pairsData } = useReadContract({
    address: POOL_MANAGER,
    abi,
    functionName: "getPairs",
  });

  // 使用 useRef 存 symbol 缓存
  const symbolCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setPools(data as PoolInfo[]);
      console.log("Pools data:", data);
    }
    if (pairsData) {
      setPairs(pairsData as PoolPairs[]);
    }
  }, [data, pairsData]);

  const refreshPools = async () => {
    const result = await refetch?.();
    if (result?.data) setPools(result.data as PoolInfo[]);
  };

  const sortTokens = (tokenA: string, tokenB: string) =>
    tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

  const findPoolFromList = (
    list: PoolInfo[],
    tokenA: string,
    tokenB: string,
    index: number
  ) =>
    list.find(
      (p) =>
        p.token0.toLowerCase() === tokenA.toLowerCase() &&
        p.token1.toLowerCase() === tokenB.toLowerCase() &&
        p.index === index
    ) ?? null;

  const getPool = async (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    index: number
  ): Promise<PoolInfo | null> => {
    const [token0, token1] = sortTokens(tokenA, tokenB);

    const pool = findPoolFromList(pools, token0, token1, index);
    if (pool) return pool;

    await refreshPools();
    return findPoolFromList(pools, token0, token1, index);
  };

  const getPoolsByTokens = async (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`
  ): Promise<PoolInfo[]> => {
    const [token0, token1] = sortTokens(tokenA, tokenB);

    const filtered = pools.filter(
      (p) =>
        p.token0.toLowerCase() === token0.toLowerCase() &&
        p.token1.toLowerCase() === token1.toLowerCase()
    );
    if (filtered.length > 0) return filtered;

    await refreshPools();

    return pools.filter(
      (p) =>
        p.token0.toLowerCase() === token0.toLowerCase() &&
        p.token1.toLowerCase() === token1.toLowerCase()
    );
  };

  const getPoolByAddress = (poolAddress: `0x${string}`): PoolInfo | null =>
    pools.find((p) => p.pool.toLowerCase() === poolAddress.toLowerCase()) ??
    null;

  // 新增方法：带缓存的 getTokenSymbol
  const getTokenSymbol = async (address: `0x${string}`): Promise<string> => {
    // ETH 地址占位符处理
    if (address.toLowerCase() === ETH_PLACEHOLDER.toLowerCase()) {
      return "ETH";
    }

    if (address === "0x") {
      return "-";
    }

    const key = address.toLowerCase();

    // 如果缓存中有，直接返回
    if (symbolCache.current[key]) {
      return symbolCache.current[key];
    }

    try {
      const client = getPublicClient(config, {
        chainId: sepolia.id,
      });

      const symbol = (await client.readContract({
        address,
        abi: erc20ABI,
        functionName: "symbol",
      })) as string;

      // 缓存 symbol
      symbolCache.current[key] = symbol;
      return symbol;
    } catch (e) {
      console.error(`Failed to fetch symbol for ${address}`, e);
      const fallback = address.slice(0, 6);
      symbolCache.current[key] = fallback;
      return fallback;
    }
  };

  return (
    <PoolManagerContext.Provider
      value={{
        pools,
        isLoading,
        refreshPools,
        getPool,
        getPoolsByTokens,
        getPoolByAddress,
        getTokenSymbol,
        pairs,
      }}
    >
      {children}
    </PoolManagerContext.Provider>
  );
};
