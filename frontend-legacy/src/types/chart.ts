export interface HistoricalPricePoint {
  timestamp: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  last_updated: string;
}

export interface HistoricalPriceResponse {
  success: boolean;
  data: {
    symbol: string;
    period: string;
    prices: HistoricalPricePoint[];
  };
  count: number;
}

export interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: number;
}

export type TimeRange = '1D' | '1W' | '1M' | '1Y';

export interface UseHistoricalPricesOptions {
  symbol: string;
  timeRange?: TimeRange;
  enabled?: boolean;
}

export interface UseHistoricalPricesReturn {
  data: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  periodHigh: number;
  periodLow: number;
}