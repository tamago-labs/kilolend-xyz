"use client";

import styled from 'styled-components';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ContractMarket } from '@/stores/contractMarketStore';
import { formatUSD } from '@/utils/formatters';
import { useHistoricalPrices } from '@/hooks/useHistoricalPrices';
import { TimeRange } from '@/types/chart';

const ChartContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const ChartHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChartHeaderTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const TimeRangeButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const TimeButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  background: ${({ $active }) => $active ? '#06C755' : 'white'};
  color: ${({ $active }) => $active ? 'white' : '#64748b'};
  border: 1px solid ${({ $active }) => $active ? '#06C755' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: ${({ $active }) => $active ? '#059669' : '#f8fafc'};
  }
`;

const ChartContent = styled.div`
  padding: 24px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const ChartPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #64748b;
`;

const ChartIcon = styled.div`
  width: 64px;
  height: 64px;
  background: #f8fafc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const ChartText = styled.div`
  text-align: center;
`;

const ChartTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const ChartSubtitle = styled.div`
  font-size: 14px;
  color: #94a3b8;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 0 24px 24px;
`;

const StatCard = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
`;

const StatValue = styled.div<{ $positive?: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $positive }) => {
    if ($positive === true) return '#06C755'; // Green for positive
    if ($positive === false) return '#ef4444'; // Red for negative
    return '#1e293b'; // Default color for neutral/undefined
  }};
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #06C755;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 14px;
  text-align: center;
  padding: 16px;
`;

interface MarketChartV2Props {
  market: ContractMarket;
}

export const MarketChartV2 = ({ market }: MarketChartV2Props) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M'); // Default to 1M since we have 30d data

  const formatPercentage = (value: number) => {
    const isPositive = value >= 0;
    return {
      text: `${isPositive ? '+' : ''}${value.toFixed(2)}%`,
      isPositive,
    };
  };

  // Fetch historical prices
  const {
    data: chartData,
    isLoading,
    error,
    refetch,
    currentPrice: historicalCurrentPrice,
    priceChange,
    priceChangePercent,
    periodHigh,
    periodLow
  } = useHistoricalPrices({
    symbol: market.symbol,
    timeRange,
    enabled: !!market.symbol
  });

  // Fallback to market data if historical data is not available
  const currentPrice = historicalCurrentPrice || market.price || 0;
  const volume24h = market.volume24h || 0;

  const priceChangeFormatted = formatPercentage(priceChangePercent);

  // Helper function to format currency with N/A fallback
  const formatCurrencyWithNA = (value: number) => {
    if (value === 0 || !value) return 'N/A';
    return formatUSD(value);
  };

  // Helper function to format volume with N/A fallback
  const formatVolumeWithNA = (value: number) => {
    if (value === 0 || !value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ color: '#64748b', marginBottom: '4px' }}>
            {payload[0].payload.time}
          </div>
          <div style={{ fontWeight: '600', color: '#1e293b' }}>
            {formatUSD(payload[0].value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer>
      <ChartHeader>
        <ChartHeaderTitle>{market.symbol} Price Chart</ChartHeaderTitle>
        <TimeRangeButtons>
          {(['1D', '1W', '1M'] as const).map((range) => (
            <TimeButton
              key={range}
              $active={timeRange === range}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </TimeButton>
          ))}
        </TimeRangeButtons>
      </ChartHeader>

      <ChartContent>
        {error ? (
          <ErrorMessage>
            Failed to load price data: {error}
            <div style={{ marginTop: '8px' }}>
              <button 
                onClick={refetch}
                style={{
                  background: '#06C755',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </ErrorMessage>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                domain={['dataMin - 0.001', 'dataMax + 0.001']}
                tickFormatter={(value) => `$${value.toFixed(3)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#06C755" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#06C755' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartPlaceholder>
            <ChartIcon>📈</ChartIcon>
            <ChartText>
              <ChartTitle>Price Chart</ChartTitle>
              <ChartSubtitle>
                {isLoading ? 'Loading chart data...' : 'No chart data available'}
              </ChartSubtitle>
            </ChartText>
          </ChartPlaceholder>
        )}
        
        {isLoading && (
          <LoadingOverlay>
            <LoadingSpinner />
          </LoadingOverlay>
        )}
      </ChartContent>

      <StatsGrid>
        <StatCard>
          <StatLabel>Current Price</StatLabel>
          <StatValue>{formatCurrencyWithNA(currentPrice)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Period Change</StatLabel>
          <StatValue $positive={priceChangeFormatted.isPositive}>
            {priceChangeFormatted.text}
          </StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>24h Volume</StatLabel>
          <StatValue>
            {formatVolumeWithNA(volume24h)}
          </StatValue>
        </StatCard>
      </StatsGrid>
    </ChartContainer>
  );
};