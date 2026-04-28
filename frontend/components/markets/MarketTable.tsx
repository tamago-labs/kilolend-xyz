"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KUB_TESTNET_MARKETS, getMarketById } from "@/config/markets";
import { KUB_TESTNET_TOKENS } from "@/config/tokens";
import { useMarketInfo } from "@/hooks/useMarketInfo";
import { usePriceContext } from "@/contexts/PriceContext";

interface MarketRowProps {
  marketId: `0x${string}`;
  mode: "supply" | "borrow";
}

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatPercentage(value: number): string {
  if (value <= 0) return "—";
  return `${value.toFixed(2)}%`;
}

// Loading skeleton for market row
const MarketRowSkeleton = () => (
  <div className="block bg-white rounded-xl p-5 border border-[#e2e8f0] animate-pulse">
    <div className="flex items-center justify-between">
      {/* Token Info */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#e2e8f0]" />
        <div>
          <div className="h-3 w-16 bg-[#e2e8f0] rounded mb-2" />
          <div className="h-5 w-12 bg-[#e2e8f0] rounded" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-3 w-16 bg-[#e2e8f0] rounded mb-2" />
            <div className="h-5 w-12 bg-[#e2e8f0] rounded" />
          </div>
        ))}
        <div className="text-center">
          <div className="h-3 w-16 bg-[#e2e8f0] rounded mb-2" />
          <div className="h-5 w-20 bg-[#e2e8f0] rounded" />
        </div>
      </div>

      {/* Action */}
      <div className="px-5 py-3 bg-[#e2e8f0] rounded-xl w-24" />
    </div>
  </div>
);

const MarketRow = ({ marketId, mode }: MarketRowProps) => {
  // Get market config
  const market = getMarketById(marketId);
  
  // Use shared market info hook
  const {
    marketData,
    loading,
    borrowAPY,
    supplyAPY,
    utilization,
  } = useMarketInfo(marketId);

  // Get real prices from price context
  const { actions: priceActions } = usePriceContext();

  if (!market) {
    return null;
  }

  // Show skeleton while loading
  if (loading) {
    return <MarketRowSkeleton />;
  }

  // Get real token price (with fallback)
  const price = priceActions.getPrice(market.loanToken.priceSource)?.price ?? market.loanToken.fallbackPrice;

  // Format amounts in token units
  const totalSupply = marketData ? Number(marketData.totalSupplyAssets) / Math.pow(10, market.loanToken.decimals) : 0;
  const totalBorrow = marketData ? Number(marketData.totalBorrowAssets) / Math.pow(10, market.loanToken.decimals) : 0;

  // Calculate USD values using real prices
  const suppliedUSD = totalSupply * price;
  const borrowedUSD = totalBorrow * price;

  const actionLabel = mode === "borrow" ? "Borrow" : "Supply";

  return (
    <Link
      href={mode === "borrow" ? `/borrow/${marketId}` : `/markets/${marketId}`}
      className="block bg-white rounded-xl p-5 border border-[#e2e8f0] hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center justify-between">
        {/* Token Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#f8fafc] flex items-center justify-center">
            <Image
              src={market.loanToken.iconUrl}
              alt={market.loanToken.symbol}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs text-[#64748b] mb-0.5">Loan Token</p>
            <h3 className="text-lg font-bold text-[#1e293b]">{market.loanToken.symbol}</h3>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">{mode === "borrow" ? "Borrow APY" : "Supply APY"}</p>
            <p className="text-base font-semibold text-[#06C755]">
              {formatPercentage(mode === "borrow" ? borrowAPY : supplyAPY)}
            </p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className="text-xs text-[#64748b] mb-1">Utilization</p>
            <div className="relative w-full h-5 bg-[#f1f5f9] rounded-full mt-1 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#06C755] rounded-full transition-all"
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white drop-shadow-sm">
                {formatPercentage(utilization)}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Supplied</p>
            <p className="text-base font-semibold text-[#1e293b]">
              {formatUSD(suppliedUSD)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Borrowed</p>
            <p className="text-base font-semibold text-[#1e293b]">
              {formatUSD(borrowedUSD)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Collateral</p>
            <div className="flex items-center justify-center gap-1">
              <Image
                src={market.collateralToken.iconUrl}
                alt={market.collateralToken.symbol}
                width={16}
                height={16}
                className="object-contain"
                unoptimized
              />
              <span className="text-base font-semibold text-[#1e293b]">
                {market.collateralToken.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 px-5 py-3 bg-[#06c755] text-white rounded-xl font-bold hover:bg-[#05b54e] hover:shadow-[0_4px_12px_rgba(6,199,85,0.3)] transition-all">
          {actionLabel}
          <ArrowRight size={18} />
        </div>
      </div>
    </Link>
  );
};

interface MarketTableProps {
  markets?: typeof KUB_TESTNET_MARKETS;
  mode?: "supply" | "borrow";
}

// Chain section header component with icon (no green background)
const ChainSectionHeader = ({ chainName, iconUrl }: { chainName: string; iconUrl: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] text-xs font-semibold rounded-full">
      <Image
        src={iconUrl}
        alt={chainName}
        width={16}
        height={16}
        className="rounded-full object-contain"
        unoptimized
      />
      {chainName}
    </div>
    <div className="flex-1 h-px bg-[#e2e8f0]" />
  </div>
);

export const MarketTable = ({ markets = KUB_TESTNET_MARKETS, mode = "supply" }: MarketTableProps) => {
  // Get KUB icon from tokens config
  const kubIconUrl = KUB_TESTNET_TOKENS.KKUB?.iconUrl || "https://s2.coinmarketcap.com/static/img/coins/64x64/16093.png";

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      {/* KUB Chain Section */}
      <ChainSectionHeader chainName="KUB Chain" iconUrl={kubIconUrl} />
      
      <div className="flex flex-col gap-4">
        {markets.map((market) => (
          market.id ? (
            <MarketRow key={market.id} marketId={market.id} mode={mode} />
          ) : null
        ))}
      </div>
    </div>
  );
};
