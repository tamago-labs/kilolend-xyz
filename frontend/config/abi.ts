// Morpho ABI - focusing on view functions for reading market data

export const MORPHO_ABI = [
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "market",
    outputs: [
      {
        components: [
          { name: "totalSupplyAssets", type: "uint128" },
          { name: "totalSupplyShares", type: "uint128" },
          { name: "totalBorrowAssets", type: "uint128" },
          { name: "totalBorrowShares", type: "uint128" },
          { name: "lastUpdate", type: "uint128" },
          { name: "fee", type: "uint128" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "idToMarketParams",
    outputs: [
      {
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    name: "position",
    outputs: [
      {
        components: [
          { name: "supplyShares", type: "uint128" },
          { name: "borrowShares", type: "uint128" },
          { name: "collateral", type: "uint128" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Supply function (supply loan token)
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    name: "supply",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Withdraw function
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Supply collateral function
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    name: "supplyCollateral",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Withdraw collateral function
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    name: "withdrawCollateral",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Borrow function
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    name: "borrow",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Repay function
  {
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" },
        { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" },
        { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    name: "repay",
    outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// IRM ABI for borrow rate view 
export const IRM_ABI = [
  {
    name: "borrowRateView",
    type: "function",
    inputs: [
      { name: "", type: "tuple", internalType: "struct MarketParams", components: [
        { name: "loanToken", type: "address", internalType: "address" },
        { name: "collateralToken", type: "address", internalType: "address" },
        { name: "oracle", type: "address", internalType: "address" },
        { name: "irm", type: "address", internalType: "address" },
        { name: "lltv", type: "uint256", internalType: "uint256" },
      ]},
      { name: "market", type: "tuple", internalType: "struct Market", components: [
        { name: "totalSupplyAssets", type: "uint128", internalType: "uint128" },
        { name: "totalSupplyShares", type: "uint128", internalType: "uint128" },
        { name: "totalBorrowAssets", type: "uint128", internalType: "uint128" },
        { name: "totalBorrowShares", type: "uint128", internalType: "uint128" },
        { name: "lastUpdate", type: "uint128", internalType: "uint128" },
        { name: "fee", type: "uint128", internalType: "uint128" },
      ]},
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
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
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Mint function for testnet tokens
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
] as const;
