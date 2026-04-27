"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { useReadContracts } from "wagmi";
import { ERC20_ABI } from "@/config/abi";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { formatUnits } from "viem";

// Types
export type MintStatus = "idle" | "pending" | "confirming" | "success" | "error";

export interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
}

export interface TokenState {
  balances: Record<string, TokenBalance>;
  mintStatuses: Record<string, MintStatus>;
  mintErrors: Record<string, string | null>;
  refetchKey: number; // Increment to trigger balance refetch
}

// Actions
type TokenAction =
  | { type: "SET_BALANCE"; payload: { symbol: string; balance: TokenBalance } }
  | { type: "SET_MINT_STATUS"; payload: { symbol: string; status: MintStatus } }
  | {
      type: "SET_MINT_ERROR";
      payload: { symbol: string; error: string | null };
    }
  | { type: "REFRESH_BALANCES" }
  | { type: "RESET_MINT_STATUS"; payload: { symbol: string } };

// Initial state
const initialState: TokenState = {
  balances: {},
  mintStatuses: {},
  mintErrors: {},
  refetchKey: 0,
};

// Initialize mint statuses
Object.keys(KUB_TESTNET_TOKENS).forEach((key) => {
  initialState.mintStatuses[key] = "idle";
  initialState.mintErrors[key] = null;
  initialState.balances[key] = { raw: BigInt(0), formatted: "0", decimals: 18 };
});

// Reducer
function tokenReducer(state: TokenState, action: TokenAction): TokenState {
  switch (action.type) {
    case "SET_BALANCE":
      return {
        ...state,
        balances: {
          ...state.balances,
          [action.payload.symbol]: action.payload.balance,
        },
      };
    case "SET_MINT_STATUS":
      return {
        ...state,
        mintStatuses: {
          ...state.mintStatuses,
          [action.payload.symbol]: action.payload.status,
        },
      };
    case "SET_MINT_ERROR":
      return {
        ...state,
        mintErrors: {
          ...state.mintErrors,
          [action.payload.symbol]: action.payload.error,
        },
      };
    case "REFRESH_BALANCES":
      return {
        ...state,
        refetchKey: state.refetchKey + 1,
      };
    case "RESET_MINT_STATUS":
      return {
        ...state,
        mintStatuses: {
          ...state.mintStatuses,
          [action.payload.symbol]: "idle",
        },
        mintErrors: {
          ...state.mintErrors,
          [action.payload.symbol]: null,
        },
      };
    default:
      return state;
  }
}

// Context
const TestnetTokenContext = createContext<{
  state: TokenState;
  actions: {
    setMintStatus: (symbol: string, status: MintStatus) => void;
    setMintError: (symbol: string, error: string | null) => void;
    refreshBalances: () => void;
    resetMintStatus: (symbol: string) => void;
    getBalance: (symbol: string) => TokenBalance | undefined;
    getMintStatus: (symbol: string) => MintStatus;
    getFormattedBalance: (symbol: string) => string;
  };
} | null>(null);

// Provider
export function TestnetTokenProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tokenReducer, initialState);
  const { address } = useAccount();

  // Read all token balances using multicall
  const tokenEntries = Object.entries(KUB_TESTNET_TOKENS);
  const contracts = tokenEntries.map(([, token]) => ({
    address: token.address,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [address ?? "0x0000000000000000000000000000000000000000"],
  }));

  const { data: balanceResults } = useReadContracts({
    contracts,
    query: {
      enabled: !!address,
      refetchInterval: 15_000, // Refetch every 15s
    },
  });

  // Update balances when results come in
  React.useEffect(() => {
    if (balanceResults) {
      tokenEntries.forEach(([key, token], index) => {
        const result = balanceResults[index];
        if (result.status === "success" && typeof result.result === "bigint") {
          const raw = result.result;
          const formatted = formatUnits(raw, token.decimals);
          dispatch({
            type: "SET_BALANCE",
            payload: {
              symbol: key,
              balance: { raw, formatted, decimals: token.decimals },
            },
          });
        }
      });
    }
  }, [balanceResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = {
    setMintStatus: (symbol: string, status: MintStatus) => {
      dispatch({ type: "SET_MINT_STATUS", payload: { symbol, status } });
    },
    setMintError: (symbol: string, error: string | null) => {
      dispatch({ type: "SET_MINT_ERROR", payload: { symbol, error } });
    },
    refreshBalances: () => {
      dispatch({ type: "REFRESH_BALANCES" });
    },
    resetMintStatus: (symbol: string) => {
      dispatch({ type: "RESET_MINT_STATUS", payload: { symbol } });
    },
    getBalance: (symbol: string): TokenBalance | undefined => {
      return state.balances[symbol];
    },
    getMintStatus: (symbol: string): MintStatus => {
      return state.mintStatuses[symbol] || "idle";
    },
    getFormattedBalance: (symbol: string): string => {
      const balance = state.balances[symbol];
      if (!balance) return "0";
      const num = parseFloat(balance.formatted);
      if (num === 0) return "0";
      if (num < 0.001) return "<0.001";
      if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
      if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
      return num.toFixed(num < 1 ? 4 : 2);
    },
  };

  return (
    <TestnetTokenContext.Provider value={{ state, actions }}>
      {children}
    </TestnetTokenContext.Provider>
  );
}

// Hook
export function useTestnetTokenContext() {
  const context = useContext(TestnetTokenContext);
  if (!context) {
    throw new Error(
      "useTestnetTokenContext must be used within a TestnetTokenProvider"
    );
  }
  return context;
}