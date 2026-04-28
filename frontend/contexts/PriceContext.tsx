"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";

// Types
export interface TokenPrice {
  price: number;
  percentChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
  isFallback: boolean;
}

export interface PriceState {
  prices: Record<string, TokenPrice>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// Actions
type PriceAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PRICES"; payload: Record<string, TokenPrice> }
  | { type: "UPDATE_PRICE"; payload: { symbol: string; data: TokenPrice } };

// Initial state - initialize with fallback prices
const buildInitialPrices = (): Record<string, TokenPrice> => {
  const prices: Record<string, TokenPrice> = {};
  Object.entries(KUB_TESTNET_TOKENS).forEach(([key, token]) => {
    prices[token.priceSource] = {
      price: token.fallbackPrice,
      percentChange24h: 0,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: new Date().toISOString(),
      isFallback: true,
    };
  });
  return prices;
};

const initialState: PriceState = {
  prices: buildInitialPrices(),
  isLoading: false,
  error: null,
  lastUpdated: Date.now(),
};

// Reducer
function priceReducer(state: PriceState, action: PriceAction): PriceState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "SET_PRICES":
      return {
        ...state,
        prices: action.payload,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      };
    case "UPDATE_PRICE":
      return {
        ...state,
        prices: { ...state.prices, [action.payload.symbol]: action.payload.data },
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}

// API response type
interface ApiPriceData {
  symbol: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  last_updated: string;
}

const PRICE_API_URL =
  "https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod/prices";
const REFRESH_INTERVAL = 60_000; // 60 seconds

// Context
const PriceContext = createContext<{
  state: PriceState;
  actions: {
    refreshPrices: () => Promise<void>;
    getPrice: (symbol: string) => TokenPrice | undefined;
    getFormattedPrice: (symbol: string) => string;
    getFormattedChange: (symbol: string) => { text: string; isPositive: boolean };
  };
} | null>(null);

// Provider
export function PriceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(priceReducer, initialState);

  const fetchPrices = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await fetch(PRICE_API_URL);
      if (!response.ok) throw new Error("Failed to fetch prices");

      const json = await response.json();
      if (!json.success || !json.data) throw new Error("Invalid price data");

      // Build a lookup from API data
      const apiLookup: Record<string, ApiPriceData> = {};
      for (const item of json.data as ApiPriceData[]) {
        apiLookup[item.symbol.toUpperCase()] = item;
      }

      // Map to our tokens, using fallback when not found
      const newPrices: Record<string, TokenPrice> = {};
      Object.entries(KUB_TESTNET_TOKENS).forEach(([key, token]) => {
        const apiData = apiLookup[token.priceSource.toUpperCase()];
        if (apiData) {
          newPrices[token.priceSource] = {
            price: apiData.price,
            percentChange24h: apiData.percent_change_24h,
            marketCap: apiData.market_cap,
            volume24h: apiData.volume_24h,
            lastUpdated: apiData.last_updated,
            isFallback: false,
          };
        } else {
          // Keep fallback price
          newPrices[token.priceSource] = {
            ...state.prices[token.priceSource],
            isFallback: true,
          };
        }
      });

      dispatch({ type: "SET_PRICES", payload: newPrices });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [state.prices]);

  // Fetch on mount and set interval
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = {
    refreshPrices: fetchPrices,
    getPrice: (symbol: string): TokenPrice | undefined => {
      return state.prices[symbol];
    },
    getFormattedPrice: (symbol: string): string => {
      const priceData = state.prices[symbol];
      if (!priceData) return "$0.00";
      const price = priceData.price;
      if (price >= 1000) {
        return `$${price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      } else if (price >= 1) {
        return `$${price.toFixed(2)}`;
      } else {
        return `$${price.toFixed(4)}`;
      }
    },
    getFormattedChange: (
      symbol: string
    ): { text: string; isPositive: boolean } => {
      const priceData = state.prices[symbol];
      if (!priceData) return { text: "0.00%", isPositive: true };
      const change = priceData.percentChange24h;
      const isPositive = change >= 0;
      return { text: `${isPositive ? "+" : ""}${change.toFixed(2)}%`, isPositive };
    },
  };

  return (
    <PriceContext.Provider value={{ state, actions }}>
      {children}
    </PriceContext.Provider>
  );
}

// Hook
export function usePriceContext() {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error("usePriceContext must be used within a PriceProvider");
  }
  return context;
}