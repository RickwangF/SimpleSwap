import { Button, Table } from "antd";
import type { TableProps } from "antd";
import { useEffect, useState } from "react";
import { usePositionManager } from "../PositionManagerContext";
import type { PositionManagerData } from "../type";
import { usePoolManager } from "../PoolManagerContext";
import { getTokenSymbol } from "../utils.ts";

export default function PositionManager() {
  const [positionDataSource, setPositionDataSource] = useState<
    PositionManagerData[]
  >([]);
  const { pools, getPool } = usePoolManager();
  const tokenCache = new Map<string, string>();
  const { positions, isLoading } = usePositionManager();

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

  const getTokenSymbolCached = async (addr: `0x${string}`) => {
    if (!tokenCache.has(addr)) {
      const symbol = await getTokenSymbol(addr);
      tokenCache.set(addr, symbol);
    }
    return tokenCache.get(addr)!;
  };

  const buildPositionManagerDataSource = async () => {
    if (!positions || positions.length === 0) return;

    const formatted: PositionManagerData[] = [];

    for (const pos of positions) {
      const pool = await getPool(pos.token0, pos.token1, pos.index);
      if (!pool) continue;

      const sqrtPriceX96: bigint = pool.sqrtPriceX96;

      const token0Symbol = await getTokenSymbolCached(pos.token0);
      const token1Symbol = await getTokenSymbolCached(pos.token1);

      formatted.push({
        key: pos.index.toString(),
        token: `${token0Symbol}/${token1Symbol}`,
        feeTier: `${pos.fee / 10000}%`,
        priceRange: `${pos.tickLower} ~ ${pos.tickUpper}`,
        currentPrice: Number(sqrtPriceX96),
      });
    }

    setPositionDataSource(formatted);
  };

  useEffect(() => {
    console.log("Positions:", positions);
    buildPositionManagerDataSource();
  }, [positions, pools]);

  return (
    <div className="pool-manager-wrap">
      <div className="content-title-container">
        <p>Position</p>
      </div>
      <div className="content-inner">
        <div className="content-inner-top">
          <p>Position List</p>
          <div className="content-inner-top-divider">
            <Button type="primary">Add</Button>
          </div>
        </div>
        <Table<PositionManagerData>
          columns={columns}
          dataSource={positionDataSource}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
