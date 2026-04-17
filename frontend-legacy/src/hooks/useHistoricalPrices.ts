import { useState, useEffect } from 'react';
import { PRICE_API_CONFIG } from '@/utils/tokenConfig';
import { 
  HistoricalPriceResponse, 
  HistoricalPricePoint, 
  ChartDataPoint, 
  TimeRange, 
  UseHistoricalPricesOptions, 
  UseHistoricalPricesReturn 
} from '@/types/chart';

export const useHistoricalPrices = ({ 
  symbol, 
  timeRange = '1M',
  enabled = true 
}: UseHistoricalPricesOptions): UseHistoricalPricesReturn => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHistoricalEndpoint = (symbol: string): string => {
    return `${PRICE_API_CONFIG.endpoint}/${symbol}/history`;
  };

  const filterDataByTimeRange = (priceData: HistoricalPricePoint[], range: TimeRange): HistoricalPricePoint[] => {
    if (!priceData.length) return [];

    const now = new Date();
    const oldestTimestamp = new Date(priceData[priceData.length - 1].timestamp);
    
    switch (range) {
      case '1D':
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return priceData.filter(point => new Date(point.timestamp) >= oneDayAgo);
      
      case '1W':
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return priceData.filter(point => new Date(point.timestamp) >= oneWeekAgo);
      
      case '1M':
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return priceData.filter(point => new Date(point.timestamp) >= oneMonthAgo);
      
      case '1Y':
        // Since we only have 30 days of data, return all for 1Y
        return priceData;
      
      default:
        return priceData;
    }
  };

  const formatDataForChart = (priceData: HistoricalPricePoint[]): ChartDataPoint[] => {
    return priceData.map(point => ({
      time: new Date(point.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: priceData.length <= 24 ? '2-digit' : undefined
      }),
      price: point.price,
      timestamp: new Date(point.timestamp).getTime()
    })).reverse(); // Reverse to show chronological order
  };

  const calculatePriceStats = (chartData: ChartDataPoint[]) => {
    if (!chartData.length) {
      return {
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        periodHigh: 0,
        periodLow: 0
      };
    }

    const prices = chartData.map(d => d.price);
    const currentPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
    const periodHigh = Math.max(...prices);
    const periodLow = Math.min(...prices);

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      periodHigh,
      periodLow
    };
  };

  const fetchHistoricalData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(getHistoricalEndpoint(symbol));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData: HistoricalPriceResponse = await response.json();
      
      if (!apiData.success || !apiData.data || !apiData.data.prices) {
        throw new Error('Invalid API response format');
      }

      // Filter data by time range
      const filteredData = filterDataByTimeRange(apiData.data.prices, timeRange);
      
      // Format data for chart
      const chartData = formatDataForChart(filteredData);
      
      setData(chartData);
    } catch (err) {
      console.error('Error fetching historical prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch historical prices');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || !symbol) return;
    
    fetchHistoricalData();
  }, [symbol, timeRange, enabled]);

  const stats = calculatePriceStats(data);

  const refetch = async (): Promise<void> => {
    await fetchHistoricalData();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    ...stats
  };
};