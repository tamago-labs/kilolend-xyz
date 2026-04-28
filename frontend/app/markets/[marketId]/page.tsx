"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import Link from "next/link";
import { formatUnits } from "viem";
import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { getMarketById, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI } from "@/config/abi";
import { SupplyActions } from "@/components/markets/SupplyActions";
import { SupplyMarketInfo } from "@/components/markets/SupplyMarketInfo";

export default function MarketPage() {
  const params = useParams();
  const marketId = params.marketId as `0x${string}`;
  const marketConfig = getMarketById(marketId as `0x${string}`);

  // Read market data from contract
  const { data: marketData, isLoading: isMarketLoading, refetch: refetchMarketData } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "market",
    args: [marketId as `0x${string}`],
  });

  // Read market params
  const { data: marketParams } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "idToMarketParams",
    args: [marketId as `0x${string}`],
  });

  if (!marketConfig) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-[1200px] mx-auto px-8 py-16">
          <Link
            href="/markets"
            className="flex items-center gap-2 text-[#64748b] hover:text-[#06C755] transition-colors mb-8"
          >
            ← Back to Markets
          </Link>
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-[#1e293b] mb-2">Market Not Found</h1>
            <p className="text-[#64748b]">The market you're looking for doesn't exist.</p>
          </div>
        </div>
      </main>
    );
  }

  const loanToken = marketConfig.loanToken;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* Page Header */}
      <PageHeader
        badge="KUB Chain"
        title={marketConfig.symbol}
        subtitle={`Supply ${marketConfig.loanToken.symbol} and earn interest`}
      />

      {/* Back Button */}
      <div className="max-w-[1200px] mx-auto px-8 py-6">
        <Link
          href="/markets"
          className="flex items-center gap-2 text-[#64748b] hover:text-[#06C755] transition-colors"
        >
          ← Back to Markets
        </Link>
      </div>

      {/* Market Stats */}
      <div className="max-w-[1200px] mx-auto px-8 pb-8">
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#64748b] mb-1">Total Supply</p>
              <p className="text-xl font-bold text-[#1e293b]">
                {marketData
                  ? `${parseFloat(formatUnits(BigInt(marketData.totalSupplyAssets.toString()), loanToken.decimals)).toFixed(2)} ${loanToken.symbol}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Total Borrow</p>
              <p className="text-xl font-bold text-[#1e293b]">
                {marketData
                  ? `${parseFloat(formatUnits(BigInt(marketData.totalBorrowAssets.toString()), loanToken.decimals)).toFixed(2)} ${loanToken.symbol}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Collateral</p>
              <div className="flex items-center gap-2">
                <Image
                  src={marketConfig.collateralToken.iconUrl}
                  alt={marketConfig.collateralToken.symbol}
                  width={24}
                  height={24}
                  className="object-contain"
                  unoptimized
                />
                <span className="text-xl font-bold text-[#1e293b]">{marketConfig.collateralToken.symbol}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">LLTV</p>
              <p className="text-xl font-bold text-[#1e293b]">
                {marketParams
                  ? `${Math.round(Number(formatUnits(BigInt(marketParams.lltv.toString()), 18)) * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions and Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Info */}
          <SupplyMarketInfo
            marketId={marketId as `0x${string}`}
            marketConfig={marketConfig}
          />

          {/* Supply Actions - Single component with tabs */}
          <SupplyActions
            marketId={marketId as `0x${string}`}
            marketConfig={marketConfig}
            marketParams={marketParams}
            marketData={marketData}
            refetchMarketData={refetchMarketData}
          />
        </div>
      </div>
    </main>
  );
}
