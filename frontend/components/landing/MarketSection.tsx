"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { KUB_TESTNET_MARKETS, getMarketById } from "@/config/markets";
import { useMarketInfo } from "@/hooks/useMarketInfo";
import { usePriceContext } from "@/contexts/PriceContext";

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatPercentage(value: number): string {
  if (value <= 0) return "—";
  return `${value.toFixed(2)}%`;
}

interface MarketCardProps {
  marketId: `0x${string}`;
}

const MarketCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] animate-pulse">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-full bg-[#e2e8f0]" />
      <div>
        <div className="h-5 w-16 bg-[#e2e8f0] rounded mb-1" />
        <div className="h-4 w-24 bg-[#e2e8f0] rounded" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-3 w-16 bg-[#e2e8f0] rounded mb-1" />
          <div className="h-5 w-20 bg-[#e2e8f0] rounded" />
        </div>
      ))}
    </div>
    <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
      <div className="h-2 w-full bg-[#e2e8f0] rounded-full" />
    </div>
  </div>
);

const MarketCard = ({ marketId }: MarketCardProps) => {
  const market = getMarketById(marketId);
  const { marketData, loading, supplyAPY, borrowAPY, utilization } = useMarketInfo(marketId);
  const { actions: priceActions } = usePriceContext();

  if (!market) return null;

  // Get real price for USD calculation
  const price = priceActions.getPrice(market.loanToken.priceSource)?.price ?? market.loanToken.fallbackPrice;

  // Calculate USD values
  const totalSupply = marketData ? Number(marketData.totalSupplyAssets) / Math.pow(10, market.loanToken.decimals) : 0;
  const totalBorrow = marketData ? Number(marketData.totalBorrowAssets) / Math.pow(10, market.loanToken.decimals) : 0;
  const suppliedUSD = totalSupply * price;
  const borrowedUSD = totalBorrow * price;

  if (loading) {
    return <MarketCardSkeleton />;
  }

  return (
    <Link
      href={`/markets/${marketId}`}
      className="bg-white rounded-2xl p-6 border border-[#e2e8f0] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer block"
    >
      {/* Market Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center overflow-hidden">
          <Image
            src={market.loanToken.iconUrl}
            alt={market.loanToken.symbol}
            width={24}
            height={24}
            className="object-contain"
            unoptimized
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1e293b]">
            {market.loanToken.symbol}
          </h3>
          <p className="text-sm text-[#64748b]">{market.loanToken.name}</p>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#64748b] mb-1">Total Supply</p>
          <p className="text-base font-semibold text-[#1e293b]">
            {formatUSD(suppliedUSD)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64748b] mb-1">Total Borrow</p>
          <p className="text-base font-semibold text-[#1e293b]">
            {formatUSD(borrowedUSD)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64748b] mb-1">Supply APY</p>
          <p className="text-base font-semibold text-[#06C755]">
            {formatPercentage(supplyAPY)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64748b] mb-1">Borrow APR</p>
          <p className="text-base font-semibold text-[#ef4444]">
            {formatPercentage(borrowAPY)}
          </p>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
        <div className="flex justify-between text-xs text-[#64748b] mb-2">
          <span>Utilization</span>
          <span>{formatPercentage(utilization)}</span>
        </div>
        <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#06C755] rounded-full transition-all"
            style={{
              width: `${Math.min(utilization, 100)}%`,
            }}
          />
        </div>
      </div>
    </Link>
  );
};

export const MarketSection = () => {
  // Get first 3 markets for display
  const displayMarkets = KUB_TESTNET_MARKETS.slice(0, 3).filter(m => m.id);

  return (
    <section className="px-8 py-20 bg-[#f1f5f9]">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-bold text-[#1e293b] mb-4">
            Lending Markets
          </h2>
          <p className="text-[18px] text-[#475569] max-w-[600px] mx-auto">
            Supply assets to earn yield or borrow against your collateral.
            Agent-ready from day one.
          </p>
        </div>

        {/* Market Cards Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-8">
          {displayMarkets.map((market) => (
            market.id ? (
              <MarketCard key={market.id} marketId={market.id} />
            ) : null
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-[#06C755] font-semibold text-lg hover:gap-3 transition-all"
          >
            View All Markets
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
};
