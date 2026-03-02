"use client";

import styled from 'styled-components';

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const StatCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  font-size: 12px;
  color: ${({ $positive }) => $positive ? '#06C755' : '#ef4444'};
  margin-top: 4px;
  font-weight: 500;
`;

interface DesktopSwapStatsProps {
  className?: string;
}

export const DesktopSwapStats = ({ className }: DesktopSwapStatsProps) => {
  // Mock data for now - these would come from real DEX data
  const totalVolume = 1250000; // $1.25M
  const activePools = 1; // KLAW/KKUB pool
  const supportedTokens = 1; // KLAW and KKUB
  const feeRate = 1.0; // 1% fee tier

  // Format currency values
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <StatsSection className={className}> 

     {/* <StatCard>
        <StatLabel>Active Pools</StatLabel>
        <StatValue>{activePools}</StatValue>
        <StatChange $positive={activePools > 0}>
          KLAW/KKUB pair
        </StatChange>
      </StatCard>*/}

      <StatCard>
        <StatLabel>Ecosystem Tokens</StatLabel>
        <StatValue>{supportedTokens}</StatValue>
        <StatChange $positive>
          AI-agent assets
        </StatChange>
      </StatCard>
      <StatCard>
        <StatLabel>Live Networks</StatLabel>
        <StatValue>KUB</StatValue>
        <StatChange $positive>
          Available for trading
        </StatChange>
      </StatCard>  
    </StatsSection>
  );
};