"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { KUB_TESTNET_MARKETS, getMarketById } from "@/config/markets";
import { useMarketInfo } from "@/hooks/useMarketInfo";
import { usePriceContext } from "@/contexts/PriceContext";
import { formatUnits } from "viem";

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function BorrowPositionRow({ marketId }: { marketId: `0x${string}` }) {
  const market = getMarketById(marketId);
  const { userBorrowAssets, borrowAPY, loading } = useMarketInfo(marketId);
  const { actions: priceActions } = usePriceContext();

  if (!market) return null;

  const borrowNum = Number(formatUnits(userBorrowAssets, market.loanToken.decimals));
  const price = priceActions.getPrice(market.loanToken.priceSource)?.price ?? market.loanToken.fallbackPrice;
  const usdValue = borrowNum * price;

  return (
    <Link
      href={`/borrow/${marketId}`}
      className="flex items-center justify-between py-4 border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc] -mx-4 px-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Image src={market.loanToken.iconUrl} alt={market.loanToken.symbol} width={40} height={40} className="rounded-full" unoptimized />
        <div>
          <p className="font-bold text-[#1e293b]">{market.loanToken.symbol}</p>
          <p className="text-xs text-[#64748b]">
            {loading ? "..." : `${borrowNum.toFixed(4)} borrowed`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-bold text-[#ef4444]">
            {loading ? "..." : `${borrowAPY.toFixed(2)}%`}
          </p>
          <p className="text-xs text-[#64748b]">APY</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-[#1e293b]">{formatUSD(usdValue)}</p>
          <p className="text-xs text-[#64748b]">Debt</p>
        </div>
        <ChevronRight size={20} className="text-[#64748b]" />
      </div>
    </Link>
  );
}

export function BorrowPositionsTab() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {KUB_TESTNET_MARKETS.map((market) =>
        market.id ? <BorrowPositionRow key={market.id} marketId={market.id} /> : null
      )}
    </div>
  );
}
