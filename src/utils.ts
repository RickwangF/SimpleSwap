import type {PoolInfo, PoolManagerData} from "./type.ts";

export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint) {
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const ratio = Number(sqrtPriceX96) / Number(Q96);
    return ratio * ratio;
}

function tickToPrice(tick: number) {
    return Math.pow(1.0001, tick);
}

export function convertPoolInfoToManagerData(pool: PoolInfo): PoolManagerData {
    return {
        token: `${pool.token0} / ${pool.token1}`,
        fee: `${pool.fee / 10000}%`,
        priceRange: `${tickToPrice(pool.tickLower)} ~ ${tickToPrice(pool.tickUpper)}`,
        currentPrice: sqrtPriceX96ToPrice(pool.sqrtPriceX96),
        liquidity: Number(pool.liquidity)
    };
}
