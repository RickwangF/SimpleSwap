import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useReadContract } from "wagmi";
import type { PoolInfo } from "./type";
import abi from "./ContractABI.json";

const POOL_MANAGER = "0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B";

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
}

const PoolManagerContext = createContext<PoolManagerContextType>({
  pools: [],
  isLoading: false,
  refreshPools: async () => {},
  getPool: async () => null,
  getPoolsByTokens: async () => [],
  getPoolByAddress: () => null,
});

export const usePoolManager = () => useContext(PoolManagerContext);

interface Props {
  children: ReactNode;
}

export const PoolManagerProvider = ({ children }: Props) => {
  const [pools, setPools] = useState<PoolInfo[]>([]);

  const { data, isLoading, refetch } = useReadContract({
    address: POOL_MANAGER,
    abi,
    functionName: "getAllPools",
  });

  useEffect(() => {
    if (data) {
      setPools(data as PoolInfo[]);
    }
  }, [data]);

  const refreshPools = async () => {
    const result = await refetch?.();
    if (result?.data) setPools(result.data as PoolInfo[]);
  };

  // 自动排序 token，使 token0 < token1
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

  return (
    <PoolManagerContext.Provider
      value={{
        pools,
        isLoading,
        refreshPools,
        getPool,
        getPoolsByTokens,
        getPoolByAddress,
      }}
    >
      {children}
    </PoolManagerContext.Provider>
  );
};
