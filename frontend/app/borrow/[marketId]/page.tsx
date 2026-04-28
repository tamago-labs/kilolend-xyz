"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import Link from "next/link";
import { formatUnits } from "viem";
import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { getMarketById, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI } from "@/config/abi";
import { BorrowActions } from "@/components/markets/BorrowActions";
import { BorrowMarketInfo } from "@/components/markets/BorrowMarketInfo";

export default function BorrowMarketDetailPage() {
  const params = useParams();
  const marketId = params.marketId as `0x${string}`;

  // Get market config
  const marketConfig = getMarketById(marketId);

  // Read market data from contract
  const { data: marketData, refetch: refetchMarketData } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "market",
    args: [marketId],
  });

  // Read market params
  const { data: marketParams } = useReadContract({
    address: MORPHO_ADDRESS,
    abi: MORPHO_ABI,
    functionName: "idToMarketParams",
    args: [marketId],
  });

  if (!marketConfig) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-[1200px] mx-auto px-8 py-16">
          <Link
            href="/borrow"
            className="flex items-center gap-2 text-[#64748b] hover:text-[#06C755] transition-colors mb-8"
          >
            ← Back to Borrow Markets
          </Link>
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-[#1e293b] mb-2">Market Not Found</h1>
            <p className="text-[#64748b]">The market you're looking for doesn't exist.</p>
          </div>
        </div>
      </main>
    );
  }

  const collateralToken = marketConfig.collateralToken;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* Page Header */}
      <PageHeader
        badge="Borrow"
        title={marketConfig.symbol}
        subtitle={`Borrow ${marketConfig.loanToken.symbol} using ${collateralToken.symbol} as collateral`}
      />

      {/* Back Button */}
      <div className="max-w-[1200px] mx-auto px-8 py-6">
        <Link
          href="/borrow"
          className="flex items-center gap-2 text-[#64748b] hover:text-[#06C755] transition-colors"
        >
          ← Back to Borrow Markets
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
                  ? `${parseFloat(formatUnits(BigInt(marketData.totalSupplyAssets.toString()), marketConfig.loanToken.decimals)).toFixed(2)} ${marketConfig.loanToken.symbol}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Total Borrow</p>
              <p className="text-xl font-bold text-[#1e293b]">
                {marketData
                  ? `${parseFloat(formatUnits(BigInt(marketData.totalBorrowAssets.toString()), marketConfig.loanToken.decimals)).toFixed(2)} ${marketConfig.loanToken.symbol}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Collateral</p>
              <div className="flex items-center gap-2">
                <Image
                  src={collateralToken.iconUrl}
                  alt={collateralToken.symbol}
                  width={24}
                  height={24}
                  className="object-contain"
                  unoptimized
                />
                <span className="text-xl font-bold text-[#1e293b]">{collateralToken.symbol}</span>
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
          <BorrowMarketInfo
            marketId={marketId}
            marketConfig={marketConfig}
          />

          {/* Borrow Actions - separated into two cards */}
          <div className="space-y-6">
            {/* Deposit / Withdraw Collateral Card */}
            <BorrowActions
              marketId={marketId}
              marketConfig={marketConfig}
              marketParams={marketParams}
              marketData={marketData}
              refetchMarketData={refetchMarketData}
              mode="collateral"
            />
            
            {/* Borrow / Repay Card */}
            <BorrowActions
              marketId={marketId}
              marketConfig={marketConfig}
              marketParams={marketParams}
              marketData={marketData}
              refetchMarketData={refetchMarketData}
              mode="borrow"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
