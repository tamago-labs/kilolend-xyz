"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatUnits } from "viem";
import Image from "next/image";
import { getMarketById, MORPHO_ADDRESS } from "@/config/markets";
import { MORPHO_ABI } from "@/config/abi";
import { BorrowActions } from "@/components/markets/BorrowActions";
import { MarketInfo } from "@/components/markets/MarketInfo";

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
            <ArrowLeft size={18} />
            Back to Borrow Markets
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
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        {/* Back Button */}
        <Link
          href="/borrow"
          className="flex items-center gap-2 text-[#64748b] hover:text-[#06C755] transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          Back to Borrow Markets
        </Link>

        {/* Market Header */}
        <div className="bg-white rounded-2xl p-8 border border-[#e2e8f0] mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#f8fafc] flex items-center justify-center">
              <Image
                src={marketConfig.loanToken.iconUrl}
                alt={marketConfig.symbol}
                width={48}
                height={48}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-[32px] font-bold text-[#1e293b]">{marketConfig.symbol}</h1>
              <p className="text-[#64748b]">{marketConfig.name}</p>
            </div>
          </div>

          {/* Market Stats from Contract */}
          <div className="grid grid-cols-4 gap-6">
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
          {/* Deposit/Borrow Actions */}
          <BorrowActions
            marketId={marketId}
            marketConfig={marketConfig}
            marketParams={marketParams}
            marketData={marketData}
            refetchMarketData={refetchMarketData}
          />

          {/* Market Info */}
          <MarketInfo
            marketId={marketId}
            marketConfig={marketConfig}
            marketData={marketData}
            marketParams={marketParams}
            refetchMarketData={refetchMarketData}
          />
        </div>
      </div>
    </main>
  );
}