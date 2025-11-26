import { useState, useEffect } from "react";
import { Button, Table } from "antd";
import type { PoolManagerData } from "../type.ts";
import {
  convertPoolInfoToManagerData,
  getTokenSymbol,
  getBalance,
} from "../utils.ts";
import { usePoolManager } from "../PoolManagerContext.tsx";
import { useNavigate } from "react-router-dom";
import { POOL_MANAGER } from "../const.ts";

export default function PoolManager() {
  const { pools } = usePoolManager();
  const [poolDataSource, setPoolDataSource] = useState<PoolManagerData[]>([]);
  const [dataSourceLoading, setDataSourceLoading] = useState<boolean>(true);

  const tokenCache = new Map<string, string>();
  const ballanceCache = new Map<string, bigint>();
  const navigate = useNavigate();

  const columns = [
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
    },
    {
      title: "Fee tier",
      dataIndex: "fee",
      key: "fee",
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
    {
      title: "Liquidity",
      dataIndex: "liquidity",
      key: "liquidity",
    },
  ];

  const buildDataSourceWithSymbols = async () => {
    if (!pools || pools.length === 0) return;

    // 获取所有唯一 token 地址
    const tokenAddresses = Array.from(
      new Set(pools.flatMap((p) => [p.token0, p.token1]))
    );

    // 异步获取 token symbol
    await Promise.all(
      tokenAddresses.map(async (addr) => {
        if (!tokenCache.has(addr)) {
          const symbol = await getTokenSymbol(addr);
          tokenCache.set(addr, symbol);
        }
      })
    );

    // 异步获取 token balance
    await Promise.all(
      pools.map(async (pool) => {
        const cache0Key = `${pool.pool}-${pool.token0}`;
        const cache1Key = `${pool.pool}-${pool.token1}`;
        if (!ballanceCache.has(cache0Key)) {
          const balance0 = await getBalance(pool.token0, pool.pool);
          ballanceCache.set(cache0Key, balance0);
        }
        if (!ballanceCache.has(cache1Key)) {
          const balance1 = await getBalance(pool.token1, pool.pool);
          ballanceCache.set(cache1Key, balance1);
        }
      })
    );

    // 构建 Table 数据源
    const ds: PoolManagerData[] = pools.map((item) => {
      const converted = convertPoolInfoToManagerData(item);
      const token0Balance = ballanceCache.get(`${item.pool}-${item.token0}`);
      const token1Balance = ballanceCache.get(`${item.pool}-${item.token1}`);
      return {
        ...converted,
        key: item.pool,
        token: `${tokenCache.get(
          item.token0
        )}(${token0Balance}) / ${tokenCache.get(
          item.token1
        )}(${token1Balance})`,
      };
    });
    setDataSourceLoading(false);
    setPoolDataSource(ds);
  };

  const handleNavigateToAddPool = () => {
    navigate("addPool");
  };

  const handleNavigateToPositions = () => {
    navigate("positions");
  };

  // 在组件里 useEffect 调用
  useEffect(() => {
    buildDataSourceWithSymbols();
  }, [pools]);

  return (
    <div className="pool-manager-wrap">
      <div className="content-title-container">
        <p>Pool</p>
      </div>
      <div className="content-inner">
        <div className="content-inner-top">
          <p>Pool List</p>
          <div className="content-inner-top-divider">
            <Button onClick={handleNavigateToPositions}>My Positions</Button>
            <Button type="primary" onClick={handleNavigateToAddPool}>
              Add Pool
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={poolDataSource}
          loading={dataSourceLoading}
        />
      </div>
    </div>
  );
}
