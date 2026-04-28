export interface TestnetTokenConfig {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  priceSource: string; // API symbol to fetch price for
  fallbackPrice: number; // Used when API doesn't have the price
  defaultMintAmount: string; // Raw amount string (e.g., "100" for 100 tokens)
  color: string; // Brand color for UI
  iconUrl: string; // Coin image URL
}

// KUB Chain Testnet tokens (chainId: 25925)
export const KUB_TESTNET_TOKENS: Record<string, TestnetTokenConfig> = {
  KKUB: {
    symbol: "KKUB",
    name: "KUB",
    address: "0x3eF520aA55f9d4C74479038C47F41B4037e2Ba6D",
    decimals: 18,
    priceSource: "KUB",
    fallbackPrice: 0.89,
    defaultMintAmount: "100",
    color: "#06C755",
    iconUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png",
  },
  KBTC: {
    symbol: "KBTC",
    name: "BTC",
    address: "0x4bea1aB3cC3D53Ca234cd5f73d3A0D1B13462Faa",
    decimals: 18,
    priceSource: "BTC",
    fallbackPrice: 75000,
    defaultMintAmount: "0.01",
    color: "#F7931A",
    iconUrl: "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400",
  },
  KUSDT: {
    symbol: "KUSDT",
    name: "USDT",
    address: "0xa263b2d40648e0AF6A0C11DCe40e9bc810C14cAE",
    decimals: 18,
    priceSource: "USDT",
    fallbackPrice: 1.0,
    defaultMintAmount: "100",
    color: "#26A17B",
    iconUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
  },
};

// Multi-chain testnet tokens config (for future chain support)
export const CHAIN_TESTNET_TOKENS: Record<number, Record<string, TestnetTokenConfig>> = {
  25925: KUB_TESTNET_TOKENS, // KUB Chain Testnet
};

export const getTestnetTokens = (chainId: number): TestnetTokenConfig[] => {
  const chainTokens = CHAIN_TESTNET_TOKENS[chainId];
  return chainTokens ? Object.values(chainTokens) : [];
};

export const getTestnetTokenBySymbol = (
  chainId: number,
  symbol: string
): TestnetTokenConfig | undefined => {
  const chainTokens = CHAIN_TESTNET_TOKENS[chainId];
  if (!chainTokens) return undefined;
  return Object.values(chainTokens).find((t) => t.symbol === symbol);
};