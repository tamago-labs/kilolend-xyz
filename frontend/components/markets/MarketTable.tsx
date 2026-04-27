"use client";

import { useReadContract } from "wagmi";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KUB_TESTNET_MARKETS, MORPHO_ADDRESS, getMarketById } from "@/config/markets";
import { MORPHO_ABI } from "@/config/abi";

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

const MarketRow = ({ marketId, mode }: MarketRowProps) => {
  // Get market config
  const market = getMarketById(marketId);
  
  // Read market data from contract
  const { data: marketData, isLoading: isMarketLoading } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "market",
    args: [marketId],
  });

  const isLoading = isMarketLoading;
  const hasData = marketData && Array.isArray(marketData);

  // Parse market data
  const totalSupply = hasData ? Number(marketData[0]) : 0;
  const totalBorrow = hasData ? Number(marketData[2]) : 0;
  const utilization = totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0;

  // Format amounts in token units
  const supplyNum = totalSupply / Math.pow(10, market?.loanToken.decimals || 18);
  const borrowNum = totalBorrow / Math.pow(10, market?.loanToken.decimals || 18);

  // Use placeholder USD values for now
  const suppliedUSD = supplyNum;
  const borrowedUSD = borrowNum;

  const actionLabel = mode === "borrow" ? "Borrow" : "Supply";

  if (!market) {
    return null;
  }

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
              alt={market.symbol}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs text-[#64748b] mb-0.5">Loan Token</p>
            <h3 className="text-lg font-bold text-[#1e293b]">{market.symbol}</h3>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">{mode === "borrow" ? "Borrow APY" : "Supply APY"}</p>
            <p className="text-base font-semibold text-[#06C755]">—</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Utilization</p>
            <p className="text-base font-semibold text-[#1e293b]">
              {isLoading ? "..." : formatPercentage(utilization)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Supplied</p>
            <p className="text-base font-semibold text-[#1e293b]">
              {isLoading ? "..." : formatUSD(suppliedUSD)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#64748b] mb-1">Borrowed</p>
            <p className="text-base font-semibold text-[#1e293b]">
              {isLoading ? "..." : formatUSD(borrowedUSD)}
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

export const MarketTable = ({ markets = KUB_TESTNET_MARKETS, mode = "supply" }: MarketTableProps) => {
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
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