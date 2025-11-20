import { useState, useEffect } from "react";
import { Table } from "antd";
import { useReadContract } from 'wagmi';
import abi from '../ContractABI.json'
import type { PoolInfo, PoolManagerData } from '../type.ts'
import { convertPoolInfoToManagerData, getTokenSymbol  } from  '../utils.ts'

const POOL_MANAGER = "0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B";

export function PoolManager() {

    const [poolDataSource, setPoolDataSource] = useState<PoolManagerData[]>([]);

    const columns = [
        {
            title: 'Token',
            dataIndex: 'token',
            key: 'token',
        },
        {
            title: 'Fee tier',
            dataIndex: 'fee',
            key: 'fee',
        },
        {
            title: 'Set price range',
            dataIndex: 'priceRange',
            key: 'priceRange',
        },
        {
            title: 'Current price',
            dataIndex: 'currentPrice',
            key: 'currentPrice',
        },
        {
            title: 'Liquidity',
            dataIndex: 'liquidity',
            key: 'liquidity',
        }
    ];

    const { data, isLoading } = useReadContract({
        address: POOL_MANAGER,
        abi: abi,
        functionName: "getAllPools",
    });

    const tokenCache = new Map<string, string>();

    const buildDataSourceWithSymbols = async (
        list: PoolInfo[],
        setPoolDataSource: (data: PoolManagerData[]) => void
    ) => {
        if (!list || list.length === 0) return;

        // 获取所有唯一 token 地址
        const tokenAddresses = Array.from(
            new Set(list.flatMap(p => [p.token0, p.token1]))
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

        // 构建 Table 数据源
        const ds: PoolManagerData[] = list.map((item) => {
            const converted = convertPoolInfoToManagerData(item);
            return {
                ...converted,
                key: item.pool,
                token: `${tokenCache.get(item.token0)} / ${tokenCache.get(item.token1)}`,
            };
        });

        setPoolDataSource(ds);
    };

    // 在组件里 useEffect 调用
    useEffect(() => {
        if (!data) return;

        buildDataSourceWithSymbols(data as PoolInfo[], setPoolDataSource);
    }, [data]);

    return (
        <>
            <div className="content-title-container">
                <p>Pool</p>
            </div>
            <div className="content-inner">
                <Table columns={columns} dataSource={poolDataSource} loading={isLoading} />
            </div>
        </>
    )
}