import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useReadContract } from "wagmi";
import type { PositionInfo } from "./type";
import abi from "./PosistionABI.json";

const POSITION_MANAGER = "0xbe766Bf20eFfe431829C5d5a2744865974A0B610";

interface PositionManagerContextType {
  positions: PositionInfo[];
  isLoading: boolean;
  refreshPositions: () => Promise<void>;
  getPositionById: (id: bigint) => PositionInfo | null;
  getPositionsByOwner: (owner: `0x${string}`) => PositionInfo[];
}

const PositionManagerContext = createContext<PositionManagerContextType>({
  positions: [],
  isLoading: false,
  refreshPositions: async () => {},
  getPositionById: () => null,
  getPositionsByOwner: () => [],
});

export const usePositionManager = () => useContext(PositionManagerContext);

interface ProviderProps {
  children: ReactNode;
}

export const PositionManagerProvider = ({ children }: ProviderProps) => {
  const [positions, setPositions] = useState<PositionInfo[]>([]);

  const { data, error, isError, isLoading, refetch } = useReadContract({
    address: POSITION_MANAGER,
    abi,
    functionName: "getAllPositions",
  });

  useEffect(() => {
    if (isError || error) {
      console.error("Error fetching positions:", error);
      return;
    }

    if (data) {
      setPositions(data as PositionInfo[]);
    }
  }, [data]);

  const refreshPositions = async () => {
    const result = await refetch?.();
    if (result?.data) {
      setPositions(result.data as PositionInfo[]);
    }
  };

  const getPositionById = (id: bigint): PositionInfo | null =>
    positions.find((p) => p.id === id) ?? null;

  const getPositionsByOwner = (owner: `0x${string}`): PositionInfo[] =>
    positions.filter((p) => p.owner.toLowerCase() === owner.toLowerCase());

  return (
    <PositionManagerContext.Provider
      value={{
        positions,
        isLoading,
        refreshPositions,
        getPositionById,
        getPositionsByOwner,
      }}
    >
      {children}
    </PositionManagerContext.Provider>
  );
};
