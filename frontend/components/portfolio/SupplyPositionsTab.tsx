"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { KUB_TESTNET_MARKETS, getMarketById } from "@/config/markets";
import { useMarketInfo } from "@/hooks/useMarketInfo";
import { formatUnits } from "viem";

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function SupplyPositionRow({ marketId }: { marketId: `0x${string}` }) {
  const market = getMarketById(marketId);
  const { marketData, userSupplyAssets, supplyAPY, loading } = useMarketInfo(marketId);

  if (!market) return null;

  const supplyNum = Number(formatUnits(userSupplyAssets, market.loanToken.decimals));
  const usdValue = supplyNum * market.loanToken.fallbackPrice;

  return (
    <Link
      href={`/markets/${marketId}`}
      className="flex items-center justify-between py-4 border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc] -mx-4 px-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Image src={market.loanToken.iconUrl} alt={market.loanToken.symbol} width={40} height={40} className="rounded-full" unoptimized />
        <div>
          <p className="font-bold text-[#1e293b]">{market.loanToken.symbol}</p>
          <p className="text-xs text-[#64748b]">
            {loading ? "..." : `${supplyNum.toFixed(4)} supplied`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-bold text-[#06C755]">
            {loading ? "..." : `${supplyAPY.toFixed(2)}%`}
          </p>
          <p className="text-xs text-[#64748b]">APY</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-[#1e293b]">{formatUSD(usdValue)}</p>
          <p className="text-xs text-[#64748b]">Value</p>
        </div>
        <ChevronRight size={20} className="text-[#64748b]" />
      </div>
    </Link>
  );
}

export function SupplyPositionsTab() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {KUB_TESTNET_MARKETS.map((market) =>
        market.id ? <SupplyPositionRow key={market.id} marketId={market.id} /> : null
      )}
    </div>
  );
}
