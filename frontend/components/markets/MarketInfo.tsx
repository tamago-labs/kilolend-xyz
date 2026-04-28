"use client";

import Image from "next/image";
import { formatUnits } from "viem";
import { MarketConfig } from "@/config/markets";
import { useMarketInfo } from "@/hooks/useMarketInfo";

interface MarketInfoProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
  marketData?: {
    totalSupplyAssets: bigint;
    totalSupplyShares: bigint;
    totalBorrowAssets: bigint;
    totalBorrowShares: bigint;
    lastUpdate: bigint;
    fee: bigint;
  };
  marketParams?: {
    loanToken: `0x${string}`;
    collateralToken: `0x${string}`;
    oracle: `0x${string}`;
    irm: `0x${string}`;
    lltv: bigint;
  };
  refetchMarketData?: () => void;
}

export const MarketInfo = ({ marketId, marketConfig }: MarketInfoProps) => {
  const loanToken = marketConfig.loanToken;
  
  // Use shared market info hook
  const {
    marketData,
    marketParams,
    userSupplyAssets,
    userBorrowAssets,
    position,
    supplyAPY,
    borrowAPY,
    utilization,
    lltvPercent,
    loading,
  } = useMarketInfo(marketId);

  // Calculate total supply and borrow
  const totalSupply = marketData
    ? formatUnits(marketData.totalSupplyAssets, loanToken.decimals)
    : "0";
  const totalBorrow = marketData
    ? formatUnits(marketData.totalBorrowAssets, loanToken.decimals)
    : "0";
  
  // User's supply value
  const userSupply = formatUnits(userSupplyAssets, loanToken.decimals);

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      <h3 className="text-lg font-bold text-[#1e293b] mb-6">Position Details</h3>
      
      {/* User Position */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-[#64748b]">Your Supply</span>
          <span className="font-semibold text-[#1e293b]">
            {loading ? "..." : `${parseFloat(userSupply).toFixed(4)} ${loanToken.symbol}`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#64748b]">Supply APY</span>
          <span className="font-semibold text-[#06C755]">
            {loading ? "..." : `${supplyAPY.toFixed(2)}%`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#64748b]">Your Position Value</span>
          <span className="font-semibold text-[#06C755]">
            ${parseFloat(userSupply).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="border-t border-[#e2e8f0] pt-4">
        <h4 className="text-sm font-semibold text-[#64748b] mb-3">Market Stats</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Total Supply</span>
            <span className="font-medium text-[#1e293b]">{loading ? "..." : `${parseFloat(totalSupply).toFixed(2)} ${loanToken.symbol}`}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Total Borrow</span>
            <span className="font-medium text-[#1e293b]">{loading ? "..." : `${parseFloat(totalBorrow).toFixed(2)} ${loanToken.symbol}`}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Borrow APY</span>
            <span className="font-medium text-[#ef4444]">{loading ? "..." : `${borrowAPY.toFixed(2)}%`}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Utilization</span>
            <span className="font-medium text-[#1e293b]">{loading ? "..." : `${utilization.toFixed(2)}%`}</span>
          </div>
        </div>
      </div>

      {/* Market Info */}
      <div className="border-t border-[#e2e8f0] pt-4 mt-4">
        <h4 className="text-sm font-semibold text-[#64748b] mb-3">Market Info</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Loan Token</span>
            <div className="flex items-center gap-2">
              <Image
                src={loanToken.iconUrl}
                alt={loanToken.symbol}
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
              <span className="font-medium text-[#1e293b]">{loanToken.symbol}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">Collateral</span>
            <div className="flex items-center gap-2">
              <Image
                src={marketConfig.collateralToken.iconUrl}
                alt={marketConfig.collateralToken.symbol}
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
              <span className="font-medium text-[#1e293b]">{marketConfig.collateralToken.symbol}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">LLTV</span>
            <span className="font-medium text-[#1e293b]">
              {loading ? "..." : `${lltvPercent}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
