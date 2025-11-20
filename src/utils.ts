import type {PoolInfo, PoolManagerData} from "./type.ts";
import erc20ABI from './erc20ABI.json';
import { sepolia } from 'wagmi/chains';
import { getPublicClient } from 'wagmi/actions'
import { config } from './Providers' // 注意导出 Wagmi 配置对象

export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint) {
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const ratio = Number(sqrtPriceX96) / Number(Q96);
    return ratio * ratio;
}

function tickToPrice(tick: number) {
    return Math.pow(1.0001, tick);
}

// 工具函数：格式化地址
function formatAddress(addr: string, start = 6, end = 4) {
    if (!addr) return '';
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

export function convertPoolInfoToManagerData(pool: PoolInfo): PoolManagerData {
    return {
        token: `${formatAddress(pool.token0)} / ${formatAddress(pool.token1)}`,
        fee: `${pool.fee / 10000}%`,
        priceRange: `${tickToPrice(pool.tickLower)} ~ ${tickToPrice(pool.tickUpper)}`,
        currentPrice: sqrtPriceX96ToPrice(pool.sqrtPriceX96),
        liquidity: Number(pool.liquidity)
    };
}

export async function getTokenSymbol(address: `0x${string}`): Promise<string> {
    try {
        // 指定链
        const client = getPublicClient(config, {
            chainId: sepolia.id,
        })
        const symbol = await client.readContract({
            address,
            abi: erc20ABI,
            functionName: 'symbol',
        }) as string;

        return symbol;
    } catch (e) {
        console.error(`Failed to fetch symbol for ${address}`, e);
        return address.slice(0, 6); // fallback
    }
}
