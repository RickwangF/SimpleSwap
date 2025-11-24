export type PoolInfo = {
  pool: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  index: number; // uint32
  fee: number; // uint24
  feeProtocol: number; // uint8
  tickLower: number; // int24
  tickUpper: number; // int24
  tick: number; // int24
  sqrtPriceX96: bigint; // uint160
  liquidity: bigint; // uint128
};

export type PoolManagerData = {
  token: string;
  fee: string;
  priceRange: string;
  currentPrice: number;
  liquidity: number;
};

export type TokenInfo = {
  symbol: string;
  name: string;
  decimals: number;
};

export type PositionInfo = {
  id: bigint;
  owner: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  index: number; // uint32
  fee: number; // uint24
  liquidity: bigint; // uint128
  tickLower: number; // int24
  tickUpper: number; // int24
  tokensOwed0: bigint; // uint128
  tokensOwed1: bigint; // uint128
  feeGrowthInside0LastX128: bigint; // uint256
  feeGrowthInside1LastX128: bigint; // uint256
};
export interface PositionManagerData {
  key: string;
  token: string;
  feeTier: string;
  priceRange: string;
  currentPrice: number;
}

export type createPoolParams = {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  tickLower: number;
  tickUpper: number;
  feeTier: number;
};

export type PoolPairs = {
  token0: `0x${string}`;
  token1: `0x${string}`;
};

// struct MintParams {
//     address token0;
//     address token1;
//     uint32 index;
//     uint256 amount0Desired;
//     uint256 amount1Desired;
//     address recipient;
//     uint256 deadline;
// }
