export type PoolInfo = {
    pool: `0x${string}`;
    token0: `0x${string}`;
    token1: `0x${string}`;
    index: number;          // uint32
    fee: number;            // uint24
    feeProtocol: number;    // uint8
    tickLower: number;      // int24
    tickUpper: number;      // int24
    tick: number;           // int24
    sqrtPriceX96: bigint;   // uint160
    liquidity: bigint;      // uint128
};

export type PoolManagerData = {
    token: string,
    fee: string,
    priceRange: string,
    currentPrice: number,
    liquidity: number
}