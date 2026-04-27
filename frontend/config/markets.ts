import { keccak256, encodeAbiParameters } from "viem";
import { KUB_TESTNET_CONTRACTS } from "./contracts";
import { KUB_TESTNET_TOKENS, type TestnetTokenConfig } from "./tokens";

export const MORPHO_ADDRESS = KUB_TESTNET_CONTRACTS.morpho;
export const KUB_CHAIN_ID = 25925;

// LLTV: 75% = 0.75 * 1e18
export const LLTV = 750000000000000000n;

export interface MarketConfig {
  id?: `0x${string}`;
  symbol: string;
  name: string;
  loanToken: TestnetTokenConfig;
  collateralToken: TestnetTokenConfig;
}

// Market params for each market
interface MarketParams {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
}

// Compute market ID from params (same as Solidity's keccak256(abi.encode(...)))
function computeMarketId(params: MarketParams): `0x${string}` {
  // Use encodeAbiParameters to match Solidity's abi.encode() behavior
  const encoded = encodeAbiParameters(
    [
      { name: "loanToken", type: "address" },
      { name: "collateralToken", type: "address" },
      { name: "oracle", type: "address" },
      { name: "irm", type: "address" },
      { name: "lltv", type: "uint256" },
    ],
    [
      params.loanToken,
      params.collateralToken,
      params.oracle,
      params.irm,
      params.lltv,
    ]
  );
  
  return keccak256(encoded);
}

// KUSDT/KKUB Market - Lending KUSDT against KKUB collateral
const KUSDT_KKUB_MARKET: MarketConfig = {
  symbol: "KUSDT/KKUB",
  name: "KUSDT Supply",
  loanToken: KUB_TESTNET_TOKENS.KUSDT,
  collateralToken: KUB_TESTNET_TOKENS.KKUB,
};

// KKUB/KUSDT Market - Lending KKUB against KUSDT collateral
const KKUB_KUSDT_MARKET: MarketConfig = {
  symbol: "KKUB/KUSDT",
  name: "KKUB Supply",
  loanToken: KUB_TESTNET_TOKENS.KKUB,
  collateralToken: KUB_TESTNET_TOKENS.KUSDT,
};

// KBTC/KUSDT Market - Lending KBTC against KUSDT collateral
const KBTC_KUSDT_MARKET: MarketConfig = {
  symbol: "KBTC/KUSDT",
  name: "KBTC Supply",
  loanToken: KUB_TESTNET_TOKENS.KBTC,
  collateralToken: KUB_TESTNET_TOKENS.KUSDT,
};

// Compute IDs for all markets
const KUSDT_KKUB_PARAMS: MarketParams = {
  loanToken: KUB_TESTNET_TOKENS.KUSDT.address,
  collateralToken: KUB_TESTNET_TOKENS.KKUB.address,
  oracle: KUB_TESTNET_CONTRACTS.oracles.kusdtKkub,
  irm: KUB_TESTNET_CONTRACTS.irmStablecoin,
  lltv: LLTV,
};

const KKUB_KUSDT_PARAMS: MarketParams = {
  loanToken: KUB_TESTNET_TOKENS.KKUB.address,
  collateralToken: KUB_TESTNET_TOKENS.KUSDT.address,
  oracle: KUB_TESTNET_CONTRACTS.oracles.kkubKusdt,
  irm: KUB_TESTNET_CONTRACTS.irmNonStablecoin,
  lltv: LLTV,
};

const KBTC_KUSDT_PARAMS: MarketParams = {
  loanToken: KUB_TESTNET_TOKENS.KBTC.address,
  collateralToken: KUB_TESTNET_TOKENS.KUSDT.address,
  oracle: KUB_TESTNET_CONTRACTS.oracles.kbtcKusdt,
  irm: KUB_TESTNET_CONTRACTS.irmNonStablecoin,
  lltv: LLTV,
};

// Assign computed IDs to markets
KUSDT_KKUB_MARKET.id = computeMarketId(KUSDT_KKUB_PARAMS);
KKUB_KUSDT_MARKET.id = computeMarketId(KKUB_KUSDT_PARAMS);
KBTC_KUSDT_MARKET.id = computeMarketId(KBTC_KUSDT_PARAMS);

// Export all markets
export const KUB_TESTNET_MARKETS: MarketConfig[] = [
  KUSDT_KKUB_MARKET,
  KKUB_KUSDT_MARKET,
  KBTC_KUSDT_MARKET,
];

// Helper to find market by ID
export function getMarketById(id: `0x${string}`): MarketConfig | undefined {
  return KUB_TESTNET_MARKETS.find(m => m.id === id);
}

// Export market params for contract calls
export const MARKET_PARAMS = {
  KUSDT_KKUB: KUSDT_KKUB_PARAMS,
  KKUB_KUSDT: KKUB_KUSDT_PARAMS,
  KBTC_KUSDT: KBTC_KUSDT_PARAMS,
};