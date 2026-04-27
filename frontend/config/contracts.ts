// ERC20Mock ABI - only the functions we need
export const ERC20_MOCK_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Deployed contract addresses on KUB Chain Testnet (chainId: 25925)
export const KUB_TESTNET_CONTRACTS = {
  morpho: "0xcb1819EBe048C9A778ffc095236Fa6Fcab4D22E8",
  kycRegistry: "0x262330f25Dedc9F9fab0649da0b11A9664E15Bdd",
  irmStablecoin: "0x529CfbBBFC078dcB745C7FBa2C20cb48f82D16A7",
  irmNonStablecoin: "0xBb66B622893958Ee7Fb9bc17B92E819b5096Fa57",
  tokens: {
    mockKKUB: "0x3eF520aA55f9d4C74479038C47F41B4037e2Ba6D",
    mockKBTC: "0x4bea1aB3cC3D53Ca234cd5f73d3A0D1B13462Faa",
    mockKUSDT: "0xa263b2d40648e0AF6A0C11DCe40e9bc810C14cAE",
  },
  oracles: {
    kusdtKkub: "0x5d03E2e40992194097989c4E73A31cb5a488d774",
    kkubKusdt: "0x98Ff3CA8a4be71dD2de3062B18e2041BdF935A5A",
    kbtcKusdt: "0x73CBbc445eec7d0B4dB68486Da71170103A8015c",
  },
} as const;