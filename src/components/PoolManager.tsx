import { useState, useEffect } from "react";
import { Table } from "antd";
import { useReadContract } from 'wagmi';
import abi from '../ContractABI.json'
import type { PoolInfo, PoolManagerData } from '../type.ts'
import { convertPoolInfoToManagerData } from  '../utils.ts'

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

    const buildDataSource = function (list?: PoolInfo[]) {
        if (!list) return;

        const ds: PoolManagerData[] = list.map((item: PoolInfo) => {
            const converted = convertPoolInfoToManagerData(item);

            return {
                ...converted,
                key: item.pool, // AntD Table 必须的 key
            };
        });

        setPoolDataSource(ds);
    };

    useEffect(() => {
        // data 初始为 undefined，需要判断
        buildDataSource(data as PoolInfo[] | undefined);
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