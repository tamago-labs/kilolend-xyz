"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { formatUnits } from "viem";
import { MarketConfig } from "@/config/markets";
import { useMarketInfo } from "@/hooks/useMarketInfo";

// Tooltip component
function Tooltip({ content }: { content: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#e2e8f0] text-[#64748b] hover:bg-[#d1d5db] transition-colors ml-1"
      >
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1e293b] text-white text-xs rounded-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]" />
        </div>
      )}
    </div>
  );
}

interface SupplyMarketInfoProps {
  marketId: `0x${string}`;
  marketConfig: MarketConfig;
}

export function SupplyMarketInfo({ marketId, marketConfig }: SupplyMarketInfoProps) {
  const { supplyAPY, borrowAPY, utilization, marketData, loading } = useMarketInfo(marketId);
  const loanToken = marketConfig.loanToken;

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      <h3 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center">
        Market Info
        <Tooltip content="Information about this lending market including APY, rates, and capacity." />
      </h3>

      <div className="space-y-4">
        {/* Supply APY */}
        <div className="flex items-center justify-between py-3 border-b border-[#e2e8f0]">
          <span className="text-[#64748b] flex items-center">
            Supply APY
            <Tooltip content="Annual Percentage Yield earned by supplying tokens to this market. Includes compounding interest." />
          </span>
          <span className="font-bold text-[#06C755]">
            {loading ? "..." : `${supplyAPY.toFixed(2)}%`}
          </span>
        </div>

        {/* Borrow APY */}
        <div className="flex items-center justify-between py-3 border-b border-[#e2e8f0]">
          <span className="text-[#64748b] flex items-center">
            Borrow APY
            <Tooltip content="Annual interest rate for borrowing this asset. You pay this rate when you have an outstanding loan." />
          </span>
          <span className="font-medium text-[#ef4444]">
            {loading ? "..." : `${borrowAPY.toFixed(2)}%`}
          </span>
        </div>

        {/* Utilization */}
        <div className="flex items-center justify-between py-3 border-b border-[#e2e8f0]">
          <span className="text-[#64748b] flex items-center">
            Utilization
            <Tooltip content="Percentage of supplied assets that are currently borrowed. Higher utilization typically means higher APY for suppliers." />
          </span>
          <span className="font-medium text-[#1e293b]">
            {loading ? "..." : `${utilization.toFixed(2)}%`}
          </span>
        </div>

        {/* Available Liquidity */}
        <div className="flex items-center justify-between py-3 border-b border-[#e2e8f0]">
          <span className="text-[#64748b] flex items-center">
            Available Liquidity
            <Tooltip content="Total amount of tokens available for withdrawal. Depends on borrowed amounts and supply balances." />
          </span>
          <span className="font-medium text-[#1e293b]">
            {loading || !marketData
              ? "..."
              : `${parseFloat(formatUnits(BigInt(marketData.totalSupplyAssets.toString()) - BigInt(marketData.totalBorrowAssets.toString()), loanToken.decimals)).toFixed(2)} ${loanToken.symbol}`}
          </span>
        </div>

        {/* Collateral */}
        <div className="flex items-center justify-between py-3">
          <span className="text-[#64748b] flex items-center">
            Collateral
            <Tooltip content="Asset accepted as collateral for borrowing against this market's loan token." />
          </span>
          <span className="font-medium text-[#1e293b]">
            {marketConfig.collateralToken.symbol}
          </span>
        </div>
      </div>
    </div>
  );
}
